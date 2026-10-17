import xml.etree.ElementTree as ET
from datetime import date
import re
from urllib.parse import urlsplit

try:
    from backend.seo_sitemap import (
        CANONICAL_ORIGIN,
        SITEMAP_NAMESPACE,
        build_sitemap_xml,
        canonical_sitemap_url,
    )
except ModuleNotFoundError:
    from seo_sitemap import CANONICAL_ORIGIN, SITEMAP_NAMESPACE, build_sitemap_xml, canonical_sitemap_url


def _parse_sitemap(xml):
    assert xml.startswith('<?xml version=')
    assert '\n  <url>' in xml
    assert '\n    <loc>' in xml
    root = ET.fromstring(xml)
    assert root.tag == f'{{{SITEMAP_NAMESPACE}}}urlset'

    entries = root.findall(f'{{{SITEMAP_NAMESPACE}}}url')
    locations = []
    for entry in entries:
        loc_nodes = entry.findall(f'{{{SITEMAP_NAMESPACE}}}loc')
        assert len(loc_nodes) == 1
        assert loc_nodes[0].text
        locations.append(loc_nodes[0].text)

        lastmod_nodes = entry.findall(f'{{{SITEMAP_NAMESPACE}}}lastmod')
        assert len(lastmod_nodes) <= 1
        if lastmod_nodes:
            assert date.fromisoformat(lastmod_nodes[0].text)
        assert all(child.tag in {
            f'{{{SITEMAP_NAMESPACE}}}loc',
            f'{{{SITEMAP_NAMESPACE}}}lastmod',
        } for child in entry)

    assert locations
    assert len(locations) == len(set(locations))
    for location in locations:
        parsed = urlsplit(location)
        assert parsed.scheme == 'https'
        assert parsed.netloc == 'www.garageboy.id'
        assert parsed.path.startswith('/')
        assert location.count(CANONICAL_ORIGIN) == 1
        assert not re.search(r'/https?://', parsed.path, re.IGNORECASE)
        assert '/admin' not in parsed.path.lower()
        assert '/api/' not in parsed.path.lower()
    return root, entries, locations


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
    _, _, locations = _parse_sitemap(xml)

    assert f'{CANONICAL_ORIGIN}/' in locations
    assert f'{CANONICAL_ORIGIN}/catalog' in locations
    assert f'{CANONICAL_ORIGIN}/products/bmw-3-series/product-1' in locations
    assert f'{CANONICAL_ORIGIN}/brands/bmw/brand-1' in locations
    assert f'{CANONICAL_ORIGIN}/vehicles/bmw/3-series/model-1' in locations
    assert f'{CANONICAL_ORIGIN}/vehicles/bmw/3-series/model-1/g20-g28/generation-1' in locations
    assert f'{CANONICAL_ORIGIN}/categories/bodykit-conversion/category-1' in locations
    assert not any('/products/draft/' in location for location in locations)
    assert not any('empty-category' in location for location in locations)


def test_sitemap_xml_has_one_entry_per_canonical_url_and_skips_invalid_dates():
    products = [
        {
            'id': 'one&1', 'name': 'Front & Rear Kit', 'slug': 'same-slug',
            'updated_at': 'not-a-date', 'created_at': '2026-10-01T12:00:00Z',
        },
        {
            'id': 'two', 'name': 'Front & Rear Kit', 'slug': 'same-slug',
            'updated_at': 'not-a-date',
        },
        {
            'id': 'one&1', 'name': 'Front & Rear Kit', 'slug': 'same-slug',
            'updated_at': '2026-10-02',
        },
    ]

    xml = build_sitemap_xml(products, [], [], [], [])
    _, entries, locations = _parse_sitemap(xml)

    assert f'{CANONICAL_ORIGIN}/products/same-slug/one%261' in locations
    assert f'{CANONICAL_ORIGIN}/products/same-slug/two' in locations
    assert len(locations) == len(set(locations))
    assert xml.startswith('<?xml version=')
    by_location = {
        entry.findtext(f'{{{SITEMAP_NAMESPACE}}}loc'): entry
        for entry in entries
    }
    assert by_location[f'{CANONICAL_ORIGIN}/products/same-slug/one%261'].findtext(
        f'{{{SITEMAP_NAMESPACE}}}lastmod'
    ) == '2026-10-02'
    assert by_location[f'{CANONICAL_ORIGIN}/products/same-slug/two'].find(
        f'{{{SITEMAP_NAMESPACE}}}lastmod'
    ) is None


def test_absolute_and_relative_locations_normalize_without_repeating_the_domain():
    relative = '/brands/bmw/brand-id'
    absolute = f'{CANONICAL_ORIGIN}{relative}'

    assert canonical_sitemap_url(relative) == absolute
    assert canonical_sitemap_url(absolute) == absolute
    assert canonical_sitemap_url(f'{CANONICAL_ORIGIN}/{absolute}') is None
    assert canonical_sitemap_url('https://example.com/brands/bmw/brand-id') is None
    assert canonical_sitemap_url('') is None


def test_sitemap_builder_rejects_unpublished_relations_and_keeps_only_populated_categories():
    products = [{
        'id': 'p1', 'name': 'Part', 'brand_id': 'b1', 'vehicle_model_id': 'm1',
        'vehicle_generation_id': 'g1', 'category_id': 'c1', 'published': True,
    }]
    brands = [{'id': 'b1', 'name': 'Brand', 'published': True}]
    models = [{'id': 'm1', 'name': 'Model', 'published': True}]
    generations = [{'id': 'g1', 'model_id': 'm1', 'name': 'Generation', 'published': False}]
    categories = [
        {'id': 'c1', 'name': 'Category', 'published': True},
        {'id': 'empty', 'name': 'Empty'},
        {'id': 'hidden', 'name': 'Hidden', 'published': False},
    ]

    _, _, locations = _parse_sitemap(build_sitemap_xml(products, brands, categories, models, generations))

    assert f'{CANONICAL_ORIGIN}/products/part/p1' in locations
    assert f'{CANONICAL_ORIGIN}/categories/category/c1' in locations
    assert f'{CANONICAL_ORIGIN}/vehicles/brand/model/m1' in locations
    assert not any('/generation/' in location for location in locations)
    assert not any('/categories/empty/' in location or '/categories/hidden/' in location for location in locations)
