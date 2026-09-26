"""Import a JSON export of existing Garageboy products into MongoDB without deleting data."""

import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


def load_products(path):
    with Path(path).open(encoding='utf-8') as source:
        payload = json.load(source)

    if isinstance(payload, dict):
        payload = payload.get('data', payload.get('products'))
    if not isinstance(payload, list):
        raise ValueError('JSON must contain a product list, or an object with a data/products list')

    products = []
    seen_ids = set()
    for index, value in enumerate(payload):
        if not isinstance(value, dict):
            raise ValueError(f'Product at index {index} must be an object')

        product = dict(value)
        mongo_id = product.pop('_id', None)
        if not product.get('id') and mongo_id is not None:
            product['id'] = str(mongo_id)
        product_id = product.get('id')
        if not isinstance(product_id, str) or not product_id.strip():
            raise ValueError(f'Product at index {index} must have a non-empty string id')
        if product_id in seen_ids:
            raise ValueError(f'Duplicate product id in import file: {product_id}')

        seen_ids.add(product_id)
        products.append(product)

    return products


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file', required=True, help='JSON file exported from garageboy_products')
    args = parser.parse_args()

    mongo_uri = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URL')
    db_name = os.environ.get('MONGODB_DB') or os.environ.get('DB_NAME', 'garageboy')
    if not mongo_uri:
        parser.error('Set MONGODB_URI in backend/.env or the environment before importing')

    products = load_products(args.file)
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        collection = client[db_name]['products']
        inserted = 0
        updated = 0
        for product in products:
            result = collection.update_one({'id': product['id']}, {'$set': product}, upsert=True)
            inserted += int(result.upserted_id is not None)
            updated += int(result.modified_count > 0)
        print(f'Imported {len(products)} products into {db_name}.products ({inserted} inserted, {updated} updated).')
    finally:
        client.close()


if __name__ == '__main__':
    main()
