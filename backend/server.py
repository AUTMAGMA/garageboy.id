from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, status, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
import bcrypt
import jwt
import re
from datetime import datetime, timezone, timedelta
import os
import logging
from pathlib import Path
import uuid
import io
import warnings
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from PIL import Image, ImageOps, UnidentifiedImageError
from PIL.Image import DecompressionBombError
from defusedxml import ElementTree as SafeET
from xml.etree import ElementTree as ET
from starlette.concurrency import run_in_threadpool


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB configuration. Keep the old names as aliases for existing deployments.
mongo_url = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URL')
db_name = os.environ.get('MONGODB_DB') or os.environ.get('DB_NAME', 'garageboy')
client = AsyncIOMotorClient(mongo_url) if mongo_url else None
db = client[db_name] if client else None


def get_database():
    if db is None:
        raise HTTPException(
            status_code=503,
            detail='MongoDB is not configured. Set MONGODB_URI and MONGODB_DB.',
        )
    return db


def serialize_product(document):
    """Keep Mongo fields intact and add the legacy view fields consumed by the UI."""
    product = dict(document)
    mongo_id = product.pop('_id', None)
    if not product.get('id') and mongo_id is not None:
        product['id'] = str(mongo_id)
    images = product.get('images') or []
    ordered_images = sorted(images, key=lambda image: image.get('sort_order', 0))
    urls = [image.get('url') for image in ordered_images if image.get('url')]
    if urls:
        product['img'] = urls[0]
        product['sheets'] = urls[1:]
    product['desc'] = product.get('description') or ''
    return product


async def serialize_products_with_labels(database, documents):
    """Attach labels from the existing relational collections when references resolve."""
    products = [serialize_product(document) for document in documents]

    async def lookup(collection_name, ids):
        ids = {value for value in ids if value is not None}
        if not ids:
            return {}
        rows = await database[collection_name].find(
            {'id': {'$in': list(ids)}}, {'_id': 0, 'id': 1, 'name': 1, 'slug': 1, 'year_range': 1}
        ).to_list(length=None)
        return {row['id']: row for row in rows}

    brands = await lookup('brands', (p.get('brand_id') for p in products))
    models = await lookup('vehicle_models', (p.get('vehicle_model_id') for p in products))
    generations = await lookup('vehicle_generations', (p.get('vehicle_generation_id') for p in products))
    categories = await lookup('product_categories', (p.get('category_id') for p in products))

    for product in products:
        brand = brands.get(product.get('brand_id'))
        model = models.get(product.get('vehicle_model_id'))
        generation = generations.get(product.get('vehicle_generation_id'))
        category = categories.get(product.get('category_id'))
        if brand and brand.get('name'):
            product['brandLabel'] = brand['name']
        if brand and brand.get('slug'):
            product['brandSlug'] = brand['slug']
        if model and model.get('name'):
            product['seriesLabel'] = model['name']
        if generation:
            generation_label = generation.get('year_range') or generation.get('name')
            if generation_label:
                product['modelLabel'] = generation_label
        if category and category.get('name'):
            product['modLabel'] = category['name']
    return products


def utc_now():
    return datetime.now(timezone.utc)


def slugify(value):
    slug = re.sub(r'[^a-z0-9]+', '-', value.strip().lower()).strip('-')
    if not slug:
        raise HTTPException(status_code=422, detail='A name must produce a valid slug')
    return slug


def doc_by_id(collection, document_id):
    query = {'id': document_id}
    if ObjectId.is_valid(document_id):
        query = {'$or': [{'id': document_id}, {'_id': ObjectId(document_id)}]}
    return query


def serialize_document(document):
    if not document:
        return None
    result = dict(document)
    object_id = result.pop('_id', None)
    if not result.get('id') and object_id is not None:
        result['id'] = str(object_id)
    if isinstance(result.get('created_at'), datetime):
        result['created_at'] = result['created_at'].isoformat()
    if isinstance(result.get('updated_at'), datetime):
        result['updated_at'] = result['updated_at'].isoformat()
    return result


def get_jwt_secret():
    secret = os.environ.get('JWT_SECRET')
    if not secret:
        raise HTTPException(status_code=503, detail='Admin authentication is not configured')
    return secret


