from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


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
    """Return the existing frontend product shape with a JSON-safe string id."""
    product = dict(document)
    mongo_id = product.pop('_id', None)
    if not product.get('id') and mongo_id is not None:
        product['id'] = str(mongo_id)
    return product

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
        documents = await database.products.find({}).to_list(length=1000)
    except PyMongoError as exc:
        logger.exception('Could not fetch products from MongoDB')
        raise HTTPException(status_code=503, detail='Product database is unavailable') from exc

    product_list = [serialize_product(document) for document in documents]
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
    return serialize_product(document)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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
