from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import json
from io import BytesIO
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Uniform Inventory System")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================= MODELS =======================

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "pending"  # pending, super_admin, company_admin, company_manager, outlet_manager, issuer, auditor
    company_id: Optional[str] = None
    outlet_ids: List[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    company_id: str = Field(default_factory=lambda: f"comp_{uuid.uuid4().hex[:12]}")
    legal_name: str
    display_name: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    cin_number: Optional[str] = None
    email: Optional[str] = None
    default_template_id: Optional[str] = None
    terms_conditions: Optional[str] = None
    allow_outlet_template_override: bool = True
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class OutletBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    outlet_id: str = Field(default_factory=lambda: f"outlet_{uuid.uuid4().hex[:12]}")
    company_id: str
    outlet_name: str
    display_company_name: Optional[str] = None  # For franchise - can be different from parent company
    city: str
    area: Optional[str] = None
    outlet_code: str
    address: Optional[str] = None
    logo_url: Optional[str] = None
    manager_id: Optional[str] = None
    template_id: Optional[str] = None  # Override company template
    can_customize_template: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class ItemMasterBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    company_id: str
    item_name: str
    category: str  # Shirt, Trouser, Coat, Shoes, etc.
    department: str  # HOH, FOH, Admin
    cost_per_unit: float = 0.0
    enable_size_tracking: bool = True
    enable_unique_code: bool = False
    is_reusable: bool = True
    track_condition: bool = True
    sizes_available: List[str] = []  # S, M, L, XL, etc.
    low_stock_threshold: int = 5
    size_thresholds: Dict[str, int] = {}  # Per-size thresholds
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class VendorBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vendor_id: str = Field(default_factory=lambda: f"vendor_{uuid.uuid4().hex[:12]}")
    company_id: str
    vendor_name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class StaffBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    staff_id: str = Field(default_factory=lambda: f"staff_{uuid.uuid4().hex[:12]}")
    company_id: str
    outlet_id: str
    staff_code: str
    name: str
    department: str
    designation: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    joining_date: Optional[str] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class InventoryItemBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    inventory_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    company_id: str
    outlet_id: str
    item_id: str
    size: Optional[str] = None
    unique_code: Optional[str] = None
    condition: str = "new"  # new, old, damaged
    opening_stock: int = 0
    received: int = 0
    issued: int = 0
    returned: int = 0
    discarded: int = 0
    lost: int = 0
    current_stock: int = 0  # Auto-calculated
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GRNBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    grn_id: str = Field(default_factory=lambda: f"grn_{uuid.uuid4().hex[:12]}")
    company_id: str
    outlet_id: str
    vendor_id: str
    items: List[Dict[str, Any]] = []  # [{item_id, size, quantity, unique_codes: []}]
    total_quantity: int = 0
    total_value: float = 0.0
    notes: Optional[str] = None
    received_by: str
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IssueBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    issue_id: str = Field(default_factory=lambda: f"issue_{uuid.uuid4().hex[:12]}")
    company_id: str
    outlet_id: str
    staff_id: str
    items: List[Dict[str, Any]] = []  # [{item_id, size, quantity, unique_codes: [], condition}]
    total_items: int = 0
    total_value: float = 0.0
    notes: Optional[str] = None
    issued_by: str
    issued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    template_id: Optional[str] = None

class ReturnBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    return_id: str = Field(default_factory=lambda: f"return_{uuid.uuid4().hex[:12]}")
    company_id: str
    outlet_id: str
    staff_id: str
    issue_id: Optional[str] = None
    items: List[Dict[str, Any]] = []  # [{item_id, size, quantity, unique_codes: [], condition_before, condition_after}]
    total_items: int = 0
    notes: Optional[str] = None
    received_by: str
    returned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DiscardLostBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    record_id: str = Field(default_factory=lambda: f"record_{uuid.uuid4().hex[:12]}")
    company_id: str
    outlet_id: str
    staff_id: Optional[str] = None
    item_id: str
    size: Optional[str] = None
    unique_code: Optional[str] = None
    quantity: int = 1
    type: str  # discard, lost
    reason: str
    cost_value: float = 0.0
    recorded_by: str
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    company_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepartmentBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    department_id: str = Field(default_factory=lambda: f"dept_{uuid.uuid4().hex[:12]}")
    company_id: Optional[str] = None
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FormTemplateBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    template_id: str = Field(default_factory=lambda: f"tpl_{uuid.uuid4().hex[:12]}")
    template_name: str
    scope: str  # global, company, outlet
    company_id: Optional[str] = None
    outlet_id: Optional[str] = None
    canvas_elements: List[Dict[str, Any]] = []  # Drag-drop elements
    page_size: str = "A4"
    orientation: str = "portrait"
    margins: Dict[str, int] = {"top": 20, "right": 20, "bottom": 20, "left": 20}
    is_default: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None

class ActivityLogBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:12]}")
    company_id: Optional[str] = None
    outlet_id: Optional[str] = None
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    before_value: Optional[Dict[str, Any]] = None
    after_value: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    logged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ======================= AUTH HELPERS =======================

VALID_ROLES = {"super_admin", "company_admin", "company_manager", "outlet_manager", "issuer", "auditor"}
COMPANY_SCOPED_ROLES = {"company_admin", "company_manager", "outlet_manager", "issuer", "auditor"}
OUTLET_SCOPED_ROLES = {"outlet_manager", "issuer"}


def bootstrap_super_admin_emails() -> set:
    raw = os.environ.get("SUPER_ADMIN_EMAILS", "")
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def assigned_outlets(user: dict) -> List[str]:
    return [outlet_id for outlet_id in (user.get("outlet_ids") or []) if outlet_id]


async def get_current_user(request: Request) -> dict:
    """Get current user from session token (cookie or header). Inactive accounts cannot authenticate."""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    return user


async def require_assigned_user(user: dict = Depends(get_current_user)) -> dict:
    """Require an assigned, usable role. Pending / unscoped users cannot use the API."""
    role = user.get("role")
    if role not in VALID_ROLES:
        raise HTTPException(status_code=403, detail="No role assigned. Contact an administrator.")
    if role in COMPANY_SCOPED_ROLES and not user.get("company_id"):
        raise HTTPException(status_code=403, detail="No company assigned. Contact an administrator.")
    if role in OUTLET_SCOPED_ROLES and not assigned_outlets(user):
        raise HTTPException(status_code=403, detail="No outlet assigned. Contact an administrator.")
    return user