async def require_admin(authorization: str = Header(default='')):
    scheme, _, token = authorization.partition(' ')
    if scheme.lower() != 'bearer' or not token:
        raise HTTPException(status_code=401, detail='Admin authentication required')
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=['HS256'])
        admin_id = payload.get('sub')
    except (jwt.PyJWTError, HTTPException) as exc:
        raise HTTPException(status_code=401, detail='Invalid or expired admin token') from exc
    admin = await get_database().admins.find_one({'id': admin_id}, {'_id': 0, 'password_hash': 0})
    if not admin:
        raise HTTPException(status_code=401, detail='Admin account is unavailable')
    if admin.get('role') not in ('admin', 'superadmin', 'super_admin'):
        raise HTTPException(status_code=403, detail='Administrator role required')
    return admin


class AdminLogin(BaseModel):
    email: str
    password: str


class ImageInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: Optional[str] = None
    url: str
    thumb: Optional[str] = None
    alt_text: Optional[str] = None
    sort_order: int = 0


class ProductInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=240)
    brand_id: str
    vehicle_model_id: str
    vehicle_generation_id: str
    category_id: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    material: Optional[str] = None
    compatibility_notes: Optional[str] = None
    ordering_status: Optional[str] = None
    featured: bool = False
    published: bool = True
    catalog_page: Optional[int] = None
    images: List[ImageInput] = Field(default_factory=list)


class BrandInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=120)
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    country: Optional[str] = None
    sort_order: int = 0
    published: bool = True


class CategoryInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=120)
    name_id: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0


class HotBrandInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    brand_id: str
    logo_url: Optional[str] = None
    sort_order: int = 0
    published: bool = True
    logo_fit: Literal['contain', 'cover'] = 'contain'
    logo_scale: int = Field(default=100, ge=50, le=200)
    logo_position_x: int = Field(default=50, ge=0, le=100)
    logo_position_y: int = Field(default=50, ge=0, le=100)


class LatestModificationInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    product_id: str
    title_override: Optional[str] = None
    image_url_override: Optional[str] = None
    sort_order: int = 0


class CarouselDestination(BaseModel):
    model_config = ConfigDict(extra='forbid')
    brand_id: Optional[str] = None
    vehicle_model_id: Optional[str] = None
    vehicle_generation_id: Optional[str] = None
    category_id: Optional[str] = None
    custom_url: Optional[str] = None


class CarouselInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str = Field(min_length=1, max_length=200)
    subtitle: Optional[str] = None
    button_text: Optional[str] = None
    image_url: Optional[str] = Field(default=None, max_length=2048)
    sort_order: int = 0
    published: bool = True
    destination_type: str = 'all_catalog'
    destination: CarouselDestination = Field(default_factory=CarouselDestination)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    database = get_database()
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await database.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    database = get_database()
    # Exclude MongoDB's _id field from the query results
    status_checks = await database.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Tambahkan rute ini di bawah rute /status yang sudah ada
@api_router.get('/products')
async def get_all_products():
    """Return product documents from the MongoDB products collection."""
    database = get_database()
    try:
        documents = await database.products.find({'published': {'$ne': False}}).to_list(length=1000)
    except PyMongoError as exc:
        logger.exception('Could not fetch products from MongoDB')
        raise HTTPException(status_code=503, detail='Product database is unavailable') from exc

    product_list = await serialize_products_with_labels(database, documents)
    return {
        "total_products": len(product_list),
        "data": product_list
    }


@api_router.get('/products/{product_id}')
async def get_product(product_id: str):
    """Return one product by its existing id, or MongoDB _id for legacy records."""
    database = get_database()
    query = {'id': product_id}
    if ObjectId.is_valid(product_id):
        query = {'$or': [{'id': product_id}, {'_id': ObjectId(product_id)}]}

    try:
        document = await database.products.find_one(query)
    except PyMongoError as exc:
        logger.exception('Could not fetch product %s from MongoDB', product_id)
        raise HTTPException(status_code=503, detail='Product database is unavailable') from exc

    if document is None:
        raise HTTPException(status_code=404, detail='Product not found')
    if document.get('published') is False:
        raise HTTPException(status_code=404, detail='Product not found')
    products = await serialize_products_with_labels(database, [document])
    return products[0]


@api_router.post('/admin/login')
async def admin_login(credentials: AdminLogin):
    database = get_database()
    admin = await database.admins.find_one({'email': credentials.email.strip().lower()})
    if not admin or not admin.get('password_hash'):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    try:
        valid_password = bcrypt.checkpw(credentials.password.encode(), admin['password_hash'].encode())
    except (ValueError, TypeError):
        valid_password = False
    if not valid_password:
        raise HTTPException(status_code=401, detail='Invalid email or password')
    token = jwt.encode(
        {'sub': admin['id'], 'exp': utc_now() + timedelta(hours=8)},
        get_jwt_secret(),
        algorithm='HS256',
    )
    return {
        'access_token': token,
        'token_type': 'bearer',
        'admin': {key: admin.get(key) for key in ('id', 'name', 'email', 'role')},
    }


