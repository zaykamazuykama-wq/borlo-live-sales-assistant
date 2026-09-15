from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from itertools import combinations
import hashlib
import json
import os
import uuid
import re
import bcrypt
import jwt
import logging
import requests
from urllib.parse import urlencode

# ---------------------- Setup ----------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TTL_HOURS = 24 * 7  # 7 days for demo

app = FastAPI(title="Live Shop Manager")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("liveshop")

# ---------------------- Models ----------------------
class Shop(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Variant(BaseModel):
    color: str
    size: str
    stock: int = 0

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    productCode: str
    productName: str
    price: float
    category: str
    description: Optional[str] = ""
    image: Optional[str] = ""
    variants: List[Variant] = []
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    productCode: str
    productName: str
    price: float
    category: str
    description: Optional[str] = ""
    image: Optional[str] = ""
    variants: List[Variant] = []

class LiveSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    activeProductIds: List[str] = []
    status: str = "active"  # active | ended
    holdMinutes: int = 15
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LiveSessionCreate(BaseModel):
    name: str
    activeProductIds: List[str] = []
    holdMinutes: int = 15

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sessionId: Optional[str] = None
    buyerName: str
    phone: Optional[str] = ""
    productId: Optional[str] = None
    productCode: str
    productName: Optional[str] = ""
    color: Optional[str] = ""
    size: Optional[str] = ""
    quantity: int = 1
    unitPrice: float = 0
    amount: float = 0
    status: str = "pending"  # pending|paid|cancelled|review|underpaid|overpaid|packed|expired
    reservedUntil: Optional[str] = None
    note: Optional[str] = ""
    rawComment: Optional[str] = ""
    commentTime: Optional[str] = None
    customerId: Optional[str] = None
    customerStatus: Optional[str] = "normal"
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyerName: str
    phone: Optional[str] = ""
    status: str = "normal"  # normal | watchlist | blacklisted
    reason: Optional[str] = ""
    notes: Optional[str] = ""
    noShowCount: int = 0
    cancelledCount: int = 0
    unpaidCount: int = 0
    lastOrderAt: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CustomerStatusChange(BaseModel):
    buyerName: Optional[str] = None
    phone: Optional[str] = None
    customerId: Optional[str] = None
    reason: Optional[str] = ""
    notes: Optional[str] = ""


class CustomerUpdate(BaseModel):
    buyerName: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None

class OrderCreate(BaseModel):
    sessionId: Optional[str] = None
    buyerName: str
    phone: Optional[str] = ""
    productCode: str
    color: Optional[str] = ""
    size: Optional[str] = ""
    quantity: int = 1

class OrderUpdate(BaseModel):
    status: Optional[str] = None
    phone: Optional[str] = None
    note: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    quantity: Optional[int] = None
    reservedUntil: Optional[str] = None

class CommentParseRequest(BaseModel):
    sessionId: str
    text: str

class PaymentEvent(BaseModel):
    buyerName: str
    phone: Optional[str] = ""
    amount: float
    note: Optional[str] = ""

class FacebookCommentsRequest(BaseModel):
    pageId: str
    postId: str
    sessionId: str
    limit: int = 50

class GmailSyncRequest(BaseModel):
    query: Optional[str] = None
    maxResults: int = 10

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ---------------------- Auth helpers ----------------------
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------------------- Comment Parser ----------------------
COLOR_MAP = {
    # Mongolian -> normalized english label
    "хар": "Хар", "хөх": "Хөх", "цэнхэр": "Цэнхэр", "улаан": "Улаан", "шар": "Шар",
    "ногоон": "Ногоон", "ягаан": "Ягаан", "цагаан": "Цагаан", "саарал": "Саарал",
    "хүрэн": "Хүрэн", "ягаавтар": "Ягаан", "нил": "Нил", "алтан": "Алтан",
    # English
    "black": "Хар", "white": "Цагаан", "red": "Улаан", "blue": "Хөх",
    "green": "Ногоон", "yellow": "Шар", "pink": "Ягаан", "gray": "Саарал",
    "grey": "Саарал", "brown": "Хүрэн", "navy": "Нил",
}

SIZE_WORDS = {
    "small": "S", "medium": "M", "large": "L", "extra": "XL",
    "жижиг": "S", "дунд": "M", "том": "L",
}
SIZE_TOKENS = {"XXS","XS","S","M","L","XL","XXL","3XL","4XL","5XL","6XL"}

def parse_one_comment(line: str) -> dict:
    raw = line.strip()
    if not raw:
        return None
    lower = raw.lower()

    # Product code: letters+digits  (A12, B01, C03, AB12)
    code_match = re.search(r"\b([A-Za-zА-Яа-я]{1,3}\d{1,4})\b", raw)
    product_code = code_match.group(1).upper() if code_match else None

    # Quantity: number followed by авъя/авна/ширхэг or trailing number
    qty = 1
    qty_match = re.search(r"(\d+)\s*(?:ш|ширхэг|pcs?|авъя|авна|x)", lower)
    if qty_match:
        try:
            qty = max(1, int(qty_match.group(1)))
        except Exception:
            qty = 1
    else:
        # last standalone number that isn't the product code numeric part
        nums = re.findall(r"\b(\d{1,3})\b", lower)
        # remove the product code's digits
        if product_code:
            code_digits = re.search(r"\d+", product_code).group(0)
            nums = [n for n in nums if n != code_digits]
        # numeric size detection: 26-46 pants / 34-52 / 35-45 shoes / kids 80-160
        # Heuristic: if a number 20-160 appears alone, it's size unless explicitly "qty"
        size_num = None
        leftover = []
        for n in nums:
            v = int(n)
            if 20 <= v <= 170:
                size_num = n
            elif v <= 20:
                leftover.append(n)
        if leftover:
            try:
                qty = max(1, int(leftover[-1]))
            except Exception:
                pass

    # Re-extract numeric size
    numeric_size = None
    for n in re.findall(r"\b(\d{1,3})\b", lower):
        # Skip product code digits
        if product_code and n in product_code.lower():
            continue
        v = int(n)
        if 20 <= v <= 170:
            numeric_size = n
            break

    # Color
    color = ""
    for word, norm in COLOR_MAP.items():
        if re.search(r"\b" + re.escape(word) + r"\b", lower):
            color = norm
            break

    # Size letters
    size = ""
    if numeric_size:
        size = numeric_size
    else:
        # Look for size token (case-insensitive)
        tokens = re.findall(r"\b([A-Za-z]{1,4})\b", raw)
        for t in tokens:
            tu = t.upper()
            if tu in SIZE_TOKENS:
                size = tu
                break
        if not size:
            for word, sz in SIZE_WORDS.items():
                if word in lower:
                    size = sz
                    break

    # Buyer name (very rough): everything before the first product code or 1st 2 words
    buyer = ""
    if code_match:
        before = raw[:code_match.start()].strip(":,;-.")
        buyer = before.strip()
    if not buyer:
        # fallback: first word
        words = raw.split()
        buyer = words[0] if words else "Зочин"

    return {
        "buyerName": buyer or "Зочин",
        "productCode": product_code or "",
        "color": color,
        "size": size,
        "quantity": qty,
        "rawComment": raw,
        "commentTime": datetime.now(timezone.utc).isoformat(),
    }


def parse_one_line_multi(line: str) -> List[dict]:
    """Parse a single comment that may contain multiple product items.
    Example: 'Болор A12 хар M 1, C01 хар 34 1 авъя' -> 2 items, shared buyer 'Болор'.
    """
    raw = line.strip()
    if not raw:
        return []

    code_re = re.compile(r"\b([A-Za-zА-Яа-я]{1,3}\d{1,4})\b")
    code_matches = list(code_re.finditer(raw))

    if not code_matches:
        single = parse_one_comment(raw)
        return [single] if single else []

    # Buyer name = text before first code (fallback first word)
    buyer_text = raw[: code_matches[0].start()].strip(" :,;-.\t")
    if buyer_text:
        buyer = buyer_text.strip()
    else:
        words = raw.split()
        buyer = words[0] if words else "Зочин"

    if len(code_matches) == 1:
        single = parse_one_comment(raw)
        if single:
            single["buyerName"] = buyer
            return [single]
        return []

    items: List[dict] = []
    for i, m in enumerate(code_matches):
        start = m.start()
        end = code_matches[i + 1].start() if i + 1 < len(code_matches) else len(raw)
        segment = raw[start:end]
        parsed = parse_one_comment(segment)
        if parsed:
            parsed["buyerName"] = buyer
            parsed["rawComment"] = raw
            items.append(parsed)
    return items


# ---------------------- Stock helpers ----------------------
async def reserve_stock(product: dict, color: str, size: str, qty: int) -> bool:
    for v in product.get("variants", []):
        if v["color"].lower() == (color or "").lower() and str(v["size"]).lower() == str(size or "").lower():
            if v["stock"] >= qty:
                v["stock"] -= qty
                await db.products.update_one(
                    {"id": product["id"]}, {"$set": {"variants": product["variants"]}}
                )
                return True
            return False
    return False

async def _reserve_order_until(order_doc: dict, shop_id: str, session_id: Optional[str]) -> None:
    minutes = 15
    if session_id:
        session = await db.sessions.find_one(
            {"id": session_id, "shopId": shop_id}, {"holdMinutes": 1, "_id": 0}
        )
        if session and isinstance(session.get("holdMinutes"), int):
            minutes = session["holdMinutes"]
    order_doc["reservedUntil"] = (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()

async def release_stock(product_id: str, color: str, size: str, qty: int):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return
    found = False
    for v in product.get("variants", []):
        if v["color"].lower() == (color or "").lower() and str(v["size"]).lower() == str(size or "").lower():
            v["stock"] += qty
            found = True
            break
    if not found:
        product.setdefault("variants", []).append({"color": color, "size": size, "stock": qty})
    await db.products.update_one({"id": product_id}, {"$set": {"variants": product["variants"]}})


# ---------------------- Customer helpers ----------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _shop_q(user: dict) -> dict:
    """Return a Mongo filter that scopes a query to the user's shop."""
    return {"shopId": user["shopId"]}


def _dedupe_key(*parts) -> str:
    """sha256 hex digest of pipe-joined parts (used for payment dedupe)."""
    raw = "|".join(str(p or "") for p in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def audit_log(user: dict, action: str, entityType: str, entityId: str = "",
                    reason: str = "", metadata: Optional[Dict[str, Any]] = None):
    """Append an immutable audit log entry. Never throws."""
    try:
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "shopId": user.get("shopId") if user else None,
            "userId": user.get("id") if user else None,
            "action": action,
            "entityType": entityType,
            "entityId": entityId or "",
            "reason": reason or "",
            "metadata": metadata or {},
            "timestamp": _now_iso(),
        })
    except Exception as e:
        logger.warning("audit_log failed: %s", e)


def _integration_configured(kind: str) -> bool:
    if kind == "gmail":
        return all(os.environ.get(k) for k in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"))
    if kind == "facebook":
        return all(os.environ.get(k) for k in ("FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET", "FACEBOOK_REDIRECT_URI"))
    return False


async def _integration_token(shop_id: str, provider: str) -> Optional[dict]:
    return await db.integration_tokens.find_one({"shopId": shop_id, "provider": provider}, {"_id": 0})


async def _set_integration_status(shop_id: str, provider: str, status: str, error: str = ""):
    await db.integration_status.update_one(
        {"shopId": shop_id, "provider": provider},
        {"$set": {"status": status, "error": error, "lastSyncAt": _now_iso()}},
        upsert=True,
    )


def _oauth_state_doc(user: dict, provider: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "provider": provider,
        "shopId": user["shopId"],
        "userId": user["id"],
        "createdAt": _now_iso(),
    }


def _parse_payment_candidate(text: str, sender: str = "", paid_at: str = "", source_id: str = "") -> Optional[dict]:
    raw = " ".join((text or "").split())
    amount_match = re.search(r"(?<!\d)(\d{1,3}(?:[,\s]\d{3})+|\d{4,9})(?:\s*(?:₮|MNT|төг|tugrug))?", raw, re.I)
    if not amount_match:
        return None
    amount = float(re.sub(r"[^\d.]", "", amount_match.group(1)) or 0)
    if amount <= 0:
        return None
    phone_match = re.search(r"\b([89]\d{7})\b", raw)
    sender_name = re.sub(r"<.*?>", "", sender or "").strip().strip('"')
    before_amount = raw[:amount_match.start()].strip(" -:,.")
    buyer_name = before_amount.split()[-1] if before_amount else sender_name
    return {
        "buyerName": buyer_name or "Unknown",
        "phone": phone_match.group(1) if phone_match else "",
        "amount": amount,
        "paidAt": paid_at or "",
        "rawSnippet": raw[:500],
        "sourceId": source_id,
        "sender": sender_name,
    }


async def find_customer(shop_id: str, phone: str = "", buyerName: str = "") -> Optional[dict]:
    """Lookup customer in a single shop: phone first, name fallback."""
    phone = (phone or "").strip()
    if phone:
        c = await db.customers.find_one({"shopId": shop_id, "phone": phone}, {"_id": 0})
        if c:
            return c
    name = (buyerName or "").strip()
    if name:
        return await db.customers.find_one({"shopId": shop_id, "buyerName": name}, {"_id": 0})
    return None


async def get_or_create_customer(shop_id: str, buyerName: str, phone: str = "") -> dict:
    existing = await find_customer(shop_id, phone=phone, buyerName=buyerName)
    if existing:
        if phone and not existing.get("phone"):
            await db.customers.update_one(
                {"id": existing["id"]}, {"$set": {"phone": phone, "updatedAt": _now_iso()}}
            )
            existing["phone"] = phone
        return existing
    new_c = Customer(buyerName=(buyerName or "Зочин").strip(), phone=(phone or "").strip()).model_dump()
    new_c["shopId"] = shop_id
    new_c["lastOrderAt"] = _now_iso()
    await db.customers.insert_one(new_c)
    return new_c


async def touch_customer(customer_id: str, **inc_fields):
    """Update lastOrderAt and optionally increment counters."""
    update = {"$set": {"lastOrderAt": _now_iso(), "updatedAt": _now_iso()}}
    if inc_fields:
        update["$inc"] = inc_fields
    await db.customers.update_one({"id": customer_id}, update)



# ---------------------- AUTH endpoints ----------------------
@api.post("/auth/register")
async def register(payload: UserRegister):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    # Each new registration creates its own shop (multi-tenant isolation)
    shop_id = str(uuid.uuid4())
    name = payload.name or email.split("@")[0]
    await db.shops.insert_one({"id": shop_id, "name": f"{name}'s Shop", "createdAt": _now_iso()})
    user_doc = {
        "id": user_id,
        "email": email,
        "name": name,
        "shopId": shop_id,
        "password_hash": hash_pw(payload.password),
        "role": "seller",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "email": email, "name": name, "role": "seller", "shopId": shop_id},
    }

@api.post("/auth/login")
async def login(payload: UserLogin):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name"), "role": user.get("role", "seller"), "shopId": user.get("shopId")},
    }