def check_role(required_roles: List[str]):
    """Role checker dependency"""
    async def role_checker(user: dict = Depends(require_assigned_user)):
        if user.get("role") not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker


def assert_company_access(user: dict, company_id: Optional[str]):
    if user.get("role") == "super_admin":
        return
    if not company_id or user.get("company_id") != company_id:
        raise HTTPException(status_code=403, detail="Access denied for this company")


def assert_outlet_access(user: dict, outlet_id: Optional[str]):
    if user.get("role") == "super_admin":
        return
    if not outlet_id:
        raise HTTPException(status_code=403, detail="Outlet is required")
    if user.get("role") in OUTLET_SCOPED_ROLES and outlet_id not in assigned_outlets(user):
        raise HTTPException(status_code=403, detail="Access denied for this outlet")


def apply_company_scope(query: dict, user: dict, company_id: Optional[str] = None) -> dict:
    if user.get("role") == "super_admin":
        if company_id:
            query["company_id"] = company_id
    else:
        query["company_id"] = user.get("company_id")
    return query


def apply_outlet_scope(query: dict, user: dict, outlet_id: Optional[str] = None) -> dict:
    if outlet_id:
        assert_outlet_access(user, outlet_id)
        query["outlet_id"] = outlet_id
    elif user.get("role") in OUTLET_SCOPED_ROLES:
        query["outlet_id"] = {"$in": assigned_outlets(user)}
    return query


def scoped_query(user: dict, company_id: Optional[str] = None, outlet_id: Optional[str] = None) -> dict:
    query: dict = {}
    apply_company_scope(query, user, company_id)
    apply_outlet_scope(query, user, outlet_id)
    return query


def enforce_write_scope(user: dict, data: dict, require_outlet: bool = False) -> dict:
    if user.get("role") != "super_admin":
        data["company_id"] = user.get("company_id")
    elif not data.get("company_id"):
        raise HTTPException(status_code=400, detail="company_id is required")
    if require_outlet or user.get("role") in OUTLET_SCOPED_ROLES:
        if not data.get("outlet_id"):
            raise HTTPException(status_code=400, detail="outlet_id is required")
        assert_outlet_access(user, data.get("outlet_id"))
    elif data.get("outlet_id"):
        assert_outlet_access(user, data.get("outlet_id"))
    return data

async def log_activity(company_id: Optional[str], outlet_id: Optional[str], user_id: str, 
                       action: str, entity_type: str, entity_id: str,
                       before_value: Optional[dict] = None, after_value: Optional[dict] = None,
                       ip_address: Optional[str] = None):
    """Log activity for audit trail"""
    log = ActivityLogBase(
        company_id=company_id,
        outlet_id=outlet_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_value=before_value,
        after_value=after_value,
        ip_address=ip_address
    )
    await db.activity_logs.insert_one(log.model_dump())

# ======================= AUTH ENDPOINTS =======================

# ======================= AUTH ENDPOINTS =======================

async def create_or_update_user_session(email: str, name: str, picture: Optional[str], response: Response) -> dict:
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        if not existing_user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is inactive")
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        role = "pending"
        bootstrap_emails = bootstrap_super_admin_emails()
        if email.lower() in bootstrap_emails:
            active_super_admins = await db.users.count_documents({"role": "super_admin", "is_active": True})
            if active_super_admins == 0:
                role = "super_admin"
        
        new_user = UserBase(
            user_id=user_id,
            email=email,
            name=name,
            picture=picture,
            role=role,
            is_active=True
        )
        await db.users.insert_one(new_user.model_dump())
    
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user["session_token"] = session_token
    return user

@api_router.get("/auth/google/url")
async def get_google_auth_url():
    """Get Google OAuth 2.0 authorization URL"""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")
    if not client_id or client_id == "YOUR_GOOGLE_CLIENT_ID":
        raise HTTPException(status_code=400, detail="GOOGLE_CLIENT_ID not configured in environment")
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={httpx.URL(redirect_uri)}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return {"url": auth_url}

@api_router.post("/auth/google/callback")
async def google_auth_callback(request: Request, response: Response):
    """Exchange authorization code for tokens and authenticate user"""
    data = await request.json()
    code = data.get("code")
    redirect_uri = data.get("redirect_uri") or os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code required")
    
    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
        )
        if token_resp.status_code != 200:
            logger.error(f"Google token exchange failed: {token_resp.text}")
            raise HTTPException(status_code=401, detail="Failed to exchange authorization code with Google")
        
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        
        # Get user info
        user_info_resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if user_info_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to fetch user info from Google")
        
        user_info = user_info_resp.json()
        email = user_info.get("email")
        name = user_info.get("name", email)
        picture = user_info.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        return await create_or_update_user_session(email, name, picture, response)

@api_router.post("/auth/google/token")
async def google_id_token_login(request: Request, response: Response):
    """Authenticate using Google ID Token (Google One Tap / GIS SDK)"""
    data = await request.json()
    id_token = data.get("credential") or data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="ID token required")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}")
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google ID token")
        
        user_info = resp.json()
        email = user_info.get("email")
        name = user_info.get("name", email)
        picture = user_info.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in ID token")
        
        return await create_or_update_user_session(email, name, picture, response)

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Backward-compatible session exchange (supports dev/test session tokens or legacy exchange)"""
    data = await request.json()
    session_id = data.get("session_id")
    email = data.get("email")
    name = data.get("name", "Test User")
    
    if email:
        return await create_or_update_user_session(email, name, None, response)
    
    if session_id:
        session = await db.user_sessions.find_one({"session_token": session_id}, {"_id": 0})
        if session:
            user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
            if user:
                response.set_cookie(
                    key="session_token",
                    value=session_id,
                    httponly=True,
                    secure=True,
                    samesite="none",
                    path="/",
                    max_age=7*24*60*60
                )
                user["session_token"] = session_id
                return user
        
        dev_email = f"user_{session_id[:8]}@example.com"
        return await create_or_update_user_session(dev_email, f"User {session_id[:6]}", None, response)
    
    raise HTTPException(status_code=400, detail="session_id or email required")

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current authenticated user (pending/unassigned users may call this)"""
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ======================= COMPANY ENDPOINTS =======================