@api_router.get('/admin/products')
async def admin_get_products(_admin=Depends(require_admin)):
    database = get_database()
    documents = await database.products.find({}).to_list(length=2000)
    return await serialize_products_with_labels(database, documents)


async def validate_product_references(database, values):
    brand_id = values.get('brand_id')
    model_id = values.get('vehicle_model_id')
    generation_id = values.get('vehicle_generation_id')
    category_id = values.get('category_id')
    brand = await database.brands.find_one({'id': brand_id}) if brand_id else None
    model = await database.vehicle_models.find_one({'id': model_id}) if model_id else None
    generation = await database.vehicle_generations.find_one({'id': generation_id}) if generation_id else None
    category = await database.product_categories.find_one({'id': category_id}) if category_id else None
    if not brand or not model or not generation:
        raise HTTPException(status_code=422, detail='Brand, model, and generation must reference existing records')
    if model.get('brand_id') != brand_id or generation.get('model_id') != model_id:
        raise HTTPException(status_code=422, detail='Product vehicle references do not match')
    if category_id and not category:
        raise HTTPException(status_code=422, detail='Category must reference an existing product category')


def product_document(values):
    data = dict(values)
    now = utc_now()
    data['id'] = str(uuid.uuid4())
    data['slug'] = slugify(data['name'])
    data['images'] = [
        {**image, 'id': image.get('id') or str(uuid.uuid4()), 'sort_order': index}
        for index, image in enumerate(data.get('images') or [])
    ]
    data['created_at'] = now
    data['updated_at'] = now
    if data.get('catalog_page') is None:
        data.pop('catalog_page', None)
    return data


@api_router.post('/products', status_code=status.HTTP_201_CREATED)
async def create_product(input: ProductInput, _admin=Depends(require_admin)):
    database = get_database()
    values = input.model_dump()
    await validate_product_references(database, values)
    document = product_document(values)
    await database.products.insert_one(document)
    return (await serialize_products_with_labels(database, [document]))[0]


async def update_product_document(product_id, input):
    database = get_database()
    current = await database.products.find_one(doc_by_id(database.products, product_id))
    if not current:
        raise HTTPException(status_code=404, detail='Product not found')
    values = input.model_dump()
    await validate_product_references(database, values)
    values['slug'] = slugify(values['name'])
    values['images'] = [
        {**image, 'id': image.get('id') or str(uuid.uuid4()), 'sort_order': index}
        for index, image in enumerate(values.get('images') or [])
    ]
    values['updated_at'] = utc_now()
    if values.get('catalog_page') is None:
        values.pop('catalog_page', None)
    await database.products.update_one({'_id': current['_id']}, {'$set': values})
    updated = await database.products.find_one({'_id': current['_id']})
    return (await serialize_products_with_labels(database, [updated]))[0]


@api_router.put('/products/{product_id}')
@api_router.patch('/products/{product_id}')
async def update_product(product_id: str, input: ProductInput, _admin=Depends(require_admin)):
    return await update_product_document(product_id, input)


@api_router.delete('/products/{product_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str, _admin=Depends(require_admin)):
    database = get_database()
    result = await database.products.delete_one(doc_by_id(database.products, product_id))
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail='Product not found')


@api_router.get('/brands')
async def get_brands():
    documents = await get_database().brands.find({'published': {'$ne': False}}).sort([('sort_order', 1), ('name', 1)]).to_list(1000)
    return [dict(serialize_document(row), published=row.get('published', True)) for row in documents]


@api_router.get('/admin/brands')
async def admin_get_brands(_admin=Depends(require_admin)):
    documents = await get_database().brands.find({}).sort([('sort_order', 1), ('name', 1)]).to_list(1000)
    return [dict(serialize_document(row), published=row.get('published', True)) for row in documents]


def named_document(values):
    data = dict(values)
    data['slug'] = slugify(data.get('slug') or data['name'])
    data['created_at'] = utc_now()
    return data


