import xml.etree.ElementTree as ET

try:
    from backend.seo_sitemap import CANONICAL_ORIGIN, SITEMAP_NAMESPACE, build_sitemap_xml
except ModuleNotFoundError:
    from seo_sitemap import CANONICAL_ORIGIN, SITEMAP_NAMESPACE, build_sitemap_xml


def _locations(xml):
    root = ET.fromstring(xml)
    return [node.text for node in root.findall(f'{{{SITEMAP_NAMESPACE}}}url/{{{SITEMAP_NAMESPACE}}}loc')]


def test_sitemap_contains_only_pages_backed_by_published_products():
    products = [
        {
            'id': 'product-1', 'name': 'BMW 3 Series', 'slug': 'bmw-3-series', 'published': True,
            'brand_id': 'brand-1', 'vehicle_model_id': 'model-1',
            'vehicle_generation_id': 'generation-1', 'category_id': 'category-1',
            'updated_at': '2026-10-01T12:00:00Z',
        },
        {'id': 'draft', 'name': 'Draft', 'published': False},
    ]
    brands = [{'id': 'brand-1', 'name': 'BMW', 'published': True}]
    categories = [
        {'id': 'category-1', 'name': 'Bodykit & Conversion'},
        {'id': 'empty-category', 'name': 'Empty Category'},
    ]
    models = [{'id': 'model-1', 'name': '3 Series'}]
    generations = [{'id': 'generation-1', 'model_id': 'model-1', 'year_range': 'G20 / G28'}]

    xml = build_sitemap_xml(products, brands, categories, models, generations)
    locations = _locations(xml)

    assert f'{CANONICAL_ORIGIN}/' in locations
    assert f'{CANONICAL_ORIGIN}/catalog' in locations
    assert f'{CANONICAL_ORIGIN}/products/bmw-3-series/product-1' in locations
    assert f'{CANONICAL_ORIGIN}/brands/bmw/brand-1' in locations
    assert f'{CANONICAL_ORIGIN}/vehicles/bmw/3-series/model-1' in locations
    assert f'{CANONICAL_ORIGIN}/vehicles/bmw/3-series/model-1/g20-g28/generation-1' in locations
    assert f'{CANONICAL_ORIGIN}/categories/bodykit-conversion/category-1' in locations
    assert not any('/products/draft/' in location for location in locations)
    assert not any('empty-category' in location for location in locations)


def test_duplicate_product_slugs_remain_unique_and_names_are_xml_escaped():
    products = [
        {'id': 'one', 'name': 'Front & Rear Kit', 'slug': 'same-slug'},
        {'id': 'two', 'name': 'Front & Rear Kit', 'slug': 'same-slug'},
    ]

    xml = build_sitemap_xml(products, [], [], [], [])
    locations = _locations(xml)

    assert f'{CANONICAL_ORIGIN}/products/same-slug/one' in locations
    assert f'{CANONICAL_ORIGIN}/products/same-slug/two' in locations
    assert len(locations) == len(set(locations))
    ET.fromstring(xml)