@api_router.get("/companies")
async def list_companies(user: dict = Depends(require_assigned_user)):
    """List companies based on user role"""
    if user["role"] == "super_admin":
        companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    else:
        companies = await db.companies.find({"company_id": user["company_id"]}, {"_id": 0}).to_list(10)
    return companies

@api_router.post("/companies")
async def create_company(data: dict, user: dict = Depends(check_role(["super_admin"]))):
    """Create a new company"""
    company = CompanyBase(**data, created_by=user["user_id"])
    await db.companies.insert_one(company.model_dump())
    await log_activity(company.company_id, None, user["user_id"], "create", "company", company.company_id, after_value=company.model_dump())
    return company.model_dump()

@api_router.get("/companies/{company_id}")
async def get_company(company_id: str, user: dict = Depends(require_assigned_user)):
    """Get company by ID"""
    assert_company_access(user, company_id)
    company = await db.companies.find_one({"company_id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@api_router.put("/companies/{company_id}")
async def update_company(company_id: str, data: dict, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Update company"""
    assert_company_access(user, company_id)
    existing = await db.companies.find_one({"company_id": company_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Company not found")
    
    data.pop("company_id", None)
    data.pop("created_at", None)
    data.pop("allow_outlet_template_override", None)
    await db.companies.update_one({"company_id": company_id}, {"$set": data})
    updated = await db.companies.find_one({"company_id": company_id}, {"_id": 0})
    await log_activity(company_id, None, user["user_id"], "update", "company", company_id, before_value=existing, after_value=updated)
    return updated

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, user: dict = Depends(check_role(["super_admin"]))):
    """Soft delete company"""
    await db.companies.update_one({"company_id": company_id}, {"$set": {"is_active": False}})
    await log_activity(company_id, None, user["user_id"], "delete", "company", company_id)
    return {"message": "Company deactivated"}

# ======================= OUTLET ENDPOINTS =======================

@api_router.get("/outlets")
async def list_outlets(company_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List outlets based on user access"""
    query = scoped_query(user, company_id)
    outlets = await db.outlets.find(query, {"_id": 0}).to_list(1000)
    return outlets

@api_router.post("/outlets")
async def create_outlet(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Create a new outlet"""
    if user["role"] != "super_admin":
        data["company_id"] = user.get("company_id")
    elif not data.get("company_id"):
        raise HTTPException(status_code=400, detail="company_id is required")
    data.pop("can_customize_template", None)
    outlet = OutletBase(**data, created_by=user["user_id"])
    await db.outlets.insert_one(outlet.model_dump())
    await log_activity(outlet.company_id, outlet.outlet_id, user["user_id"], "create", "outlet", outlet.outlet_id, after_value=outlet.model_dump())
    return outlet.model_dump()

@api_router.get("/outlets/{outlet_id}")
async def get_outlet(outlet_id: str, user: dict = Depends(require_assigned_user)):
    """Get outlet by ID"""
    outlet = await db.outlets.find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")
    assert_company_access(user, outlet.get("company_id"))
    assert_outlet_access(user, outlet_id)
    return outlet

@api_router.put("/outlets/{outlet_id}")
async def update_outlet(outlet_id: str, data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "outlet_manager"]))):
    """Update outlet"""
    existing = await db.outlets.find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Outlet not found")
    assert_company_access(user, existing.get("company_id"))
    assert_outlet_access(user, outlet_id)
    
    data.pop("outlet_id", None)
    data.pop("company_id", None)
    data.pop("created_at", None)
    data.pop("can_customize_template", None)
    await db.outlets.update_one({"outlet_id": outlet_id}, {"$set": data})
    updated = await db.outlets.find_one({"outlet_id": outlet_id}, {"_id": 0})
    await log_activity(existing["company_id"], outlet_id, user["user_id"], "update", "outlet", outlet_id, before_value=existing, after_value=updated)
    return updated

@api_router.delete("/outlets/{outlet_id}")
async def delete_outlet(outlet_id: str, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Soft delete outlet"""
    outlet = await db.outlets.find_one({"outlet_id": outlet_id}, {"_id": 0})
    if outlet:
        assert_company_access(user, outlet.get("company_id"))
        await db.outlets.update_one({"outlet_id": outlet_id}, {"$set": {"is_active": False}})
        await log_activity(outlet["company_id"], outlet_id, user["user_id"], "delete", "outlet", outlet_id)
    return {"message": "Outlet deactivated"}

# ======================= USER MANAGEMENT ENDPOINTS =======================

@api_router.get("/users")
async def list_users(company_id: Optional[str] = None, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """List users"""
    query: dict = {}
    if user["role"] != "super_admin":
        query = {
            "$or": [
                {"company_id": user.get("company_id")},
                {"role": "pending", "$or": [{"company_id": None}, {"company_id": ""}, {"company_id": {"$exists": False}}]},
            ]
        }
    elif company_id:
        query["company_id"] = company_id
    
    users = await db.users.find(query, {"_id": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: dict, current_user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Update user role and permissions"""
    existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    if existing.get("role") == "super_admin" and current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot edit super admin")
    
    if current_user["role"] == "company_admin":
        target_company = existing.get("company_id")
        if target_company and target_company != current_user.get("company_id"):
            raise HTTPException(status_code=403, detail="Cannot edit users from another company")
        if data.get("role") == "super_admin":
            raise HTTPException(status_code=403, detail="Cannot assign super admin role")
        data["company_id"] = current_user.get("company_id")
    
    allowed_fields = ["role", "company_id", "outlet_ids", "is_active"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    new_role = update_data.get("role", existing.get("role"))
    if new_role and new_role not in VALID_ROLES and new_role != "pending":
        raise HTTPException(status_code=400, detail="Invalid role")
    
    new_company = update_data.get("company_id", existing.get("company_id"))
    new_outlets = update_data.get("outlet_ids", existing.get("outlet_ids") or [])
    if new_role in COMPANY_SCOPED_ROLES and not new_company:
        raise HTTPException(status_code=400, detail="Company assignment is required for this role")
    if new_role in OUTLET_SCOPED_ROLES and not [oid for oid in (new_outlets or []) if oid]:
        raise HTTPException(status_code=400, detail="At least one outlet must be assigned for this role")
    if new_role in {"super_admin", "pending"}:
        update_data["company_id"] = None
        update_data["outlet_ids"] = []
    
    if existing.get("role") == "super_admin" and update_data.get("is_active") is False:
        remaining = await db.users.count_documents({
            "role": "super_admin",
            "is_active": True,
            "user_id": {"$ne": user_id},
        })
        if remaining == 0:
            raise HTTPException(status_code=400, detail="Cannot deactivate the last active super admin")
    
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    await log_activity(existing.get("company_id"), None, current_user["user_id"], "update", "user", user_id, before_value=existing, after_value=updated)
    return updated

# ======================= ITEM MASTER ENDPOINTS =======================

@api_router.get("/items")
async def list_items(company_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List items"""
    query = {"is_active": True}
    apply_company_scope(query, user, company_id)
    
    items = await db.items.find(query, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/items")
async def create_item(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Create a new item"""
    data = enforce_write_scope(user, data)
    
    item = ItemMasterBase(**data, created_by=user["user_id"])
    await db.items.insert_one(item.model_dump())
    await log_activity(item.company_id, None, user["user_id"], "create", "item", item.item_id, after_value=item.model_dump())
    return item.model_dump()

@api_router.get("/items/{item_id}")
async def get_item(item_id: str, user: dict = Depends(require_assigned_user)):
    """Get item by ID"""
    item = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    assert_company_access(user, item.get("company_id"))
    return item

@api_router.put("/items/{item_id}")
async def update_item(item_id: str, data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Update item"""
    existing = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    assert_company_access(user, existing.get("company_id"))
    
    data.pop("item_id", None)
    data.pop("company_id", None)
    data.pop("created_at", None)
    await db.items.update_one({"item_id": item_id}, {"$set": data})
    updated = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    await log_activity(existing["company_id"], None, user["user_id"], "update", "item", item_id, before_value=existing, after_value=updated)
    return updated

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Soft delete item"""
    item = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    if item:
        await db.items.update_one({"item_id": item_id}, {"$set": {"is_active": False}})
        await log_activity(item["company_id"], None, user["user_id"], "delete", "item", item_id)
    return {"message": "Item deactivated"}

# ======================= CATEGORY ENDPOINTS =======================

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

async def ensure_default_categories():
    count = await db.categories.count_documents({})
    if count == 0:
        docs = [CategoryBase(**cat).model_dump() for cat in DEFAULT_CATEGORIES]
        await db.categories.insert_many(docs)

async def ensure_default_departments():
    count = await db.departments.count_documents({})
    if count == 0:
        docs = [DepartmentBase(**dept).model_dump() for dept in DEFAULT_DEPARTMENTS]
        await db.departments.insert_many(docs)

@api_router.get("/categories")
async def list_categories(company_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List categories"""
    await ensure_default_categories()
    query = {}
    if user["role"] != "super_admin":
        cid = user.get("company_id")
        if cid:
            query["$or"] = [{"company_id": cid}, {"company_id": None}]
    elif company_id:
        query["$or"] = [{"company_id": company_id}, {"company_id": None}]
    
    categories = await db.categories.find(query, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories")
async def create_category(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Create a category"""
    category = CategoryBase(**data)
    cat_dict = category.model_dump()
    if not cat_dict.get("company_id") and user.get("company_id"):
        cat_dict["company_id"] = user["company_id"]
    await db.categories.insert_one(cat_dict)
    await log_activity(cat_dict.get("company_id"), None, user["user_id"], "create", "category", cat_dict["category_id"], after_value=cat_dict)
    return cat_dict

@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Update a category"""
    existing = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    data.pop("category_id", None)
    data.pop("created_at", None)
    await db.categories.update_one({"category_id": category_id}, {"$set": data})
    updated = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    await log_activity(existing.get("company_id"), None, user["user_id"], "update", "category", category_id, before_value=existing, after_value=updated)
    return updated

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Delete a category"""
    existing = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.categories.delete_one({"category_id": category_id})
    await log_activity(existing.get("company_id"), None, user["user_id"], "delete", "category", category_id, before_value=existing)
    return {"message": "Category deleted"}

# ======================= DEPARTMENT ENDPOINTS =======================

@api_router.get("/departments")
async def list_departments(company_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List departments"""
    await ensure_default_departments()
    query = {}
    if user["role"] != "super_admin":
        cid = user.get("company_id")
        if cid:
            query["$or"] = [{"company_id": cid}, {"company_id": None}]
    elif company_id:
        query["$or"] = [{"company_id": company_id}, {"company_id": None}]
    
    departments = await db.departments.find(query, {"_id": 0}).to_list(1000)
    return departments

@api_router.post("/departments")
async def create_department(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Create a department"""
    dept = DepartmentBase(**data)
    dept_dict = dept.model_dump()
    if not dept_dict.get("company_id") and user.get("company_id"):
        dept_dict["company_id"] = user["company_id"]
    await db.departments.insert_one(dept_dict)
    await log_activity(dept_dict.get("company_id"), None, user["user_id"], "create", "department", dept_dict["department_id"], after_value=dept_dict)
    return dept_dict

@api_router.put("/departments/{department_id}")
async def update_department(department_id: str, data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Update a department"""
    existing = await db.departments.find_one({"department_id": department_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Department not found")
    data.pop("department_id", None)
    data.pop("created_at", None)
    await db.departments.update_one({"department_id": department_id}, {"$set": data})
    updated = await db.departments.find_one({"department_id": department_id}, {"_id": 0})
    await log_activity(existing.get("company_id"), None, user["user_id"], "update", "department", department_id, before_value=existing, after_value=updated)
    return updated

@api_router.delete("/departments/{department_id}")
async def delete_department(department_id: str, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Delete a department"""
    existing = await db.departments.find_one({"department_id": department_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Department not found")
    await db.departments.delete_one({"department_id": department_id})
    await log_activity(existing.get("company_id"), None, user["user_id"], "delete", "department", department_id, before_value=existing)
    return {"message": "Department deleted"}

# ======================= VENDOR ENDPOINTS =======================

@api_router.get("/vendors")
async def list_vendors(company_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List vendors"""
    query = {"is_active": True}
    apply_company_scope(query, user, company_id)
    
    vendors = await db.vendors.find(query, {"_id": 0}).to_list(1000)
    return vendors

@api_router.post("/vendors")
async def create_vendor(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Create a new vendor"""
    # Super admin must specify company_id, others use their own
    if user["role"] == "super_admin":
        if not data.get("company_id"):
            raise HTTPException(status_code=400, detail="company_id is required for super_admin")
    else:
        data["company_id"] = user.get("company_id")
        if not data["company_id"]:
            raise HTTPException(status_code=400, detail="User has no company assigned")
    
    vendor = VendorBase(**data, created_by=user["user_id"])
    await db.vendors.insert_one(vendor.model_dump())
    await log_activity(vendor.company_id, None, user["user_id"], "create", "vendor", vendor.vendor_id, after_value=vendor.model_dump())
    return vendor.model_dump()

@api_router.put("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Update vendor"""
    existing = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    data.pop("vendor_id", None)
    data.pop("company_id", None)
    await db.vendors.update_one({"vendor_id": vendor_id}, {"$set": data})
    updated = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    await log_activity(existing["company_id"], None, user["user_id"], "update", "vendor", vendor_id, before_value=existing, after_value=updated)
    return updated

@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Soft delete vendor"""
    vendor = await db.vendors.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if vendor:
        await db.vendors.update_one({"vendor_id": vendor_id}, {"$set": {"is_active": False}})
        await log_activity(vendor["company_id"], None, user["user_id"], "delete", "vendor", vendor_id)
    return {"message": "Vendor deactivated"}

# ======================= STAFF ENDPOINTS =======================

@api_router.get("/staff")
async def list_staff(company_id: Optional[str] = None, outlet_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List staff"""
    query = {"is_active": True}
    apply_company_scope(query, user, company_id)
    apply_outlet_scope(query, user, outlet_id)
    
    staff = await db.staff.find(query, {"_id": 0}).to_list(1000)
    return staff

@api_router.post("/staff")
async def create_staff(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "outlet_manager"]))):
    """Create staff member"""
    data = enforce_write_scope(user, data, require_outlet=True)
    
    staff = StaffBase(**data, created_by=user["user_id"])
    await db.staff.insert_one(staff.model_dump())
    await log_activity(staff.company_id, staff.outlet_id, user["user_id"], "create", "staff", staff.staff_id, after_value=staff.model_dump())
    return staff.model_dump()

@api_router.get("/staff/{staff_id}")
async def get_staff(staff_id: str, user: dict = Depends(require_assigned_user)):
    """Get staff by ID"""
    staff = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    assert_company_access(user, staff.get("company_id"))
    assert_outlet_access(user, staff.get("outlet_id"))
    return staff

@api_router.put("/staff/{staff_id}")
async def update_staff(staff_id: str, data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "outlet_manager"]))):
    """Update staff"""
    existing = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Staff not found")
    assert_company_access(user, existing.get("company_id"))
    assert_outlet_access(user, existing.get("outlet_id"))
    
    data.pop("staff_id", None)
    data.pop("company_id", None)
    await db.staff.update_one({"staff_id": staff_id}, {"$set": data})
    updated = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    await log_activity(existing["company_id"], existing["outlet_id"], user["user_id"], "update", "staff", staff_id, before_value=existing, after_value=updated)
    return updated

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, user: dict = Depends(check_role(["super_admin", "company_admin", "outlet_manager"]))):
    """Soft delete staff"""
    staff = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    if staff:
        await db.staff.update_one({"staff_id": staff_id}, {"$set": {"is_active": False}})
        await log_activity(staff["company_id"], staff["outlet_id"], user["user_id"], "delete", "staff", staff_id)
    return {"message": "Staff deactivated"}

# ======================= INVENTORY ENDPOINTS =======================

async def update_inventory_stock(company_id: str, outlet_id: str, item_id: str, size: Optional[str], 
                                  action: str, quantity: int, unique_code: Optional[str] = None):
    """Update inventory stock automatically"""
    query = {"company_id": company_id, "outlet_id": outlet_id, "item_id": item_id}
    if size:
        query["size"] = size
    if unique_code:
        query["unique_code"] = unique_code
    
    inventory = await db.inventory.find_one(query, {"_id": 0})
    
    if not inventory:
        # Create new inventory record
        inventory = InventoryItemBase(
            company_id=company_id,
            outlet_id=outlet_id,
            item_id=item_id,
            size=size,
            unique_code=unique_code
        )
        await db.inventory.insert_one(inventory.model_dump())
    
    # Update based on action
    update_field = action.lower()
    if update_field not in ["received", "issued", "returned", "discarded", "lost"]:
        return
    
    await db.inventory.update_one(query, {"$inc": {update_field: quantity}})
    
    # Recalculate current stock
    updated = await db.inventory.find_one(query, {"_id": 0})
    if updated:
        current_stock = (
            updated.get("opening_stock", 0) +
            updated.get("received", 0) -
            updated.get("issued", 0) +
            updated.get("returned", 0) -
            updated.get("discarded", 0) -
            updated.get("lost", 0)
        )
        await db.inventory.update_one(query, {
            "$set": {"current_stock": current_stock, "last_updated": datetime.now(timezone.utc).isoformat()}
        })

@api_router.get("/inventory")
async def list_inventory(company_id: Optional[str] = None, outlet_id: Optional[str] = None, 
                         item_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List inventory"""
    query = scoped_query(user, company_id, outlet_id)
    
    if item_id:
        query["item_id"] = item_id
    
    inventory = await db.inventory.find(query, {"_id": 0}).to_list(10000)
    return inventory

@api_router.post("/inventory/opening-stock")
async def set_opening_stock(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "outlet_manager", "issuer"]))):
    """Set opening stock for an item"""
    data = enforce_write_scope(user, data, require_outlet=True)
    company_id = data.get("company_id")
    outlet_id = data.get("outlet_id")
    item_id = data.get("item_id")
    size = data.get("size")
    opening_stock = data.get("opening_stock", 0)
    
    if not outlet_id or not item_id:
        raise HTTPException(status_code=400, detail="outlet_id and item_id are required")
    
    query = {"company_id": company_id, "outlet_id": outlet_id, "item_id": item_id}
    if size:
        query["size"] = size
    
    existing = await db.inventory.find_one(query, {"_id": 0})
    
    if existing:
        await db.inventory.update_one(query, {"$set": {"opening_stock": opening_stock}})
    else:
        inv = InventoryItemBase(
            company_id=company_id,
            outlet_id=outlet_id,
            item_id=item_id,
            size=size,
            opening_stock=opening_stock,
            current_stock=opening_stock
        )
        await db.inventory.insert_one(inv.model_dump())
    
    # Recalculate
    inv = await db.inventory.find_one(query, {"_id": 0})
    if inv:
        current_stock = (
            inv.get("opening_stock", 0) +
            inv.get("received", 0) -
            inv.get("issued", 0) +
            inv.get("returned", 0) -
            inv.get("discarded", 0) -
            inv.get("lost", 0)
        )
        await db.inventory.update_one(query, {"$set": {"current_stock": current_stock}})
    
    updated = await db.inventory.find_one(query, {"_id": 0})
    return updated

# ======================= GRN (STOCK RECEIVE) ENDPOINTS =======================

@api_router.get("/grn")
async def list_grn(company_id: Optional[str] = None, outlet_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List GRN entries"""
    query = scoped_query(user, company_id, outlet_id)
    
    grn_list = await db.grn.find(query, {"_id": 0}).sort("received_at", -1).to_list(1000)
    return grn_list

@api_router.post("/grn")
async def create_grn(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "outlet_manager", "issuer"]))):
    """Create GRN entry and update inventory"""
    data = enforce_write_scope(user, data, require_outlet=True)
    
    data["received_by"] = user["user_id"]
    grn = GRNBase(**data)
    
    # Calculate totals
    total_qty = 0
    total_val = 0.0
    
    for item in grn.items:
        qty = item.get("quantity", 0)
        total_qty += qty
        
        # Get item cost
        item_doc = await db.items.find_one({"item_id": item["item_id"]}, {"_id": 0})
        if item_doc:
            total_val += qty * item_doc.get("cost_per_unit", 0)
        
        # Update inventory
        await update_inventory_stock(
            grn.company_id, grn.outlet_id, item["item_id"],
            item.get("size"), "received", qty
        )
    
    grn.total_quantity = total_qty
    grn.total_value = total_val
    
    await db.grn.insert_one(grn.model_dump())
    await log_activity(grn.company_id, grn.outlet_id, user["user_id"], "create", "grn", grn.grn_id, after_value=grn.model_dump())
    
    return grn.model_dump()

@api_router.get("/grn/{grn_id}")
async def get_grn(grn_id: str, user: dict = Depends(require_assigned_user)):
    """Get GRN by ID"""
    grn = await db.grn.find_one({"grn_id": grn_id}, {"_id": 0})
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")
    assert_company_access(user, grn.get("company_id"))
    assert_outlet_access(user, grn.get("outlet_id"))
    return grn

# ======================= ISSUE ENDPOINTS =======================

@api_router.get("/issues")
async def list_issues(company_id: Optional[str] = None, outlet_id: Optional[str] = None, 
                      staff_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List issues"""
    query = scoped_query(user, company_id, outlet_id)
    
    if staff_id:
        query["staff_id"] = staff_id
    
    issues = await db.issues.find(query, {"_id": 0}).sort("issued_at", -1).to_list(1000)
    return issues

@api_router.post("/issues")
async def create_issue(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "outlet_manager", "issuer"]))):
    """Create issue and update inventory"""
    data = enforce_write_scope(user, data, require_outlet=True)
    
    data["issued_by"] = user["user_id"]
    issue = IssueBase(**data)
    
    # Calculate totals and check stock
    total_items = 0
    total_val = 0.0
    
    for item in issue.items:
        qty = item.get("quantity", 0)
        
        # Check stock availability
        inv_query = {
            "company_id": issue.company_id,
            "outlet_id": issue.outlet_id,
            "item_id": item["item_id"]
        }
        if item.get("size"):
            inv_query["size"] = item["size"]
        
        inventory = await db.inventory.find_one(inv_query, {"_id": 0})
        if not inventory or inventory.get("current_stock", 0) < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for item {item['item_id']}")
        
        total_items += qty
        
        # Get item cost
        item_doc = await db.items.find_one({"item_id": item["item_id"]}, {"_id": 0})
        if item_doc:
            total_val += qty * item_doc.get("cost_per_unit", 0)
        
        # Update inventory
        await update_inventory_stock(
            issue.company_id, issue.outlet_id, item["item_id"],
            item.get("size"), "issued", qty
        )
    
    issue.total_items = total_items
    issue.total_value = total_val
    
    await db.issues.insert_one(issue.model_dump())
    await log_activity(issue.company_id, issue.outlet_id, user["user_id"], "create", "issue", issue.issue_id, after_value=issue.model_dump())
    
    return issue.model_dump()

@api_router.get("/issues/{issue_id}")
async def get_issue(issue_id: str, user: dict = Depends(require_assigned_user)):
    """Get issue by ID"""
    issue = await db.issues.find_one({"issue_id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    assert_company_access(user, issue.get("company_id"))
    assert_outlet_access(user, issue.get("outlet_id"))
    return issue

# ======================= RETURN ENDPOINTS =======================

@api_router.get("/returns")
async def list_returns(company_id: Optional[str] = None, outlet_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List returns"""
    query = scoped_query(user, company_id, outlet_id)
    
    returns = await db.returns.find(query, {"_id": 0}).sort("returned_at", -1).to_list(1000)
    return returns

@api_router.post("/returns")
async def create_return(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "outlet_manager", "issuer"]))):
    """Create return and update inventory"""
    data = enforce_write_scope(user, data, require_outlet=True)
    
    data["received_by"] = user["user_id"]
    return_entry = ReturnBase(**data)
    
    total_items = 0
    for item in return_entry.items:
        qty = item.get("quantity", 0)
        total_items += qty
        
        # Update inventory
        await update_inventory_stock(
            return_entry.company_id, return_entry.outlet_id, item["item_id"],
            item.get("size"), "returned", qty
        )
    
    return_entry.total_items = total_items
    
    await db.returns.insert_one(return_entry.model_dump())
    await log_activity(return_entry.company_id, return_entry.outlet_id, user["user_id"], "create", "return", return_entry.return_id, after_value=return_entry.model_dump())
    
    return return_entry.model_dump()

# ======================= DISCARD/LOST ENDPOINTS =======================

@api_router.get("/discard-lost")
async def list_discard_lost(company_id: Optional[str] = None, outlet_id: Optional[str] = None, 
                            record_type: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List discard/lost records"""
    query = scoped_query(user, company_id, outlet_id)
    
    if record_type:
        query["type"] = record_type
    
    records = await db.discard_lost.find(query, {"_id": 0}).sort("recorded_at", -1).to_list(1000)
    return records

@api_router.post("/discard-lost")
async def create_discard_lost(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "outlet_manager", "issuer"]))):
    """Create discard/lost record and update inventory"""
    data = enforce_write_scope(user, data, require_outlet=True)
    
    data["recorded_by"] = user["user_id"]
    record = DiscardLostBase(**data)
    
    # Get item cost
    item_doc = await db.items.find_one({"item_id": record.item_id}, {"_id": 0})
    if item_doc:
        record.cost_value = record.quantity * item_doc.get("cost_per_unit", 0)
    
    # Update inventory
    action = "discarded" if record.type == "discard" else "lost"
    await update_inventory_stock(
        record.company_id, record.outlet_id, record.item_id,
        record.size, action, record.quantity
    )
    
    # Flag staff if lost
    if record.type == "lost" and record.staff_id:
        await db.staff.update_one(
            {"staff_id": record.staff_id},
            {"$set": {"is_flagged": True, "flag_reason": record.reason}}
        )
    
    await db.discard_lost.insert_one(record.model_dump())
    await log_activity(record.company_id, record.outlet_id, user["user_id"], "create", "discard_lost", record.record_id, after_value=record.model_dump())
    
    return record.model_dump()

# ======================= TEMPLATE ENDPOINTS =======================

@api_router.get("/templates")
async def list_templates(scope: Optional[str] = None, company_id: Optional[str] = None, 
                         outlet_id: Optional[str] = None, user: dict = Depends(require_assigned_user)):
    """List templates"""
    query = {"is_active": True}
    
    # Build query based on scope access
    if scope:
        query["scope"] = scope
    
    if user["role"] != "super_admin":
        # Non-super admins see global + their company + their assigned outlet templates
        company_query = user.get("company_id")
        query["$or"] = [
            {"scope": "global"},
            {"scope": "company", "company_id": company_query},
        ]
        if user.get("role") in OUTLET_SCOPED_ROLES:
            query["$or"].append({"scope": "outlet", "outlet_id": {"$in": assigned_outlets(user)}})
    elif company_id:
        query["$or"] = [
            {"scope": "global"},
            {"scope": "company", "company_id": company_id},
        ]
        if outlet_id:
            query["$or"].append({"scope": "outlet", "outlet_id": outlet_id})
    
    templates = await db.templates.find(query, {"_id": 0}).to_list(1000)
    return templates

@api_router.post("/templates")
async def create_template(data: dict, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Create template"""
    scope = data.get("scope", "company")
    
    if scope == "global" and user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can create global templates")
    
    if scope == "company" and user["role"] != "super_admin":
        data["company_id"] = user["company_id"]
    
    if scope == "outlet":
        raise HTTPException(status_code=403, detail="Outlet template override is not allowed")
    
    data["created_by"] = user["user_id"]
    template = FormTemplateBase(**data)
    await db.templates.insert_one(template.model_dump())
    await log_activity(template.company_id, template.outlet_id, user["user_id"], "create", "template", template.template_id, after_value=template.model_dump())
    
    return template.model_dump()

@api_router.get("/templates/{template_id}")
async def get_template(template_id: str, user: dict = Depends(require_assigned_user)):
    """Get template by ID"""
    template = await db.templates.find_one({"template_id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.put("/templates/{template_id}")
async def update_template(template_id: str, data: dict, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Update template"""
    existing = await db.templates.find_one({"template_id": template_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check permissions
    if existing["scope"] == "global" and user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can edit global templates")
    
    data.pop("template_id", None)
    data.pop("created_at", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.templates.update_one({"template_id": template_id}, {"$set": data})
    updated = await db.templates.find_one({"template_id": template_id}, {"_id": 0})
    await log_activity(existing.get("company_id"), existing.get("outlet_id"), user["user_id"], "update", "template", template_id, before_value=existing, after_value=updated)
    
    return updated

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(check_role(["super_admin", "company_admin"]))):
    """Soft delete template"""
    template = await db.templates.find_one({"template_id": template_id}, {"_id": 0})
    if template:
        if template["scope"] == "global" and user["role"] != "super_admin":
            raise HTTPException(status_code=403, detail="Only super admin can delete global templates")
        await db.templates.update_one({"template_id": template_id}, {"$set": {"is_active": False}})
        await log_activity(template.get("company_id"), template.get("outlet_id"), user["user_id"], "delete", "template", template_id)
    return {"message": "Template deactivated"}

# ======================= ACTIVITY LOG ENDPOINTS =======================

@api_router.get("/activity-logs")
async def list_activity_logs(company_id: Optional[str] = None, outlet_id: Optional[str] = None,
                              entity_type: Optional[str] = None, limit: int = 100,
                              user: dict = Depends(check_role(["super_admin", "company_admin", "auditor"]))):
    """List activity logs"""
    query = scoped_query(user, company_id, outlet_id)
    
    if entity_type:
        query["entity_type"] = entity_type
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("logged_at", -1).to_list(limit)
    return logs

# ======================= REPORTS & DASHBOARD ENDPOINTS =======================

@api_router.get("/dashboard/super-admin")
async def super_admin_dashboard(user: dict = Depends(check_role(["super_admin"]))):
    """Super admin dashboard data"""
    company_count = await db.companies.count_documents({"is_active": True})
    outlet_count = await db.outlets.count_documents({"is_active": True})
    user_count = await db.users.count_documents({"is_active": True})
    
    # Total inventory value
    pipeline = [
        {"$lookup": {"from": "items", "localField": "item_id", "foreignField": "item_id", "as": "item_info"}},
        {"$unwind": {"path": "$item_info", "preserveNullAndEmptyArrays": True}},
        {"$project": {"value": {"$multiply": ["$current_stock", {"$ifNull": ["$item_info.cost_per_unit", 0]}]}}},
        {"$group": {"_id": None, "total_value": {"$sum": "$value"}}}
    ]
    value_result = await db.inventory.aggregate(pipeline).to_list(1)
    total_value = value_result[0]["total_value"] if value_result else 0
    
    # Low stock alerts
    low_stock = await db.inventory.find({"current_stock": {"$lt": 5}}, {"_id": 0}).to_list(100)
    
    # Recent activity
    recent_activity = await db.activity_logs.find({}, {"_id": 0}).sort("logged_at", -1).to_list(10)
    
    return {
        "company_count": company_count,
        "outlet_count": outlet_count,
        "user_count": user_count,
        "total_inventory_value": total_value,
        "low_stock_alerts": len(low_stock),
        "low_stock_items": low_stock[:5],
        "recent_activity": recent_activity
    }

@api_router.get("/dashboard/company-admin")
async def company_admin_dashboard(user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager"]))):
    """Company admin dashboard data"""
    company_id = user.get("company_id")
    if not company_id and user["role"] == "super_admin":
        # Return aggregate for all
        company_id = None
    
    query = {}
    if company_id:
        query["company_id"] = company_id
    
    outlet_count = await db.outlets.count_documents({**query, "is_active": True})
    staff_count = await db.staff.count_documents({**query, "is_active": True})
    item_count = await db.items.count_documents({**query, "is_active": True})
    
    # Issues today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    issues_today = await db.issues.count_documents({**query, "issued_at": {"$gte": today_start.isoformat()}})
    returns_today = await db.returns.count_documents({**query, "returned_at": {"$gte": today_start.isoformat()}})
    
    # Lost/damaged this month
    month_start = today_start.replace(day=1)
    lost_damaged = await db.discard_lost.count_documents({**query, "recorded_at": {"$gte": month_start.isoformat()}})
    
    # Outlet-wise stock summary
    outlet_stock = await db.inventory.aggregate([
        {"$match": query} if query else {"$match": {}},
        {"$group": {"_id": "$outlet_id", "total_stock": {"$sum": "$current_stock"}}}
    ]).to_list(100)
    
    return {
        "outlet_count": outlet_count,
        "staff_count": staff_count,
        "item_count": item_count,
        "issues_today": issues_today,
        "returns_today": returns_today,
        "lost_damaged_this_month": lost_damaged,
        "outlet_stock_summary": outlet_stock
    }

@api_router.get("/dashboard/issuer")
async def issuer_dashboard(user: dict = Depends(require_assigned_user)):
    """Issuer dashboard data"""
    query = scoped_query(user)
    
    # Today's activity
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    issues_today = await db.issues.find({**query, "issued_at": {"$gte": today_start.isoformat()}}, {"_id": 0}).to_list(100)
    returns_today = await db.returns.find({**query, "returned_at": {"$gte": today_start.isoformat()}}, {"_id": 0}).to_list(100)
    
    # Low stock items
    low_stock_query = {**query, "current_stock": {"$lt": 5}}
    low_stock = await db.inventory.find(low_stock_query, {"_id": 0}).to_list(50)
    
    return {
        "issues_today": issues_today,
        "issues_today_count": len(issues_today),
        "returns_today": returns_today,
        "returns_today_count": len(returns_today),
        "low_stock_items": low_stock,
        "low_stock_count": len(low_stock)
    }

@api_router.get("/reports/stock-summary")
async def stock_summary_report(company_id: Optional[str] = None, outlet_id: Optional[str] = None,
                                user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "auditor"]))):
    """Stock summary report"""
    query = scoped_query(user, company_id, outlet_id)
    
    inventory = await db.inventory.find(query, {"_id": 0}).to_list(10000)
    
    # Enrich with item names
    for inv in inventory:
        item = await db.items.find_one({"item_id": inv["item_id"]}, {"_id": 0, "item_name": 1, "category": 1})
        if item:
            inv["item_name"] = item.get("item_name")
            inv["category"] = item.get("category")
    
    return inventory

@api_router.get("/reports/issue-return")
async def issue_return_report(company_id: Optional[str] = None, outlet_id: Optional[str] = None,
                               start_date: Optional[str] = None, end_date: Optional[str] = None,
                               user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "auditor"]))):
    """Issue vs Return report"""
    query = scoped_query(user, company_id, outlet_id)
    
    if start_date:
        query["$or"] = [{"issued_at": {"$gte": start_date}}, {"returned_at": {"$gte": start_date}}]
    
    issues = await db.issues.find(query, {"_id": 0}).to_list(10000)
    returns = await db.returns.find(query, {"_id": 0}).to_list(10000)
    
    return {
        "issues": issues,
        "returns": returns,
        "total_issued": sum(i.get("total_items", 0) for i in issues),
        "total_returned": sum(r.get("total_items", 0) for r in returns)
    }

@api_router.get("/reports/staff-outstanding")
async def staff_outstanding_report(company_id: Optional[str] = None, outlet_id: Optional[str] = None,
                                    user: dict = Depends(check_role(["super_admin", "company_admin", "company_manager", "auditor"]))):
    """Staff outstanding items report"""
    query = scoped_query(user, company_id, outlet_id)
    
    # Aggregate issues and returns by staff
    pipeline = [
        {"$match": query} if query else {"$match": {}},
        {"$group": {"_id": "$staff_id", "total_issued": {"$sum": "$total_items"}}}
    ]
    issues_by_staff = await db.issues.aggregate(pipeline).to_list(1000)
    
    returns_pipeline = [
        {"$match": query} if query else {"$match": {}},
        {"$group": {"_id": "$staff_id", "total_returned": {"$sum": "$total_items"}}}
    ]
    returns_by_staff = await db.returns.aggregate(returns_pipeline).to_list(1000)
    
    # Calculate outstanding
    returns_map = {r["_id"]: r["total_returned"] for r in returns_by_staff}
    outstanding = []
    
    for issue in issues_by_staff:
        staff_id = issue["_id"]
        issued = issue["total_issued"]
        returned = returns_map.get(staff_id, 0)
        
        if issued > returned:
            staff = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
            outstanding.append({
                "staff_id": staff_id,
                "staff_name": staff.get("name") if staff else "Unknown",
                "total_issued": issued,
                "total_returned": returned,
                "outstanding": issued - returned
            })
    
    return outstanding

# ======================= HEALTH CHECK =======================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) or "Internal server error"},
    )

# Include router
app.include_router(api_router)

# CORS middleware
origins_raw = os.environ.get('CORS_ORIGINS', '').split(',')
allowed_origins = [o.strip() for o in origins_raw if o.strip() and o.strip() != '*']

default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
for origin in default_origins:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