@api_router.post('/brands', status_code=status.HTTP_201_CREATED)
async def create_brand(input: BrandInput, _admin=Depends(require_admin)):
    database = get_database()
    values = input.model_dump()
    document = named_document(values)
    if await database.brands.find_one({'slug': document['slug']}):
        raise HTTPException(status_code=409, detail='A brand with this slug already exists')
    document['id'] = str(uuid.uuid4())
    await database.brands.insert_one(document)
    return serialize_document(document)


async def update_named_record(collection_name, record_id, input, allow_published=True):
    database = get_database()
    collection = database[collection_name]
    current = await collection.find_one({'id': record_id})
    if not current:
        raise HTTPException(status_code=404, detail='Record not found')
    values = input.model_dump()
    values['slug'] = slugify(values.get('slug') or values['name'])
    values.pop('published', None) if not allow_published else None
    values['updated_at'] = utc_now()
    duplicate = await collection.find_one({'slug': values['slug'], 'id': {'$ne': record_id}})
    if duplicate:
        raise HTTPException(status_code=409, detail='A record with this slug already exists')
    await collection.update_one({'id': record_id}, {'$set': values})
    return serialize_document(await collection.find_one({'id': record_id}))


@api_router.put('/brands/{brand_id}')
@api_router.patch('/brands/{brand_id}')
async def update_brand(brand_id: str, input: BrandInput, _admin=Depends(require_admin)):
    return await update_named_record('brands', brand_id, input)


