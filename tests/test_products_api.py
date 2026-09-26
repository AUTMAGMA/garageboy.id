import asyncio
import json

from bson import ObjectId
import pytest

from backend import server
from backend.seed_products import load_products


class FakeCursor:
    def __init__(self, documents):
        self.documents = documents

    async def to_list(self, length=None):
        return self.documents[:length]


class FakeProductsCollection:
    def __init__(self, documents):
        self.documents = documents
        self.last_query = None

    def find(self, query):
        assert query == {'published': {'$ne': False}}
        return FakeCursor([document for document in self.documents if document.get('published') is not False])

    async def find_one(self, query):
        self.last_query = query
        alternatives = query.get('$or', [query])
        for document in self.documents:
            for condition in alternatives:
                if all(document.get(key) == value for key, value in condition.items()):
                    return document
        return None


class FakeDatabase:
    def __init__(self, documents):
        self.products = FakeProductsCollection(documents)


def asgi_get(path):
    async def run_request():
        events = []
        received = False

        async def receive():
            nonlocal received
            if not received:
                received = True
                return {'type': 'http.request', 'body': b'', 'more_body': False}
            return {'type': 'http.disconnect'}

        async def send(event):
            events.append(event)

        encoded_path = path.encode('ascii')
        scope = {
            'type': 'http',
            'asgi': {'version': '3.0', 'spec_version': '2.3'},
            'http_version': '1.1',
            'method': 'GET',
            'scheme': 'http',
            'path': path,
            'raw_path': encoded_path,
            'query_string': b'',
            'root_path': '',
            'headers': [],
            'client': ('test', 123),
            'server': ('test', 80),
        }
        await server.app(scope, receive, send)
        response = next(event for event in events if event['type'] == 'http.response.start')
        body = b''.join(event.get('body', b'') for event in events if event['type'] == 'http.response.body')
        return response['status'], json.loads(body)

    return asyncio.run(run_request())


def test_product_routes_are_registered():
    routes = {
        (route.path, method)
        for route in server.app.routes
        for method in getattr(route, 'methods', set())
    }
    assert ('/api/products', 'GET') in routes
    assert ('/api/products/{product_id}', 'GET') in routes


def test_get_products_returns_existing_fields_and_string_ids(monkeypatch):
    product_id = ObjectId()
    monkeypatch.setattr(server, 'db', FakeDatabase([
        {'_id': product_id, 'id': 'bmw-3', 'brand': 'bmw', 'name': 'BMW 3 Kit', 'img': '/catalog/bmw.jpg', 'sheets': []},
        {'_id': ObjectId(), 'name': 'Legacy product', 'img': 'https://example.test/car.jpg'},
    ]))

    status, body = asgi_get('/api/products')

    assert status == 200
    assert body['total_products'] == 2
    assert body['data'][0] == {
        'id': 'bmw-3', 'brand': 'bmw', 'name': 'BMW 3 Kit', 'img': '/catalog/bmw.jpg', 'sheets': [], 'desc': ''
    }
    assert body['data'][1]['id']
    assert body['data'][1]['desc'] == ''
    assert '_id' not in body['data'][0]


def test_get_product_by_existing_id(monkeypatch):
    product = {'_id': ObjectId(), 'id': 'benz-g', 'brand': 'benz', 'name': 'G Class Kit'}
    monkeypatch.setattr(server, 'db', FakeDatabase([product]))

    status, body = asgi_get('/api/products/benz-g')

    assert status == 200
    assert body == {'id': 'benz-g', 'brand': 'benz', 'name': 'G Class Kit', 'desc': ''}


def test_get_product_by_mongodb_id_for_legacy_document(monkeypatch):
    mongo_id = ObjectId()
    product = {'_id': mongo_id, 'name': 'Legacy product'}
    monkeypatch.setattr(server, 'db', FakeDatabase([product]))

    status, body = asgi_get(f'/api/products/{mongo_id}')

    assert status == 200
    assert body == {'id': str(mongo_id), 'name': 'Legacy product', 'desc': ''}


def test_get_missing_product_returns_404(monkeypatch):
    monkeypatch.setattr(server, 'db', FakeDatabase([]))

    status, body = asgi_get('/api/products/not-found')

    assert status == 404
    assert body['detail'] == 'Product not found'


def test_products_endpoint_reports_missing_mongodb_configuration(monkeypatch):
    monkeypatch.setattr(server, 'db', None)

    status, body = asgi_get('/api/products')

    assert status == 503
    assert 'MONGODB_URI' in body['detail']


def test_seed_loader_accepts_existing_product_list(tmp_path):
    source = tmp_path / 'products.json'
    source.write_text(json.dumps({'data': [{'id': 'bmw-3', 'name': 'BMW Kit', 'img': '/catalog/bmw.jpg'}]}))

    products = load_products(source)

    assert products == [{'id': 'bmw-3', 'name': 'BMW Kit', 'img': '/catalog/bmw.jpg'}]


def test_seed_loader_rejects_duplicate_ids(tmp_path):
    source = tmp_path / 'products.json'
    source.write_text(json.dumps([{'id': 'same'}, {'id': 'same'}]))

    with pytest.raises(ValueError, match='Duplicate product id'):
        load_products(source)