@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return current


# ---------------------- PRODUCT endpoints ----------------------
@api.get("/products", response_model=List[Product])
async def list_products(current=Depends(get_current_user)):
    return await db.products.find(_shop_q(current), {"_id": 0}).to_list(2000)

@api.post("/products", response_model=Product)
async def create_product(payload: ProductCreate, current=Depends(get_current_user)):
    existing = await db.products.find_one({"shopId": current["shopId"], "productCode": payload.productCode}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Product code already exists")
    p = Product(**payload.model_dump())
    doc = p.model_dump()
    doc["shopId"] = current["shopId"]
    await db.products.insert_one(doc)
    await audit_log(current, "product_created", "product", p.id, metadata={"productCode": p.productCode})
    return await db.products.find_one({"id": p.id}, {"_id": 0})

@api.put("/products/{pid}", response_model=Product)
async def update_product(pid: str, payload: ProductCreate, current=Depends(get_current_user)):
    existing = await db.products.find_one({"id": pid, "shopId": current["shopId"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    update = payload.model_dump()
    await db.products.update_one({"id": pid, "shopId": current["shopId"]}, {"$set": update})
    await audit_log(current, "product_updated", "product", pid)
    return await db.products.find_one({"id": pid}, {"_id": 0})

@api.delete("/products/{pid}")
async def delete_product(pid: str, current=Depends(get_current_user)):
    res = await db.products.delete_one({"id": pid, "shopId": current["shopId"]})
    if res.deleted_count:
        await audit_log(current, "product_deleted", "product", pid)
    return {"deleted": res.deleted_count}


# ---------------------- LIVE SESSION endpoints ----------------------
@api.get("/sessions", response_model=List[LiveSession])
async def list_sessions(current=Depends(get_current_user)):
    return await db.sessions.find(_shop_q(current), {"_id": 0}).sort("createdAt", -1).to_list(500)

@api.post("/sessions", response_model=LiveSession)
async def create_session(payload: LiveSessionCreate, current=Depends(get_current_user)):
    s = LiveSession(**payload.model_dump())
    doc = s.model_dump()
    doc["shopId"] = current["shopId"]
    await db.sessions.insert_one(doc)
    await audit_log(current, "session_created", "session", s.id, metadata={"name": s.name})
    return s

@api.put("/sessions/{sid}/end")
async def end_session(sid: str, current=Depends(get_current_user)):
    res = await db.sessions.update_one({"id": sid, "shopId": current["shopId"]}, {"$set": {"status": "ended"}})
    if res.matched_count:
        await audit_log(current, "session_ended", "session", sid)
    return {"ok": True}

@api.post("/sessions/parse")
async def parse_comments(payload: CommentParseRequest, current=Depends(get_current_user)):
    """Parse pasted comments, create Orders. Returns created list."""
    session = await db.sessions.find_one({"id": payload.sessionId, "shopId": current["shopId"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    lines = [l for l in payload.text.splitlines() if l.strip()]
    created: List[dict] = []
    shop_id = current["shopId"]

    for line in lines:
        items = parse_one_line_multi(line)
        if not items:
            continue

        buyer_name = items[0].get("buyerName") or "Зочин"
        customer = await get_or_create_customer(shop_id, buyer_name, "")
        await touch_customer(customer["id"])
        cust_status = customer.get("status", "normal")

        for parsed in items:
            order_doc = None
            if not parsed.get("productCode"):
                order = Order(
                    sessionId=payload.sessionId,
                    buyerName=buyer_name,
                    productCode="",
                    color=parsed.get("color", ""),
                    size=parsed.get("size", ""),
                    quantity=parsed.get("quantity", 1),
                    rawComment=line,
                    status="review",
                    note="Бүтээгдэхүүний код танигдсангүй",
                    customerId=customer["id"],
                    customerStatus=cust_status,
                )
                order_doc = order.model_dump()
                order_doc["shopId"] = shop_id
                await db.orders.insert_one(order_doc)
                order_doc.pop("_id", None)
                await audit_log(current, "order_parsed_review", "order", order.id, reason="no_product_code")
                created.append(order_doc)
                continue

            product = await db.products.find_one(
                {"shopId": shop_id, "productCode": parsed["productCode"].upper()}, {"_id": 0}
            )
            if not product:
                order = Order(
                    sessionId=payload.sessionId,
                    buyerName=buyer_name,
                    productCode=parsed["productCode"],
                    color=parsed["color"],
                    size=parsed["size"],
                    quantity=parsed["quantity"],
                    rawComment=line,
                    status="review",
                    note="Бүтээгдэхүүн олдсонгүй",
                    customerId=customer["id"],
                    customerStatus=cust_status,
                )
                order_doc = order.model_dump()
                order_doc["shopId"] = shop_id
                await db.orders.insert_one(order_doc)
                order_doc.pop("_id", None)
                await audit_log(current, "order_parsed_review", "order", order.id, reason="product_not_found")
                created.append(order_doc)
                continue

            color = parsed["color"]
            size = parsed["size"]
            unclear = (not color) or (not size)

            if cust_status == "blacklisted":
                status = "review"
                note = f"⛔ Хар жагсаалтад байгаа хэрэглэгч{(': ' + customer.get('reason', '')) if customer.get('reason') else ''}"
            elif not unclear:
                ok = await reserve_stock(product, color, size, parsed["quantity"])
                status = "pending" if ok else "review"
                note = "" if ok else "Үлдэгдэл хүрэлцэхгүй эсвэл хувилбар олдсонгүй"
                if ok:
                    await audit_log(current, "stock_reserved", "product", product["id"],
                                    metadata={"color": color, "size": size, "qty": parsed["quantity"]})
                if ok and cust_status == "watchlist":
                    note = f"⚠️ Анхаарах жагсаалтад байгаа хэрэглэгч{(': ' + customer.get('reason', '')) if customer.get('reason') else ''}"
            else:
                status = "review"
                note = "Өнгө/размер тодорхой бус"
                if cust_status == "watchlist":
                    note = f"⚠️ {note} (анхаарах жагсаалт)"

            order = Order(
                sessionId=payload.sessionId,
                buyerName=buyer_name,
                productId=product["id"],
                productCode=product["productCode"],
                productName=product["productName"],
                color=color,
                size=size,
                quantity=parsed["quantity"],
                unitPrice=product["price"],
                amount=product["price"] * parsed["quantity"],
                rawComment=line,
                commentTime=parsed["commentTime"],
                status=status,
                note=note,
                customerId=customer["id"],
                customerStatus=cust_status,
            )
            order_doc = order.model_dump()
            order_doc["shopId"] = shop_id
            if order.status == "pending":
                await _reserve_order_until(order_doc, shop_id, payload.sessionId)
            await db.orders.insert_one(order_doc)
            order_doc.pop("_id", None)
            await audit_log(current, f"order_{status}", "order", order.id,
                            metadata={"buyer": buyer_name, "code": product["productCode"], "amount": order.amount})
            created.append(order_doc)

    return {"created": len(created), "orders": created}


# ---------------------- ORDER endpoints ----------------------
@api.get("/orders", response_model=List[Order])
async def list_orders(status: Optional[str] = None, current=Depends(get_current_user)):
    q = dict(_shop_q(current))
    if status:
        q["status"] = status
    orders = await db.orders.find(q, {"_id": 0}).sort("createdAt", -1).to_list(2000)
    cache: Dict[str, str] = {}
    for o in orders:
        key = (o.get("phone") or "") + "::" + o.get("buyerName", "")
        if key not in cache:
            c = await find_customer(current["shopId"], phone=o.get("phone", ""), buyerName=o.get("buyerName", ""))
            cache[key] = c.get("status", "normal") if c else "normal"
        o["customerStatus"] = cache[key]
    return orders

@api.post("/orders", response_model=Order)
async def create_order(payload: OrderCreate, current=Depends(get_current_user)):
    shop_id = current["shopId"]
    product = await db.products.find_one(
        {"shopId": shop_id, "productCode": payload.productCode.upper()}, {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    customer = await get_or_create_customer(shop_id, payload.buyerName, payload.phone or "")
    await touch_customer(customer["id"])
    cust_status = customer.get("status", "normal")

    if cust_status == "blacklisted":
        status = "review"
        note = f"⛔ Хар жагсаалтад байгаа хэрэглэгч{(': ' + customer.get('reason', '')) if customer.get('reason') else ''}"
    else:
        ok = await reserve_stock(product, payload.color, payload.size, payload.quantity)
        status = "pending" if ok else "review"
        note = "" if ok else "Үлдэгдэл хүрэлцэхгүй"
        if ok:
            await audit_log(current, "stock_reserved", "product", product["id"],
                            metadata={"color": payload.color, "size": payload.size, "qty": payload.quantity})
        if ok and cust_status == "watchlist":
            note = f"⚠️ Анхаарах жагсаалтад байгаа хэрэглэгч{(': ' + customer.get('reason', '')) if customer.get('reason') else ''}"

    o = Order(
        sessionId=payload.sessionId,
        buyerName=payload.buyerName,
        phone=payload.phone or "",
        productId=product["id"],
        productCode=product["productCode"],
        productName=product["productName"],
        color=payload.color or "",
        size=payload.size or "",
        quantity=payload.quantity,
        unitPrice=product["price"],
        amount=product["price"] * payload.quantity,
        status=status,
        note=note,
        customerId=customer["id"],
        customerStatus=cust_status,
    )
    doc = o.model_dump()
    doc["shopId"] = shop_id
    if o.status == "pending":
        await _reserve_order_until(doc, shop_id, payload.sessionId)
    await db.orders.insert_one(doc)
    await audit_log(current, "order_created", "order", o.id,
                    metadata={"buyer": o.buyerName, "code": o.productCode, "amount": o.amount, "status": status})
    return doc

@api.put("/orders/{oid}", response_model=Order)
async def update_order(oid: str, payload: OrderUpdate, current=Depends(get_current_user)):
    shop_id = current["shopId"]
    order = await db.orders.find_one({"id": oid, "shopId": shop_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    new_status = update.get("status")

    if new_status == "cancelled" and order["status"] != "cancelled":
        if order.get("productId"):
            await release_stock(order["productId"], order.get("color", ""), order.get("size", ""), order.get("quantity", 1))
            await audit_log(current, "stock_released", "product", order["productId"],
                            metadata={"reason": "order_cancelled", "orderId": oid})
        if order.get("customerId"):
            await touch_customer(order["customerId"], cancelledCount=1)
        else:
            c = await find_customer(shop_id, phone=order.get("phone", ""), buyerName=order.get("buyerName", ""))
            if c:
                await touch_customer(c["id"], cancelledCount=1)
        await audit_log(current, "order_cancelled", "order", oid)
    elif new_status == "paid" and order["status"] != "paid":
        await audit_log(current, "order_paid", "order", oid, reason="manual_mark")

    await db.orders.update_one({"id": oid, "shopId": shop_id}, {"$set": update})
    return await db.orders.find_one({"id": oid, "shopId": shop_id}, {"_id": 0})

@api.delete("/orders/{oid}")
async def delete_order(oid: str, current=Depends(get_current_user)):
    shop_id = current["shopId"]
    order = await db.orders.find_one({"id": oid, "shopId": shop_id}, {"_id": 0})
    if order and order.get("productId") and order.get("status") not in ("cancelled",):
        await release_stock(order["productId"], order.get("color", ""), order.get("size", ""), order.get("quantity", 1))
    res = await db.orders.delete_one({"id": oid, "shopId": shop_id})
    if res.deleted_count:
        await audit_log(current, "order_deleted", "order", oid)
    return {"deleted": res.deleted_count}


@api.post("/orders/release-expired")
async def release_expired_orders(sessionId: Optional[str] = None, current=Depends(get_current_user)):
    shop_id = current["shopId"]
    now = datetime.now(timezone.utc).isoformat()
    query = {"shopId": shop_id, "status": "pending", "reservedUntil": {"$lt": now}}
    if sessionId:
        query["sessionId"] = sessionId

    expired_orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    released = []
    for order in expired_orders:
        if order.get("productId"):
            await release_stock(order["productId"], order.get("color", ""), order.get("size", ""), order.get("quantity", 1))
            await audit_log(current, "stock_released", "product", order["productId"],
                            metadata={"reason": "hold_expired", "orderId": order["id"]})
        released.append(order["id"])

    if released:
        await db.orders.update_many(
            {"id": {"$in": released}, "shopId": shop_id},
            {"$set": {"status": "expired", "reservedUntil": None}}
        )

    return {"released": len(released), "orders": released}


@api.get("/sessions/{sid}/released-stock-summary")
async def session_released_stock_summary(sid: str, current=Depends(get_current_user)):
    shop_id = current["shopId"]
    orders = await db.orders.find(
        {"shopId": shop_id, "sessionId": sid, "status": "expired"},
        {"_id": 0, "productCode": 1, "color": 1, "size": 1, "quantity": 1}
    ).to_list(1000)

    summary: Dict[str, Dict[str, Any]] = {}
    for order in orders:
        key = f"{order.get('productCode', '')}::{order.get('color', '')}::{order.get('size', '')}"
        entry = summary.setdefault(key, {
            "productCode": order.get("productCode", ""),
            "color": order.get("color", ""),
            "size": order.get("size", ""),
            "quantity": 0,
            "orders": 0,
        })
        entry["quantity"] += order.get("quantity", 0)
        entry["orders"] += 1

    return list(summary.values())


# ---------------------- PAYMENT MATCHING ----------------------
class BankStatementRow(BaseModel):
    buyerName: str
    phone: Optional[str] = ""
    amount: float
    note: Optional[str] = ""
    paidAt: Optional[str] = ""
    rawRow: Optional[str] = ""

class BankStatementBulk(BaseModel):
    rows: List[BankStatementRow]


def _extract_codes_from_note(note: str) -> List[str]:
    if not note:
        return []
    return [m.upper() for m in re.findall(r"\b([A-Za-zА-Яа-я]{1,3}\d{1,4})\b", note)]


async def _run_payment_match(
    user: dict,
    buyer_name: str,
    phone: str,
    amount: float,
    note: str = "",
    source: str = "manual",
    paidAt: str = "",
    rawInput: str = "",
) -> dict:
    """Core matching logic. Always shop-scoped via `user["shopId"]`."""
    shop_id = user["shopId"]
    buyer_norm = (buyer_name or "").strip().lower()
    phone_norm = (phone or "").strip()
    paid_at_iso = paidAt or _now_iso()

    dedupe_key = _dedupe_key(source, paid_at_iso, amount, phone_norm or buyer_norm, note, rawInput, shop_id)

    # Duplicate detection for imported payment sources so polling is idempotent.
    if source in {"bank_statement", "gmail_payment"}:
        dup = await db.payments.find_one({"shopId": shop_id, "dedupeKey": dedupe_key}, {"_id": 0})
        if dup:
            return {
                "result": "duplicate",
                "matched": dup.get("matchedOrderIds", []),
                "message": "Давхардсан гүйлгээ - дахин тулгахгүй",
                "buyerName": buyer_name,
                "amount": amount,
                "previousResult": dup.get("result"),
            }

    event_doc = {
        "id": str(uuid.uuid4()),
        "shopId": shop_id,
        "buyerName": buyer_name,
        "phone": phone_norm,
        "amount": amount,
        "note": note,
        "source": source,
        "paidAt": paid_at_iso,
        "rawInput": rawInput,
        "dedupeKey": dedupe_key,
        "createdAt": _now_iso(),
        "result": "",
        "matchedOrderIds": [],
        "matchReason": "",
    }

    if phone_norm:
        pending = await db.orders.find(
            {"shopId": shop_id, "status": "pending", "phone": phone_norm}, {"_id": 0}
        ).to_list(500)
    else:
        pending = []
    if not pending:
        all_pending = await db.orders.find({"shopId": shop_id, "status": "pending"}, {"_id": 0}).to_list(500)
        pending = [o for o in all_pending if o.get("buyerName", "").strip().lower() == buyer_norm]

    if not pending:
        event_doc["result"] = "no_match"
        event_doc["matchReason"] = "no_pending_orders_for_buyer"
        await db.payments.insert_one(event_doc)
        await audit_log(user, "payment_no_match", "payment", event_doc["id"],
                        metadata={"buyer": buyer_name, "amount": amount, "source": source})
        return {"result": "no_match", "message": "Тохирох хүлээгдэж буй захиалга олдсонгүй", "matched": [], "buyerName": buyer_name, "amount": amount}

    note_codes = _extract_codes_from_note(note)
    if note_codes:
        narrowed = [o for o in pending if (o.get("productCode") or "").upper() in note_codes]
        if narrowed:
            pending = narrowed
            event_doc["narrowedBy"] = note_codes

    target = round(amount, 2)
    total_pending = round(sum(o["amount"] for o in pending), 2)

    matches = []
    n = len(pending)
    for r in range(1, n + 1):
        for combo in combinations(range(n), r):
            s = round(sum(pending[i]["amount"] for i in combo), 2)
            if abs(s - target) < 0.01:
                matches.append(combo)
                if len(matches) > 5:
                    break
        if len(matches) > 5:
            break

    async def _persist_and_audit(result: str, ids: list, reason: str, message: str):
        event_doc["result"] = result
        event_doc["matchedOrderIds"] = ids
        event_doc["matchReason"] = reason
        await db.payments.insert_one(event_doc)
        await audit_log(user, f"payment_{result}", "payment", event_doc["id"],
                        reason=reason, metadata={"buyer": buyer_name, "amount": amount, "source": source, "orderIds": ids})
        return {"result": result, "matched": ids, "message": message, "buyerName": buyer_name, "amount": amount}

    if len(matches) == 1:
        ids = [pending[i]["id"] for i in matches[0]]
        await db.orders.update_many({"id": {"$in": ids}, "shopId": shop_id}, {"$set": {"status": "paid"}})
        return await _persist_and_audit("paid", ids, "exact_combination_match", f"{len(ids)} захиалга төлөгдсөн")

    if len(matches) > 1:
        all_ids = list({pending[i]["id"] for combo in matches for i in combo})
        await db.orders.update_many({"id": {"$in": all_ids}, "shopId": shop_id},
                                    {"$set": {"status": "review", "note": "Олон тохироо илэрсэн - гар аргаар шалгана"}})
        return await _persist_and_audit("review", all_ids, "multiple_combinations", "Олон боломжит тохироо")

    if target < total_pending:
        ids = [o["id"] for o in pending]
        await db.orders.update_many({"id": {"$in": ids}, "shopId": shop_id},
                                    {"$set": {"status": "underpaid", "note": f"Дутуу шилжүүлэг: {target}/{total_pending}₮"}})
        c = await find_customer(shop_id, phone=phone_norm, buyerName=buyer_name)
        if c:
            await touch_customer(c["id"], unpaidCount=1)
        return await _persist_and_audit("underpaid", ids, f"underpaid_{target}_of_{total_pending}", "Дутуу шилжүүлэг")

    ids = [o["id"] for o in pending]
    await db.orders.update_many({"id": {"$in": ids}, "shopId": shop_id},
                                {"$set": {"status": "overpaid", "note": f"Илүү шилжүүлэг: {target}/{total_pending}₮"}})
    return await _persist_and_audit("overpaid", ids, f"overpaid_{target}_of_{total_pending}", "Илүү шилжүүлэг")


@api.post("/payments/match")
async def match_payment(payload: PaymentEvent, current=Depends(get_current_user)):
    """Manual single payment matching (now auth-required for tenant scope)."""
    return await _run_payment_match(
        current, payload.buyerName, payload.phone or "", payload.amount,
        payload.note or "", source="manual",
    )


@api.post("/payments/bank-statement")
async def bank_statement_match(payload: BankStatementBulk, current=Depends(get_current_user)):
    """Bulk match for pasted/uploaded bank statement rows. Duplicate-protected."""
    results = []
    for row in payload.rows:
        raw = row.rawRow or f"{row.buyerName}|{row.phone}|{row.amount}|{row.note}|{row.paidAt}"
        r = await _run_payment_match(
            current, row.buyerName, row.phone or "", row.amount, row.note or "",
            source="bank_statement", paidAt=row.paidAt or "", rawInput=raw,
        )
        results.append(r)
    summary = {}
    for r in results:
        summary[r["result"]] = summary.get(r["result"], 0) + 1
    return {"results": results, "summary": summary, "total": len(results)}

@api.get("/payments")
async def list_payments(current=Depends(get_current_user)):
    return await db.payments.find(_shop_q(current), {"_id": 0}).sort("createdAt", -1).to_list(500)


# ---------------------- PILOT INTEGRATIONS ----------------------
@api.get("/integrations/status")
async def integration_status(current=Depends(get_current_user)):
    shop_id = current["shopId"]
    rows = await db.integration_status.find({"shopId": shop_id}, {"_id": 0}).to_list(20)
    by_provider = {r["provider"]: r for r in rows}

    async def provider_status(provider: str):
        token = await _integration_token(shop_id, provider)
        row = by_provider.get(provider, {})
        configured = _integration_configured(provider)
        if token:
            status = "connected" if row.get("status") != "error" else "error"
        elif row.get("status") == "error":
            status = "error"
        else:
            status = "demo"
        if not configured and not token:
            status = "demo"
        return {
            "status": status,
            "configured": configured,
            "connected": bool(token),
            "lastSyncAt": row.get("lastSyncAt") or token.get("updatedAt") if token else row.get("lastSyncAt"),
            "error": row.get("error", ""),
        }

    return {
        "facebook": await provider_status("facebook"),
        "gmail": await provider_status("gmail"),
        "fallbackExplanation": "Facebook зөвшөөрөл дутуу бол comment-оо гараар paste хийж туршина",
    }


@api.get("/integrations/gmail/auth")
async def gmail_auth(current=Depends(get_current_user)):
    if not _integration_configured("gmail"):
        await _set_integration_status(current["shopId"], "gmail", "error", "Google OAuth env тохируулаагүй")
        raise HTTPException(status_code=400, detail="Google OAuth env тохируулаагүй")
    state = _oauth_state_doc(current, "gmail")
    await db.integration_oauth_states.insert_one(state)
    params = {
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/gmail.readonly",
        "access_type": "offline",
        "prompt": "consent",
        "state": state["id"],
    }
    return {"authUrl": "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)}


@api.get("/integrations/gmail/callback")
async def gmail_callback(code: str = "", state: str = ""):
    state_doc = await db.integration_oauth_states.find_one({"id": state, "provider": "gmail"}, {"_id": 0})
    if not code or not state_doc:
        raise HTTPException(status_code=400, detail="Invalid Gmail OAuth callback")
    try:
        resp = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": os.environ["GOOGLE_CLIENT_ID"],
                "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
                "grant_type": "authorization_code",
                "code": code,
            },
            timeout=15,
        )
        resp.raise_for_status()
        token = resp.json()
    except Exception as e:
        await _set_integration_status(state_doc["shopId"], "gmail", "error", f"Gmail OAuth алдаа: {e}")
        raise HTTPException(status_code=400, detail="Gmail OAuth failed")
    await db.integration_tokens.update_one(
        {"shopId": state_doc["shopId"], "provider": "gmail"},
        {"$set": {
            "provider": "gmail",
            "shopId": state_doc["shopId"],
            "userId": state_doc["userId"],
            "accessToken": token.get("access_token"),
            "refreshToken": token.get("refresh_token"),
            "expiresIn": token.get("expires_in"),
            "scope": token.get("scope"),
            "updatedAt": _now_iso(),
        }},
        upsert=True,
    )
    await _set_integration_status(state_doc["shopId"], "gmail", "connected", "")
    return {"ok": True, "message": "Gmail pilot холболт амжилттай. Borlo app руу буцна уу."}


@api.post("/integrations/gmail/sync-payments")
async def gmail_sync_payments(payload: GmailSyncRequest, current=Depends(get_current_user)):
    token = await _integration_token(current["shopId"], "gmail")
    if not token:
        return {"status": "demo", "message": "Gmail холбогдоогүй. Demo fallback ашиглана.", "candidates": [], "results": []}
    query = payload.query or os.environ.get("GMAIL_PAYMENT_QUERY", "newer_than:2d (subject:төлбөр OR subject:payment OR from:bank)")
    headers = {"Authorization": f"Bearer {token['accessToken']}"}
    try:
        list_resp = requests.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            params={"q": query, "maxResults": min(max(payload.maxResults, 1), 25)},
            headers=headers,
            timeout=15,
        )
        list_resp.raise_for_status()
        messages = list_resp.json().get("messages", [])
        candidates = []
        results = []
        for msg in messages:
            detail = requests.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
                headers=headers,
                timeout=15,
            )
            detail.raise_for_status()
            data = detail.json()
            headers_map = {h["name"].lower(): h.get("value", "") for h in data.get("payload", {}).get("headers", [])}
            source_text = f"{headers_map.get('subject', '')} {data.get('snippet', '')}"
            candidate = _parse_payment_candidate(source_text, headers_map.get("from", ""), headers_map.get("date", ""), data.get("id", ""))
            if not candidate:
                continue
            candidates.append(candidate)
            result = await _run_payment_match(
                current,
                candidate["buyerName"],
                candidate["phone"],
                candidate["amount"],
                candidate["rawSnippet"],
                source="gmail_payment",
                paidAt=candidate["paidAt"],
                rawInput=json.dumps({
                    "gmailMessageId": candidate["sourceId"],
                    "sender": candidate["sender"],
                    "snippet": candidate["rawSnippet"],
                }, ensure_ascii=False),
            )
            results.append(result)
        await _set_integration_status(current["shopId"], "gmail", "connected", "")
        return {"status": "connected", "query": query, "candidates": candidates, "results": results}
    except Exception as e:
        await _set_integration_status(current["shopId"], "gmail", "error", f"Gmail sync алдаа: {e}")
        raise HTTPException(status_code=400, detail="Gmail sync failed")


@api.get("/integrations/facebook/auth")
async def facebook_auth(current=Depends(get_current_user)):
    if not _integration_configured("facebook"):
        await _set_integration_status(current["shopId"], "facebook", "error", "Facebook OAuth env тохируулаагүй")
        raise HTTPException(status_code=400, detail="Facebook OAuth env тохируулаагүй")
    state = _oauth_state_doc(current, "facebook")
    await db.integration_oauth_states.insert_one(state)
    params = {
        "client_id": os.environ["FACEBOOK_APP_ID"],
        "redirect_uri": os.environ["FACEBOOK_REDIRECT_URI"],
        "response_type": "code",
        "scope": "pages_show_list,pages_read_engagement",
        "state": state["id"],
    }
    return {"authUrl": "https://www.facebook.com/v20.0/dialog/oauth?" + urlencode(params)}


@api.get("/integrations/facebook/callback")
async def facebook_callback(code: str = "", state: str = ""):
    state_doc = await db.integration_oauth_states.find_one({"id": state, "provider": "facebook"}, {"_id": 0})
    if not code or not state_doc:
        raise HTTPException(status_code=400, detail="Invalid Facebook OAuth callback")
    try:
        resp = requests.get(
            "https://graph.facebook.com/v20.0/oauth/access_token",
            params={
                "client_id": os.environ["FACEBOOK_APP_ID"],
                "client_secret": os.environ["FACEBOOK_APP_SECRET"],
                "redirect_uri": os.environ["FACEBOOK_REDIRECT_URI"],
                "code": code,
            },
            timeout=15,
        )
        resp.raise_for_status()
        token = resp.json()
    except Exception as e:
        await _set_integration_status(state_doc["shopId"], "facebook", "error", f"Facebook OAuth алдаа: {e}")
        raise HTTPException(status_code=400, detail="Facebook OAuth failed")
    await db.integration_tokens.update_one(
        {"shopId": state_doc["shopId"], "provider": "facebook"},
        {"$set": {
            "provider": "facebook",
            "shopId": state_doc["shopId"],
            "userId": state_doc["userId"],
            "accessToken": token.get("access_token"),
            "expiresIn": token.get("expires_in"),
            "updatedAt": _now_iso(),
        }},
        upsert=True,
    )
    await _set_integration_status(state_doc["shopId"], "facebook", "connected", "")
    return {"ok": True, "message": "Facebook pilot холболт амжилттай. Borlo app руу буцна уу."}


@api.get("/integrations/facebook/pages")
async def facebook_pages(current=Depends(get_current_user)):
    token = await _integration_token(current["shopId"], "facebook")
    if not token:
        return {"status": "demo", "pages": [], "message": "Facebook холбогдоогүй. Page ID-г гараар оруулж эсвэл comment paste fallback ашиглана."}
    try:
        resp = requests.get(
            "https://graph.facebook.com/v20.0/me/accounts",
            params={"fields": "id,name,access_token", "access_token": token["accessToken"]},
            timeout=15,
        )
        resp.raise_for_status()
        pages = [{"id": p.get("id"), "name": p.get("name")} for p in resp.json().get("data", [])]
        await db.integration_tokens.update_one(
            {"shopId": current["shopId"], "provider": "facebook"},
            {"$set": {"pages": resp.json().get("data", []), "updatedAt": _now_iso()}},
        )
        await _set_integration_status(current["shopId"], "facebook", "connected", "")
        return {"status": "connected", "pages": pages}
    except Exception as e:
        await _set_integration_status(current["shopId"], "facebook", "error", f"Facebook pages алдаа: {e}")
        raise HTTPException(status_code=400, detail="Facebook pages failed")


@api.post("/integrations/facebook/comments")
async def facebook_comments(payload: FacebookCommentsRequest, current=Depends(get_current_user)):
    token = await _integration_token(current["shopId"], "facebook")
    if not token:
        return {"status": "demo", "message": "Facebook холбогдоогүй. Manual paste fallback ашиглана.", "comments": [], "created": 0, "orders": []}
    page_token = token.get("accessToken")
    for page in token.get("pages", []) or []:
        if page.get("id") == payload.pageId and page.get("access_token"):
            page_token = page["access_token"]
            break
    try:
        resp = requests.get(
            f"https://graph.facebook.com/v20.0/{payload.postId}/comments",
            params={"fields": "id,message,created_time,from", "limit": min(max(payload.limit, 1), 100), "access_token": page_token},
            timeout=15,
        )
        resp.raise_for_status()
        comments = resp.json().get("data", [])
        lines = []
        for c in comments:
            message = (c.get("message") or "").strip()
            if not message:
                continue
            name = (c.get("from") or {}).get("name", "")
            lines.append(f"{name} {message}".strip())
        parsed = await parse_comments(CommentParseRequest(sessionId=payload.sessionId, text="\n".join(lines)), current)
        await _set_integration_status(current["shopId"], "facebook", "connected", "")
        return {"status": "connected", "comments": comments, **parsed}
    except Exception as e:
        await _set_integration_status(current["shopId"], "facebook", "error", f"Facebook comment алдаа: {e}")
        raise HTTPException(status_code=400, detail="Facebook comments failed")


# ---------------------- AUDIT LOG ----------------------
@api.get("/audit-logs")
async def list_audit_logs(
    entityType: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 200,
    current=Depends(get_current_user),
):
    q = dict(_shop_q(current))
    if entityType:
        q["entityType"] = entityType
    if action:
        q["action"] = action
    cursor = db.audit_logs.find(q, {"_id": 0}).sort("timestamp", -1).limit(min(max(limit, 1), 1000))
    return await cursor.to_list(1000)


# ---------------------- PACKING ----------------------
@api.get("/packing")
async def packing_list(current=Depends(get_current_user)):
    paid = await db.orders.find(
        {"shopId": current["shopId"], "status": {"$in": ["paid", "packed"]}}, {"_id": 0}
    ).to_list(2000)
    grouped: Dict[str, Any] = {}
    for o in paid:
        key = (o.get("phone") or "") + "::" + o["buyerName"]
        if key not in grouped:
            grouped[key] = {
                "buyerName": o["buyerName"],
                "phone": o.get("phone", ""),
                "items": [],
                "total": 0,
                "allPacked": True,
            }
        grouped[key]["items"].append(o)
        grouped[key]["total"] += o.get("amount", 0)
        if o["status"] != "packed":
            grouped[key]["allPacked"] = False
    return list(grouped.values())

@api.put("/orders/{oid}/pack")
async def mark_packed(oid: str, current=Depends(get_current_user)):
    res = await db.orders.update_one(
        {"id": oid, "shopId": current["shopId"]}, {"$set": {"status": "packed"}}
    )
    if res.matched_count:
        await audit_log(current, "order_packed", "order", oid)
    return {"ok": True}


# ---------------------- CUSTOMERS ----------------------
@api.get("/customers", response_model=List[Customer])
async def list_customers(status: Optional[str] = None, current=Depends(get_current_user)):
    q = dict(_shop_q(current))
    if status:
        q["status"] = status
    return await db.customers.find(q, {"_id": 0}).sort("updatedAt", -1).to_list(2000)


@api.get("/customers/lookup")
async def lookup_customer(phone: str = "", buyerName: str = "", current=Depends(get_current_user)):
    c = await find_customer(current["shopId"], phone=phone, buyerName=buyerName)
    return c or {"status": "normal"}


@api.put("/customers/{cid}", response_model=Customer)
async def update_customer(cid: str, payload: CustomerUpdate, current=Depends(get_current_user)):
    existing = await db.customers.find_one({"id": cid, "shopId": current["shopId"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updatedAt"] = _now_iso()
    await db.customers.update_one({"id": cid, "shopId": current["shopId"]}, {"$set": update})
    await audit_log(current, "customer_updated", "customer", cid, metadata=update)
    return await db.customers.find_one({"id": cid}, {"_id": 0})


async def _set_customer_status(user: dict, payload: CustomerStatusChange, status: str) -> dict:
    shop_id = user["shopId"]
    if payload.customerId:
        c = await db.customers.find_one({"id": payload.customerId, "shopId": shop_id}, {"_id": 0})
        if not c:
            raise HTTPException(status_code=404, detail="Customer not found")
    else:
        c = await get_or_create_customer(shop_id, payload.buyerName or "Зочин", payload.phone or "")
    update = {
        "status": status,
        "reason": payload.reason or "",
        "updatedAt": _now_iso(),
    }
    if payload.notes is not None:
        update["notes"] = payload.notes
    await db.customers.update_one({"id": c["id"], "shopId": shop_id}, {"$set": update})
    await audit_log(user, f"customer_{status}", "customer", c["id"],
                    reason=payload.reason or "", metadata={"buyerName": c.get("buyerName"), "phone": c.get("phone")})
    return await db.customers.find_one({"id": c["id"]}, {"_id": 0})


@api.post("/customers/blacklist", response_model=Customer)
async def blacklist_customer(payload: CustomerStatusChange, current=Depends(get_current_user)):
    return await _set_customer_status(current, payload, "blacklisted")


@api.post("/customers/watchlist", response_model=Customer)
async def watchlist_customer(payload: CustomerStatusChange, current=Depends(get_current_user)):
    return await _set_customer_status(current, payload, "watchlist")


@api.post("/customers/unblacklist", response_model=Customer)
async def unblacklist_customer(payload: CustomerStatusChange, current=Depends(get_current_user)):
    return await _set_customer_status(current, payload, "normal")


# ---------------------- DASHBOARD ----------------------
@api.get("/dashboard/stats")
async def dashboard_stats(current=Depends(get_current_user)):
    shop_id = current["shopId"]
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_lives = await db.sessions.count_documents({"shopId": shop_id, "createdAt": {"$gte": today_start}})
    pending = await db.orders.count_documents({"shopId": shop_id, "status": "pending"})
    paid = await db.orders.count_documents({"shopId": shop_id, "status": "paid"})
    review = await db.orders.count_documents({"shopId": shop_id, "status": {"$in": ["review", "underpaid", "overpaid"]}})
    packed = await db.orders.count_documents({"shopId": shop_id, "status": "packed"})

    paid_orders = await db.orders.find(
        {"shopId": shop_id, "status": {"$in": ["paid", "packed"]}}, {"_id": 0, "amount": 1}
    ).to_list(5000)
    total_sales = sum(o.get("amount", 0) for o in paid_orders)

    products = await db.products.find({"shopId": shop_id}, {"_id": 0}).to_list(2000)
    low = []
    for p in products:
        for v in p.get("variants", []):
            if v.get("stock", 0) <= 3:
                low.append({"productCode": p["productCode"], "productName": p["productName"], "color": v["color"], "size": v["size"], "stock": v["stock"]})
    return {
        "todayLives": today_lives,
        "pending": pending,
        "paid": paid,
        "review": review,
        "packed": packed,
        "totalSales": total_sales,
        "lowStockCount": len(low),
        "lowStock": low[:10],
    }


# ---------------------- Seed ----------------------
async def seed():
    # 1. Ensure default Demo Shop exists
    demo_shop = await db.shops.find_one({"name": "Demo Shop"})
    if not demo_shop:
        demo_shop = {"id": str(uuid.uuid4()), "name": "Demo Shop", "createdAt": _now_iso()}
        await db.shops.insert_one(demo_shop)
    demo_shop_id = demo_shop["id"]

    # 2. Backfill any pre-existing docs missing shopId -> assign to demo shop
    for col in (db.users, db.products, db.sessions, db.orders, db.customers, db.payments):
        await col.update_many(
            {"shopId": {"$exists": False}}, {"$set": {"shopId": demo_shop_id}}
        )

    # 3. Admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@liveshop.mn").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Demo Admin",
            "shopId": demo_shop_id,
            "password_hash": hash_pw(admin_pw),
            "role": "admin",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })
    elif not existing.get("shopId"):
        await db.users.update_one({"id": existing["id"]}, {"$set": {"shopId": demo_shop_id}})

    # 4. Products if none in this shop
    if await db.products.count_documents({"shopId": demo_shop_id}) == 0:
        sample = [
            {
                "productCode": "A12", "productName": "Цэргийн загварт цамц",
                "price": 89000, "category": "Эмэгтэй хувцас",
                "image": "https://images.unsplash.com/photo-1604506847073-4a8e18e07d92?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxmYXNoaW9uJTIwY2xvdGhpbmclMjByYWNrfGVufDB8fHx8MTc3Nzc2NjU0Mnww&ixlib=rb-4.1.0&q=85",
                "variants": [
                    {"color": "Хар", "size": "S", "stock": 5},
                    {"color": "Хар", "size": "M", "stock": 8},
                    {"color": "Хар", "size": "L", "stock": 3},
                    {"color": "Цагаан", "size": "M", "stock": 6},
                ],
            },
            {
                "productCode": "B01", "productName": "Зузаан гудуй",
                "price": 145000, "category": "Эмэгтэй хувцас",
                "image": "https://images.unsplash.com/photo-1608739871923-7da6d372f3c2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxmYXNoaW9uJTIwY2xvdGhpbmclMjByYWNrfGVufDB8fHx8MTc3Nzc2NjU0Mnww&ixlib=rb-4.1.0&q=85",
                "variants": [
                    {"color": "Улаан", "size": "S", "stock": 4},
                    {"color": "Улаан", "size": "L", "stock": 2},
                    {"color": "Хөх", "size": "M", "stock": 7},
                ],
            },
            {
                "productCode": "C01", "productName": "Жинсэн өмд",
                "price": 119000, "category": "Эмэгтэй өмд",
                "image": "https://images.pexels.com/photos/5531711/pexels-photo-5531711.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
                "variants": [
                    {"color": "Хөх", "size": "30", "stock": 4},
                    {"color": "Хөх", "size": "32", "stock": 6},
                    {"color": "Хар", "size": "34", "stock": 5},
                    {"color": "Хар", "size": "38", "stock": 3},
                ],
            },
            {
                "productCode": "D05", "productName": "Спорт пүүз",
                "price": 199000, "category": "Эмэгтэй гутал",
                "image": "https://images.unsplash.com/photo-1631655375328-528d64f1a9d1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxzbmVha2VycyUyMGZsYXRsYXl8ZW58MHx8fHwxNzc3NzY2NTQyfDA&ixlib=rb-4.1.0&q=85",
                "variants": [
                    {"color": "Цагаан", "size": "36", "stock": 3},
                    {"color": "Цагаан", "size": "37", "stock": 5},
                    {"color": "Цагаан", "size": "38", "stock": 4},
                    {"color": "Цагаан", "size": "39", "stock": 2},
                ],
            },
        ]
        for s in sample:
            p = Product(**s)
            doc = p.model_dump()
            doc["shopId"] = demo_shop_id
            await db.products.insert_one(doc)

    # 5. Session if none in this shop
    if await db.sessions.count_documents({"shopId": demo_shop_id}) == 0:
        sess = LiveSession(name="Демо лайв - 2025/02/15")
        sess_doc = sess.model_dump()
        sess_doc["shopId"] = demo_shop_id
        await db.sessions.insert_one(sess_doc)

        # sample orders
        prods = await db.products.find({"shopId": demo_shop_id}, {"_id": 0}).to_list(20)
        if prods:
            p1 = next((p for p in prods if p["productCode"] == "A12"), prods[0])
            p2 = next((p for p in prods if p["productCode"] == "B01"), prods[0])
            sample_orders = [
                {"buyerName": "Болор", "phone": "99112233", "product": p1, "color": "Хар", "size": "M", "qty": 1, "status": "paid"},
                {"buyerName": "Сараа", "phone": "88445566", "product": p2, "color": "Хөх", "size": "M", "qty": 2, "status": "pending"},
                {"buyerName": "Нараа", "phone": "", "product": p1, "color": "Цагаан", "size": "M", "qty": 1, "status": "pending"},
                {"buyerName": "Тэмүүлэн", "phone": "99887766", "product": p2, "color": "Улаан", "size": "L", "qty": 1, "status": "review"},
            ]
            for s in sample_orders:
                p = s["product"]
                for v in p["variants"]:
                    if v["color"] == s["color"] and str(v["size"]) == str(s["size"]):
                        v["stock"] = max(0, v["stock"] - s["qty"])
                await db.products.update_one({"id": p["id"]}, {"$set": {"variants": p["variants"]}})
                cust = await get_or_create_customer(demo_shop_id, s["buyerName"], s["phone"])
                o = Order(
                    sessionId=sess.id,
                    buyerName=s["buyerName"],
                    phone=s["phone"],
                    productId=p["id"],
                    productCode=p["productCode"],
                    productName=p["productName"],
                    color=s["color"],
                    size=s["size"],
                    quantity=s["qty"],
                    unitPrice=p["price"],
                    amount=p["price"] * s["qty"],
                    status=s["status"],
                    customerId=cust["id"],
                    customerStatus=cust.get("status", "normal"),
                )
                doc = o.model_dump()
                doc["shopId"] = demo_shop_id
                await db.orders.insert_one(doc)

    # 6. Watchlisted demo customer if none flagged
    if await db.customers.count_documents({"shopId": demo_shop_id, "status": {"$in": ["watchlist", "blacklisted"]}}) == 0:
        c = await get_or_create_customer(demo_shop_id, "Тэмүүлэн", "99887766")
        await db.customers.update_one(
            {"id": c["id"]},
            {"$set": {
                "status": "watchlist",
                "reason": "Өмнөх захиалгаа цуцалсан",
                "cancelledCount": 1,
                "updatedAt": _now_iso(),
            }},
        )


@app.on_event("startup")
async def on_start():
    await db.users.create_index("email", unique=True)
    # Compound index: productCode unique within a single shop
    try:
        await db.products.drop_index("productCode_1")
    except Exception:
        pass
    await db.products.create_index([("shopId", 1), ("productCode", 1)], unique=True)
    await db.orders.create_index([("shopId", 1), ("status", 1)])
    await db.customers.create_index([("shopId", 1), ("phone", 1)])
    await db.customers.create_index([("shopId", 1), ("buyerName", 1)])
    await db.payments.create_index([("shopId", 1), ("dedupeKey", 1)])
    await db.audit_logs.create_index([("shopId", 1), ("timestamp", -1)])
    await db.integration_tokens.create_index([("shopId", 1), ("provider", 1)], unique=True)
    await db.integration_status.create_index([("shopId", 1), ("provider", 1)], unique=True)
    await db.integration_oauth_states.create_index([("id", 1), ("provider", 1)], unique=True)
    await seed()
    logger.info("Liveshop ready")


@app.on_event("shutdown")
async def on_close():
    client.close()


# ---------------------- mount ----------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