@api_router.delete('/brands/{brand_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(brand_id: str, _admin=Depends(require_admin)):
    database = get_database()
    if not await database.brands.find_one({'id': brand_id}):
        raise HTTPException(status_code=404, detail='Brand not found')
    if await database.products.find_one({'brand_id': brand_id}):
        raise HTTPException(status_code=409, detail='Brand is used by products and cannot be deleted')
    await database.home_hot_brands.delete_many({'brand_id': brand_id})
    await database.brands.delete_one({'id': brand_id})


@api_router.get('/categories')
async def get_categories():
    return [serialize_document(row) for row in await get_database().product_categories.find({}).sort([('sort_order', 1), ('name', 1)]).to_list(1000)]


@api_router.get('/admin/categories')
async def admin_get_categories(_admin=Depends(require_admin)):
    return await get_categories()


@api_router.post('/categories', status_code=status.HTTP_201_CREATED)
async def create_category(input: CategoryInput, _admin=Depends(require_admin)):
    database = get_database()
    document = named_document(input.model_dump())
    if await database.product_categories.find_one({'slug': document['slug']}):
        raise HTTPException(status_code=409, detail='A category with this slug already exists')
    document['id'] = str(uuid.uuid4())
    await database.product_categories.insert_one(document)
    return serialize_document(document)


@api_router.put('/categories/{category_id}')
@api_router.patch('/categories/{category_id}')
async def update_category(category_id: str, input: CategoryInput, _admin=Depends(require_admin)):
    return await update_named_record('product_categories', category_id, input, allow_published=False)


@api_router.delete('/categories/{category_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: str, _admin=Depends(require_admin)):
    database = get_database()
    if not await database.product_categories.find_one({'id': category_id}):
        raise HTTPException(status_code=404, detail='Category not found')
    if await database.products.find_one({'category_id': category_id}):
        raise HTTPException(status_code=409, detail='Category is used by products and cannot be deleted')
    await database.product_categories.delete_one({'id': category_id})


async def serialize_hot_brand(database, document):
    item = serialize_document(document)
    item.setdefault('logo_fit', 'contain')
    item.setdefault('logo_scale', 100)
    item.setdefault('logo_position_x', 50)
    item.setdefault('logo_position_y', 50)
    brand = await database.brands.find_one({'id': item.get('brand_id')}, {'_id': 0})
    if brand:
        item['brandLabel'] = brand.get('name')
        item['brandSlug'] = brand.get('slug')
        item['logo_url'] = item.get('logo_url') or brand.get('logo_url')
    return item


@api_router.get('/hot-brands')
async def get_hot_brands():
    database = get_database()
    rows = await database.home_hot_brands.find({'published': True}).sort([('sort_order', 1), ('id', 1)]).to_list(1000)
    result = []
    for row in rows:
        item = await serialize_hot_brand(database, row)
        brand = await database.brands.find_one({'id': item.get('brand_id'), 'published': {'$ne': False}})
        if brand:
            result.append(item)
    return result


@api_router.get('/admin/hot-brands')
async def admin_get_hot_brands(_admin=Depends(require_admin)):
    database = get_database()
    return [await serialize_hot_brand(database, row) for row in await database.home_hot_brands.find({}).sort([('sort_order', 1), ('id', 1)]).to_list(1000)]


@api_router.post('/hot-brands', status_code=status.HTTP_201_CREATED)
async def create_hot_brand(input: HotBrandInput, _admin=Depends(require_admin)):
    database = get_database()
    if not await database.brands.find_one({'id': input.brand_id}):
        raise HTTPException(status_code=422, detail='Brand must reference an existing record')
    if await database.home_hot_brands.find_one({'brand_id': input.brand_id}):
        raise HTTPException(status_code=409, detail='Brand is already in Hot Brands')
    document = input.model_dump()
    document.update({'id': str(uuid.uuid4()), 'created_at': utc_now(), 'updated_at': utc_now()})
    await database.home_hot_brands.insert_one(document)
    return await serialize_hot_brand(database, document)


async def update_home_item(collection_name, item_id, input, reference_field, reference_collection):
    database = get_database()
    collection = database[collection_name]
    current = await collection.find_one({'id': item_id})
    if not current:
        raise HTTPException(status_code=404, detail='Home item not found')
    values = input.model_dump()
    if not await database[reference_collection].find_one({'id': values[reference_field]}):
        raise HTTPException(status_code=422, detail='Referenced record does not exist')
    duplicate = await collection.find_one({reference_field: values[reference_field], 'id': {'$ne': item_id}})
    if duplicate:
        raise HTTPException(status_code=409, detail='This record is already in the Home section')
    values['updated_at'] = utc_now()
    await collection.update_one({'id': item_id}, {'$set': values})
    return serialize_document(await collection.find_one({'id': item_id}))


@api_router.put('/hot-brands/{item_id}')
@api_router.patch('/hot-brands/{item_id}')
async def update_hot_brand(item_id: str, input: HotBrandInput, _admin=Depends(require_admin)):
    document = await update_home_item('home_hot_brands', item_id, input, 'brand_id', 'brands')
    return await serialize_hot_brand(get_database(), document)


@api_router.delete('/hot-brands/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_hot_brand(item_id: str, _admin=Depends(require_admin)):
    result = await get_database().home_hot_brands.delete_one({'id': item_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail='Hot Brand item not found')


async def serialize_latest_modification(database, document):
    item = serialize_document(document)
    product = await database.products.find_one({'id': item.get('product_id')})
    if not product:
        return None
    serialized_product = (await serialize_products_with_labels(database, [product]))[0]
    title_override = item.get('title_override')
    image_url_override = item.get('image_url_override')
    if title_override:
        serialized_product['name'] = title_override
    if image_url_override:
        serialized_product['img'] = image_url_override
    return {
        'id': item['id'], 'product_id': item['product_id'], 'sort_order': item.get('sort_order', 0),
        'title_override': title_override, 'image_url_override': image_url_override,
        'product': serialized_product,
    }


@api_router.get('/latest-modifications')
async def get_latest_modifications():
    database = get_database()
    # Legacy `published` values remain stored but presence in this collection controls visibility.
    rows = await database.home_latest_modifications.find({}).sort([('sort_order', 1), ('id', 1)]).to_list(1000)
    result = []
    for row in rows:
        item = await serialize_latest_modification(database, row)
        if item and item['product'].get('published') is not False:
            result.append(item)
    return result


@api_router.get('/admin/latest-modifications')
async def admin_get_latest_modifications(_admin=Depends(require_admin)):
    database = get_database()
    return [item for item in [await serialize_latest_modification(database, row) for row in await database.home_latest_modifications.find({}).sort([('sort_order', 1), ('id', 1)]).to_list(1000)] if item]


@api_router.post('/latest-modifications', status_code=status.HTTP_201_CREATED)
async def create_latest_modification(input: LatestModificationInput, _admin=Depends(require_admin)):
    database = get_database()
    if not await database.products.find_one({'id': input.product_id}):
        raise HTTPException(status_code=422, detail='Product must reference an existing record')
    if await database.home_latest_modifications.find_one({'product_id': input.product_id}):
        raise HTTPException(status_code=409, detail='Product is already in Latest Modifications')
    document = input.model_dump()
    document.update({'id': str(uuid.uuid4()), 'created_at': utc_now(), 'updated_at': utc_now()})
    await database.home_latest_modifications.insert_one(document)
    return await serialize_latest_modification(database, document)


@api_router.put('/latest-modifications/{item_id}')
@api_router.patch('/latest-modifications/{item_id}')
async def update_latest_modification(item_id: str, input: LatestModificationInput, _admin=Depends(require_admin)):
    document = await update_home_item('home_latest_modifications', item_id, input, 'product_id', 'products')
    return await serialize_latest_modification(get_database(), document)


@api_router.delete('/latest-modifications/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_latest_modification(item_id: str, _admin=Depends(require_admin)):
    result = await get_database().home_latest_modifications.delete_one({'id': item_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail='Latest Modification item not found')


def validate_custom_carousel_url(value):
    if not value:
        raise HTTPException(status_code=422, detail='Custom destination URL is required')
    if value.startswith('/') and not value.startswith('//') and not any(ord(char) < 32 for char in value):
        return value
    if re.match(r'^https://[^\s/]+(?:/[^\s]*)?$', value, flags=re.IGNORECASE):
        return value
    raise HTTPException(status_code=422, detail='Destination must be a safe HTTPS URL or same-site path')


async def validate_carousel_destination(database, input):
    if input.destination_type not in ('all_catalog', 'catalog_filter', 'custom_url'):
        raise HTTPException(status_code=422, detail='Unsupported carousel destination type')
    dest = input.destination
    if input.destination_type == 'custom_url':
        validate_custom_carousel_url(dest.custom_url)
        return
    if input.destination_type == 'all_catalog':
        return
    refs = [
        ('brand_id', 'brands'), ('vehicle_model_id', 'vehicle_models'),
        ('vehicle_generation_id', 'vehicle_generations'), ('category_id', 'product_categories'),
    ]
    for field_name, collection_name in refs:
        value = getattr(dest, field_name)
        if value and not await database[collection_name].find_one({'id': value}):
            raise HTTPException(status_code=422, detail=f'{field_name} must reference an existing record')
    model = None
    if dest.vehicle_model_id:
        model = await database.vehicle_models.find_one({'id': dest.vehicle_model_id})
    if dest.vehicle_model_id and dest.brand_id:
        if model and model.get('brand_id') != dest.brand_id:
            raise HTTPException(status_code=422, detail='Vehicle model does not belong to the selected brand')
    if dest.vehicle_generation_id:
        generation = await database.vehicle_generations.find_one({'id': dest.vehicle_generation_id})
        generation_model_id = generation.get('model_id') if generation else None
        if dest.vehicle_model_id and generation_model_id != dest.vehicle_model_id:
            raise HTTPException(status_code=422, detail='Vehicle generation does not belong to the selected model')
        if dest.brand_id and not dest.vehicle_model_id and generation_model_id:
            generation_model = await database.vehicle_models.find_one({'id': generation_model_id})
            if generation_model and generation_model.get('brand_id') != dest.brand_id:
                raise HTTPException(status_code=422, detail='Vehicle generation does not belong to the selected brand')


@api_router.get('/home/carousel')
async def get_home_carousel():
    rows = await get_database().home_carousel.find({'published': True}).sort([('sort_order', 1), ('id', 1)]).to_list(1000)
    return [serialize_document(row) for row in rows]


@api_router.get('/admin/home/carousel')
async def admin_get_home_carousel(_admin=Depends(require_admin)):
    rows = await get_database().home_carousel.find({}).sort([('sort_order', 1), ('id', 1)]).to_list(1000)
    return [serialize_document(row) for row in rows]


@api_router.post('/home/carousel', status_code=status.HTTP_201_CREATED)
async def create_home_carousel(input: CarouselInput, _admin=Depends(require_admin)):
    database = get_database()
    if not input.image_url:
        raise HTTPException(status_code=422, detail='Image URL wajib diisi sebelum membuat slide carousel')
    await validate_carousel_destination(database, input)
    document = input.model_dump(exclude_none=True)
    document.update({'id': str(uuid.uuid4()), 'created_at': utc_now(), 'updated_at': utc_now()})
    await database.home_carousel.insert_one(document)
    return serialize_document(document)


@api_router.put('/home/carousel/{item_id}')
@api_router.patch('/home/carousel/{item_id}')
async def update_home_carousel(item_id: str, input: CarouselInput, _admin=Depends(require_admin)):
    database = get_database()
    if not await database.home_carousel.find_one({'id': item_id}):
        raise HTTPException(status_code=404, detail='Carousel item not found')
    await validate_carousel_destination(database, input)
    values = input.model_dump(exclude_none=True)
    values['updated_at'] = utc_now()
    await database.home_carousel.update_one({'id': item_id}, {'$set': values})
    return serialize_document(await database.home_carousel.find_one({'id': item_id}))


@api_router.delete('/home/carousel/{item_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_home_carousel(item_id: str, _admin=Depends(require_admin)):
    result = await get_database().home_carousel.delete_one({'id': item_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail='Carousel item not found')


@api_router.get('/admin/uploads/status')
async def admin_upload_status(_admin=Depends(require_admin)):
    bucket = os.environ.get('S3_BUCKET')
    public_base = os.environ.get('S3_PUBLIC_BASE_URL', '').rstrip('/')
    configured = bool(bucket and public_base)
    result = {'configured': configured}
    if configured:
        result.update({'provider': 's3-compatible' if os.environ.get('S3_ENDPOINT_URL') else 'aws-s3', 'bucket': bucket, 'public_base_url': public_base})
    else:
        result['message'] = 'Image storage belum dikonfigurasi. Gunakan URL gambar atau atur S3_BUCKET dan S3_PUBLIC_BASE_URL.'
    return result


MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_EDGE = 2400
RASTER_FORMATS = {
    'image/jpeg': ({'.jpg', '.jpeg'}, 'JPEG'),
    'image/png': ({'.png'}, 'PNG'),
    'image/webp': ({'.webp'}, 'WEBP'),
}
SVG_ALLOWED_TAGS = {
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'title',
    'desc', 'use', 'pattern', 'symbol', 'filter', 'feblend', 'fecolormatrix',
    'fecomponenttransfer', 'fecomposite', 'feconvolvematrix', 'fediffuselighting',
    'fedisplacementmap', 'feflood', 'fegaussianblur', 'feimage', 'femerge',
    'femergenode', 'femorphology', 'feoffset', 'fespecularlighting', 'fetile',
    'feturbulence', 'fefuncarta', 'fefuncg', 'fefuncb', 'fefunca', 'style',
}
SVG_URL_PATTERN = re.compile(r'url\((.*?)\)', flags=re.IGNORECASE)


def sanitize_svg(content):
    text = content.decode('utf-8-sig')
    if re.search(r'<!\s*(doctype|entity)|<\?xml-stylesheet', text, flags=re.IGNORECASE):
        raise HTTPException(status_code=415, detail='SVG tidak boleh berisi DTD, entity, atau stylesheet eksternal')
    try:
        root = SafeET.fromstring(text)
    except Exception as exc:
        raise HTTPException(status_code=415, detail='File SVG tidak valid atau tidak aman') from exc
    if root.tag.rsplit('}', 1)[-1].lower() != 'svg':
        raise HTTPException(status_code=415, detail='Dokumen SVG harus memiliki elemen root svg')

    for element in root.iter():
        tag = element.tag.rsplit('}', 1)[-1].lower()
        if tag not in SVG_ALLOWED_TAGS:
            raise HTTPException(status_code=415, detail='SVG mengandung elemen yang tidak diizinkan')
        for attr_name, attr_value in element.attrib.items():
            attr = attr_name.rsplit('}', 1)[-1].lower()
            value = attr_value.strip()
            if attr.startswith('on') or attr in {'src', 'formaction'}:
                raise HTTPException(status_code=415, detail='SVG mengandung event atau sumber aktif yang tidak diizinkan')
            if attr in {'href'} and value and not value.startswith('#'):
                raise HTTPException(status_code=415, detail='SVG hanya boleh memakai referensi internal')
            if re.search(r'javascript:|data:text/html|expression\s*\(|@import|behavior\s*:|-moz-binding|progid:', value, flags=re.IGNORECASE):
                raise HTTPException(status_code=415, detail='SVG mengandung konten aktif yang tidak diizinkan')
            for reference in SVG_URL_PATTERN.findall(value):
                if not reference.strip().strip('\"\'').startswith('#'):
                    raise HTTPException(status_code=415, detail='SVG hanya boleh memakai referensi internal')
        if element.text and re.search(r'javascript:|data:text/html|@import|behavior\s*:|-moz-binding|progid:|url\((?!\s*[\"\']?#)', element.text, flags=re.IGNORECASE):
            raise HTTPException(status_code=415, detail='SVG mengandung stylesheet atau skrip yang tidak diizinkan')
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)


def optimize_raster_image(content, expected_format):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(content))
            if image.format != expected_format:
                raise HTTPException(status_code=415, detail='Isi gambar tidak sesuai dengan MIME type dan extension')
            if image.width * image.height > 40_000_000:
                raise HTTPException(status_code=413, detail='Resolusi gambar maksimal 40 megapixel')
            image.load()
            image = ImageOps.exif_transpose(image)
            image.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.Resampling.LANCZOS)
            has_alpha = 'A' in image.getbands() or 'transparency' in image.info
            if expected_format == 'PNG':
                if has_alpha and image.mode not in ('RGBA', 'LA'):
                    image = image.convert('RGBA')
                elif not has_alpha and image.mode not in ('RGB', 'L'):
                    image = image.convert('RGB')
                output = io.BytesIO()
                image.save(output, format='PNG', optimize=True, compress_level=9)
                return output.getvalue(), 'png', 'image/png'
            if expected_format == 'JPEG':
                image = image.convert('RGB')
            elif image.mode not in ('RGB', 'RGBA'):
                image = image.convert('RGBA' if has_alpha else 'RGB')
            output = io.BytesIO()
            image.save(output, format='WEBP', quality=84, method=6)
            return output.getvalue(), 'webp', 'image/webp'
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(status_code=415, detail='File gambar rusak atau tidak dapat diproses') from exc


async def prepare_uploaded_image(file):
    filename_extension = Path(file.filename or '').suffix.lower()
    content = await file.read(MAX_IMAGE_UPLOAD_BYTES + 1)
    if len(content) > MAX_IMAGE_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail='Ukuran gambar maksimal 10 MB')
    if not content:
        raise HTTPException(status_code=415, detail='File gambar kosong')

    if file.content_type == 'image/svg+xml' and filename_extension == '.svg':
        if len(content) > 2 * 1024 * 1024:
            raise HTTPException(status_code=413, detail='Ukuran SVG maksimal 2 MB')
        sanitized = sanitize_svg(content)
        return sanitized, 'svg', 'image/svg+xml'

    expected = RASTER_FORMATS.get(file.content_type)
    if not expected or filename_extension not in expected[0]:
        raise HTTPException(status_code=415, detail='MIME type dan extension harus cocok: JPG, PNG, WEBP, atau SVG')
    data, extension, content_type = optimize_raster_image(content, expected[1])
    return data, extension, content_type


@api_router.post('/admin/uploads')
async def admin_upload_image(file: UploadFile = File(...), _admin=Depends(require_admin)):
    content, extension, content_type = await prepare_uploaded_image(file)
    bucket = os.environ.get('S3_BUCKET')
    public_base = os.environ.get('S3_PUBLIC_BASE_URL', '').rstrip('/')
    if not bucket or not public_base:
        raise HTTPException(status_code=503, detail='Image storage belum dikonfigurasi. Gunakan URL gambar atau atur S3_BUCKET dan S3_PUBLIC_BASE_URL.')
    object_key = f'uploads/{uuid.uuid4()}.{extension}'
    try:
        s3 = boto3.client(
            's3', endpoint_url=os.environ.get('S3_ENDPOINT_URL') or None,
            region_name=os.environ.get('S3_REGION') or None,
        )
        metadata = {'content-security-policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:"} if extension == 'svg' else None
        await run_in_threadpool(
            s3.put_object, Bucket=bucket, Key=object_key, Body=content, ContentType=content_type,
            ContentDisposition='inline', CacheControl='public, max-age=31536000, immutable', Metadata=metadata or {},
        )
    except Exception as exc:
        logger.warning('Image upload failed (exception type: %s)', type(exc).__name__)
        raise HTTPException(status_code=502, detail='Upload gambar gagal. Periksa konfigurasi object storage.')
    return {'url': f'{public_base}/{object_key}', 'content_type': content_type}


@api_router.get('/vehicle-models')
async def get_vehicle_models(brand_id: Optional[str] = None):
    query = {'brand_id': brand_id} if brand_id else {}
    rows = await get_database().vehicle_models.find(query, {'_id': 0}).sort([('sort_order', 1), ('name', 1)]).to_list(1000)
    return rows


@api_router.get('/vehicle-generations')
async def get_vehicle_generations(model_id: Optional[str] = None):
    query = {'model_id': model_id} if model_id else {}
    rows = await get_database().vehicle_generations.find(query, {'_id': 0}).sort([('sort_order', 1), ('name', 1)]).to_list(1000)
    return rows

# Include the router in the main app
app.include_router(api_router)

cors_origins = [
    origin.strip().rstrip('/')
    for origin in os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
