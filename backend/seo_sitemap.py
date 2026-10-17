"""Build a canonical sitemap from the published catalog documents."""

from datetime import date, datetime, timezone
from urllib.parse import quote, unquote, urljoin, urlsplit, urlunsplit
import unicodedata
import re
import xml.etree.ElementTree as ET


CANONICAL_ORIGIN = 'https://www.garageboy.id'
SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9'
ET.register_namespace('', SITEMAP_NAMESPACE)


def _slug(value):
    value = unicodedata.normalize('NFKD', str(value or '').strip().lower())
    value = ''.join(character for character in value if not unicodedata.combining(character))
    return re.sub(r'[^a-z0-9]+', '-', value).strip('-') or 'item'


def _id(value):
    return quote(str(value or ''), safe='')


def _date_value(value):
    if isinstance(value, datetime):
        current = value
    elif isinstance(value, date):
        current = datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    elif isinstance(value, str) and value.strip():
        try:
            current = datetime.fromisoformat(value.strip().replace('Z', '+00:00'))
        except ValueError:
            return None
    else:
        return None
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return current.astimezone(timezone.utc).date().isoformat()


def _lastmod(document):
    return _date_value(document.get('updated_at')) or _date_value(document.get('created_at'))


def canonical_sitemap_url(value):
    """Normalize a sitemap location without ever prefixing an absolute URL."""
    candidate = str(value or '').strip()
    if not candidate:
        return None

    origin = urlsplit(CANONICAL_ORIGIN)
    parsed = urlsplit(candidate)
    if parsed.scheme or parsed.netloc:
        if parsed.scheme and parsed.scheme.lower() not in ('http', 'https'):
            return None
        if parsed.hostname != origin.hostname or parsed.username or parsed.password:
            return None
        path = parsed.path or '/'
    else:
        parsed = urlsplit(urljoin(f'{CANONICAL_ORIGIN}/', candidate))
        if parsed.hostname != origin.hostname:
            return None
        path = parsed.path or '/'

    # Reject already-corrupted paths such as /https://www.garageboy.id/brands/...
    decoded_path = unquote(path)
    if re.search(r'https?://', decoded_path, re.IGNORECASE):
        return None
    if origin.netloc.lower() in decoded_path.lower():
        return None

    normalized = urlsplit(urljoin(f'{CANONICAL_ORIGIN}/', path))
    if normalized.hostname != origin.hostname:
        return None
    normalized_path = quote(normalized.path or '/', safe="/%:@!$&'()*+,;=-._~")
    return urlunsplit((origin.scheme, origin.netloc, normalized_path, '', ''))


def build_sitemap_xml(products, brands, categories, models, generations):
    """Return XML for public pages backed by at least one published product."""
    products = [row for row in products if row and row.get('id') and row.get('published') is not False]
    brand_by_id = {str(row.get('id')): row for row in brands if row and row.get('id') and row.get('published') is not False}
    category_by_id = {str(row.get('id')): row for row in categories if row and row.get('id') and row.get('published') is not False}
    model_by_id = {str(row.get('id')): row for row in models if row and row.get('id') and row.get('published') is not False}
    generation_by_id = {str(row.get('id')): row for row in generations if row and row.get('id') and row.get('published') is not False}

    urls = {}

    def add(location, modified=None):
        normalized = canonical_sitemap_url(location)
        if not normalized:
            return
        previous = urls.get(normalized)
        if previous is None or (modified and (not previous or modified > previous)):
            urls[normalized] = modified

    add('/')
    add('/catalog', max((_lastmod(product) or '' for product in products), default='') or None)

    for product in products:
        product_id = str(product['id'])
        product_slug = _slug(product.get('slug') or product.get('name'))
        modified = _lastmod(product)
        add(f'/products/{product_slug}/{_id(product_id)}', modified)

        brand_id = str(product.get('brand_id') or '')
        brand = brand_by_id.get(brand_id)
        if brand:
            brand_slug = _slug(brand.get('slug') or brand.get('name'))
            add(f'/brands/{brand_slug}/{_id(brand_id)}', modified)

        model_id = str(product.get('vehicle_model_id') or '')
        model = model_by_id.get(model_id)
        if model and brand:
            model_slug = _slug(model.get('name'))
            add(f'/vehicles/{brand_slug}/{model_slug}/{_id(model_id)}', modified)

            generation_id = str(product.get('vehicle_generation_id') or '')
            generation = generation_by_id.get(generation_id)
            if generation and str(generation.get('model_id') or model_id) == model_id:
                generation_slug = _slug(generation.get('year_range') or generation.get('name'))
                add(
                    f'/vehicles/{brand_slug}/{model_slug}/{_id(model_id)}/{generation_slug}/{_id(generation_id)}',
                    modified,
                )

        category_id = str(product.get('category_id') or '')
        category = category_by_id.get(category_id)
        if category:
            category_slug = _slug(category.get('name'))
            add(f'/categories/{category_slug}/{_id(category_id)}', modified)

    root = ET.Element(f'{{{SITEMAP_NAMESPACE}}}urlset')
    for location, modified in sorted(urls.items()):
        url_node = ET.SubElement(root, f'{{{SITEMAP_NAMESPACE}}}url')
        ET.SubElement(url_node, f'{{{SITEMAP_NAMESPACE}}}loc').text = location
        if modified:
            ET.SubElement(url_node, f'{{{SITEMAP_NAMESPACE}}}lastmod').text = modified
    ET.indent(root, space='  ')
    return ET.tostring(root, encoding='utf-8', xml_declaration=True).decode('utf-8')
