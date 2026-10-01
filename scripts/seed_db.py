import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
import uuid

# Add backend directory to path and load .env
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir / 'backend'))

from dotenv import load_dotenv
load_dotenv(root_dir / 'backend' / '.env')
load_dotenv(root_dir / '.env')

from motor.motor_asyncio import AsyncIOMotorClient

async def seed_database():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'linentrack')
    
    print(f"Connecting to MongoDB database '{db_name}' at: {mongo_url}")
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    
    try:
        # Ping database
        await client.admin.command('ping')
        print("Successfully connected to MongoDB server.")
    except Exception as e:
        print(f"Connection failed: {e}")
        print("Note: If using MongoDB Atlas, make sure MONGO_URL in backend/.env is updated with your cluster URI and user credentials.")
        return

    # Create Indexes for performance and uniqueness
    print("Setting up database indexes...")
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.companies.create_index("company_id", unique=True)
    await db.outlets.create_index("outlet_id", unique=True)
    await db.items.create_index("item_id", unique=True)
    await db.staff.create_index("staff_id", unique=True)
    await db.inventory.create_index("inventory_id", unique=True)
    print("Database indexes created successfully.")

    # Seed Admin User shplitexe@gmail.com
    admin_email = "shplitexe@gmail.com"
    admin_name = "Super Admin"
    
    existing_user = await db.users.find_one({"email": admin_email}, {"_id": 0})
    
    if existing_user:
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"role": "super_admin", "is_active": True}}
        )
        print(f"Updated existing user '{admin_email}' to 'super_admin' role.")
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        admin_doc = {
            "user_id": user_id,
            "email": admin_email,
            "name": admin_name,
            "picture": None,
            "role": "super_admin",
            "company_id": None,
            "outlet_ids": [],
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(admin_doc)
        print(f"Created new super_admin user: '{admin_email}' (user_id: {user_id}).")
        
    # Seed Default Categories
    DEFAULT_CATEGORIES = [
        {"name": "Shirts", "description": "Staff shirts, formal shirts, and polo t-shirts"},
        {"name": "Trousers", "description": "Trousers, pants, and uniform bottoms"},
        {"name": "Chefs Coat", "description": "Executive chef coats and kitchen jackets"},
        {"name": "Aprons", "description": "Kitchen aprons and service waist aprons"},
        {"name": "Shoes", "description": "Safety footwear and formal shoes"},
        {"name": "Towels & Bath", "description": "Hand towels, bath towels, and bathrobes"},
        {"name": "Bedding & Linen", "description": "Bed sheets, pillowcases, and duvet covers"},
        {"name": "Table Linen", "description": "Tablecloths, napkins, and table runners"},
    ]

    DEFAULT_DEPARTMENTS = [
        {"name": "Front of House", "code": "FOH", "description": "Reception, Dining, Guest Services"},
        {"name": "Back of House", "code": "BOH", "description": "Kitchen, Maintenance, Storage"},
        {"name": "Housekeeping", "code": "HK", "description": "Room Cleaning, Laundry, Linen Operations"},
        {"name": "Administration", "code": "ADM", "description": "Management, HR, Accounts"},
        {"name": "Food & Beverage", "code": "FNB", "description": "Banquets, Bar, Catering Services"},
    ]

    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        cat_docs = [{
            "category_id": f"cat_{uuid.uuid4().hex[:12]}",
            "company_id": None,
            "name": cat["name"],
            "description": cat["description"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        } for cat in DEFAULT_CATEGORIES]
        await db.categories.insert_many(cat_docs)
        print(f"Seeded {len(cat_docs)} default categories.")

    dept_count = await db.departments.count_documents({})
    if dept_count == 0:
        dept_docs = [{
            "department_id": f"dept_{uuid.uuid4().hex[:12]}",
            "company_id": None,
            "name": dept["name"],
            "code": dept["code"],
            "description": dept["description"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        } for dept in DEFAULT_DEPARTMENTS]
        await db.departments.insert_many(dept_docs)
        print(f"Seeded {len(dept_docs)} default departments.")

    print("\nDatabase initialization complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
