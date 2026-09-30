from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import uuid
import jwt
import bcrypt
import secrets
import requests
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form, Header, Query
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response as StarletteResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Nestavia Zirakpur API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nestavia")

JWT_ALGORITHM = "HS256"

# ---------------------------------------------------------------------------
# Object storage
# ---------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "nestavia"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------------------------------------------------------------------------
# Property configuration & rule engine
# ---------------------------------------------------------------------------
PROPERTY = {
    "id": "nestavia-zirakpur-himalayan-gateway",
    "name": "Nestavia Zirakpur - The Himalayan Gateway",
    "tagline": "Where Every Journey Begins in Comfort",
    "base_rate": 2400,
    "base_guests": 2,
    "max_guests": 4,
    "extra_guest_fee": 500,
    "weekend_markup": 0.15,
    "last_minute_discount": 0.10,
    "last_minute_hours": 48,
    "partial_percent": 0.70,
    "partial_eligible_days": 7,
    "house_rule": "Strict Policy: No unregistered guests allowed on the premises without prior host notification.",
    "host_name": "Dr. Gurpreet Kaur",
    "host_whatsapp": "918802757866",
    "upi_id": "sweetguru88@okicici",
    "instagram": "Nestavia_stays",
    # Secret — revealed only after host approval
    "secret_address": "Unit No. 1001, 10th Floor, Maya Garden Magnesia Tower-1, PR-7 Airport road, ZIRAKPUR, PUNJAB 140603, India",
    "secret_maps": "https://maps.app.goo.gl/Qb1YFdH2ay7NKLwY6",
    "public_area": "Zirakpur, Punjab (exact address & map revealed after host confirms your booking)",
}


def daterange(check_in: date, check_out: date):
    cur = check_in
    while cur < check_out:
        yield cur
        cur += timedelta(days=1)


async def compute_quote(check_in_s: str, check_out_s: str, guests: int, payment_option: str = "full") -> dict:
    check_in = date.fromisoformat(check_in_s)
    check_out = date.fromisoformat(check_out_s)
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="Check-out must be after check-in")
    if guests < 1 or guests > PROPERTY["max_guests"]:
        raise HTTPException(status_code=400, detail=f"Guests must be between 1 and {PROPERTY['max_guests']}")

    # rate overrides
    overrides = {}
    async for o in db.rate_overrides.find({}, {"_id": 0}):
        overrides[o["date"]] = o["rate"]

    extra_guests = max(0, guests - PROPERTY["base_guests"])
    extra_fee_per_night = extra_guests * PROPERTY["extra_guest_fee"]

    nights = []
    for d in daterange(check_in, check_out):
        ds = d.isoformat()
        base = overrides.get(ds, PROPERTY["base_rate"])
        is_weekend = d.weekday() in (4, 5)  # Friday=4, Saturday=5
        weekend_add = round(base * PROPERTY["weekend_markup"]) if is_weekend else 0
        night_total = base + weekend_add + extra_fee_per_night
        nights.append({
            "date": ds,
            "weekday": d.strftime("%a"),
            "base": base,
            "is_weekend": is_weekend,
            "weekend_markup": weekend_add,
            "extra_guest_fee": extra_fee_per_night,
            "total": night_total,
        })

    num_nights = len(nights)
    room_subtotal = sum(n["base"] for n in nights)
    weekend_total = sum(n["weekend_markup"] for n in nights)
    extra_guest_total = extra_fee_per_night * num_nights
    subtotal = sum(n["total"] for n in nights)

    # Last-minute discount
    now = datetime.now(timezone.utc)
    checkin_dt = datetime(check_in.year, check_in.month, check_in.day, 12, 0, tzinfo=timezone.utc)
    hours_to_checkin = (checkin_dt - now).total_seconds() / 3600.0
    is_last_minute = hours_to_checkin < PROPERTY["last_minute_hours"]
    last_minute_discount = round(subtotal * PROPERTY["last_minute_discount"]) if is_last_minute else 0

    total = subtotal - last_minute_discount

    # Down-payment engine
    days_to_checkin = (check_in - date.today()).days
    partial_allowed = days_to_checkin >= PROPERTY["partial_eligible_days"]
    if not partial_allowed:
        payment_option = "full"
    if payment_option == "partial" and partial_allowed:
        amount_due = round(total * PROPERTY["partial_percent"])
    else:
        payment_option = "full"
        amount_due = total

    return {
        "check_in": check_in_s,
        "check_out": check_out_s,
        "guests": guests,
        "num_nights": num_nights,
        "nights": nights,
        "base_rate": PROPERTY["base_rate"],
        "room_subtotal": room_subtotal,
        "weekend_markup_total": weekend_total,
        "extra_guests": extra_guests,
        "extra_guest_fee_per_night": extra_fee_per_night,
        "extra_guest_total": extra_guest_total,
        "subtotal": subtotal,
        "is_last_minute": is_last_minute,
        "last_minute_discount": last_minute_discount,
        "total": total,
        "payment_option": payment_option,
        "partial_allowed": partial_allowed,
        "partial_percent": int(PROPERTY["partial_percent"] * 100),
        "amount_due": amount_due,
        "balance_due": total - amount_due,
        "days_to_checkin": days_to_checkin,
    }


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def public_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "guest"),
        "phone": user.get("phone", ""),
    }


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_host(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "host":
        raise HTTPException(status_code=403, detail="Host access required")
    return user


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = ""


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class QuoteInput(BaseModel):
    check_in: str
    check_out: str
    guests: int
    payment_option: str = "full"


class BookingInput(BaseModel):
    check_in: str
    check_out: str
    guests: int
    payment_option: str = "full"
    guest_phone: str
    transaction_ref: str
    receipt_file_id: Optional[str] = None
    special_requests: Optional[str] = ""


class ReviewInput(BaseModel):
    booking_id: str
    rating: int = Field(ge=1, le=5)
    comment: str


class BlockInput(BaseModel):
    dates: List[str]


class RateOverrideInput(BaseModel):
    date: str
    rate: int


class QuickReplyInput(BaseModel):
    title: str
    message: str


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "phone": body.phone or "",
        "role": "guest",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    access = create_access_token(str(res.inserted_id), email)
    refresh = create_refresh_token(str(res.inserted_id))
    set_auth_cookies(response, access, refresh)
    return {"user": public_user(doc), "token": access}


@api_router.post("/auth/login")
async def login(body: LoginInput, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    set_auth_cookies(response, access, refresh)
    return {"user": public_user(user), "token": access}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}


# ---------------------------------------------------------------------------
# Property / pricing / availability
# ---------------------------------------------------------------------------
DEFAULT_LISTING = {
    "description": "A private, tastefully-designed 1BHK apartment on the 10th floor — bright master bedroom opening onto a sunlit balcony, a lounge dressed with pop-art and velvet seating, a mosaic-tiled modular kitchen, and a spa-style bathroom. Perfectly placed near Chandigarh airport as your gateway to Shimla, Kasauli and the Himalayas.",
    "amenities": ["High-speed Wi-Fi", "Air conditioning", "Smart TV", "Fully-equipped kitchen", "Geyser & rain shower", "Balcony with open views", "King-size bed", "Daily-cleaned linens"],
    "house_rules": [
        "Maximum 4 guests — strictly enforced.",
        PROPERTY["house_rule"],
        "Check-in 2:00 PM · Check-out 11:00 AM.",
        "Government ID required for all guests at arrival.",
    ],
}


class ListingInput(BaseModel):
    description: str
    amenities: List[str]
    house_rules: List[str]


async def get_listing() -> dict:
    doc = await db.listing_settings.find_one({"key": "listing"}, {"_id": 0, "key": 0})
    return {**DEFAULT_LISTING, **(doc or {})}


@api_router.put("/host/listing")
async def update_listing(body: ListingInput, host: dict = Depends(require_host)):
    data = {"description": body.description.strip(), "amenities": [a.strip() for a in body.amenities if a.strip()], "house_rules": [r.strip() for r in body.house_rules if r.strip()]}
    await db.listing_settings.update_one({"key": "listing"}, {"$set": data}, upsert=True)
    return {"listing": data}


@api_router.get("/property")
async def get_property():
    p = PROPERTY
    listing = await get_listing()
    return {
        **listing,
        "id": p["id"], "name": p["name"], "tagline": p["tagline"],
        "base_rate": p["base_rate"], "base_guests": p["base_guests"],
        "max_guests": p["max_guests"], "extra_guest_fee": p["extra_guest_fee"],
        "weekend_markup": p["weekend_markup"], "last_minute_discount": p["last_minute_discount"],
        "partial_percent": int(p["partial_percent"] * 100), "partial_eligible_days": p["partial_eligible_days"],
        "house_rule": p["house_rule"], "host_name": p["host_name"],
        "host_whatsapp": p["host_whatsapp"], "upi_id": p["upi_id"], "instagram": p["instagram"],
        "public_area": p["public_area"],
    }


@api_router.post("/pricing/quote")
async def pricing_quote(body: QuoteInput):
    return await compute_quote(body.check_in, body.check_out, body.guests, body.payment_option)


@api_router.get("/availability")
async def availability():
    blocked = [b["date"] async for b in db.blocked_dates.find({}, {"_id": 0})]
    booked = []
    async for bk in db.bookings.find({"status": {"$in": ["pending", "confirmed"]}}, {"_id": 0, "check_in": 1, "check_out": 1}):
        d = date.fromisoformat(bk["check_in"])
        end = date.fromisoformat(bk["check_out"])
        while d < end:
            booked.append(d.isoformat())
            d += timedelta(days=1)
    overrides = [o async for o in db.rate_overrides.find({}, {"_id": 0})]
    return {"blocked": blocked, "booked": booked, "rate_overrides": overrides}


# ---------------------------------------------------------------------------
# File upload (payment receipts)
# ---------------------------------------------------------------------------
@api_router.post("/uploads/receipt")
async def upload_receipt(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "png"
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/receipts/{str(user['_id'])}/{file_id}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/png")
    await db.files.insert_one({
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type or "image/png",
        "size": result.get("size", len(data)),
        "owner": str(user["_id"]),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"file_id": file_id}


@api_router.get("/files/{file_id}")
async def get_file(file_id: str, user: dict = Depends(get_current_user)):
    record = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    if user.get("role") != "host" and record["owner"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    data, ctype = get_object(record["storage_path"])
    return StarletteResponse(content=data, media_type=record.get("content_type", ctype))


# ---------------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------------
def booking_public(bk: dict, reveal_address: bool = False) -> dict:
    out = {k: v for k, v in bk.items() if k != "_id"}
    if reveal_address and bk.get("status") == "confirmed":
        out["address"] = PROPERTY["secret_address"]
        out["maps_link"] = PROPERTY["secret_maps"]
    else:
        out["address"] = None
        out["maps_link"] = None
    return out


@api_router.post("/bookings")
async def create_booking(body: BookingInput, user: dict = Depends(get_current_user)):
    quote = await compute_quote(body.check_in, body.check_out, body.guests, body.payment_option)

    # availability check
    avail = await availability()
    unavailable = set(avail["blocked"]) | set(avail["booked"])
    d = date.fromisoformat(body.check_in)
    end = date.fromisoformat(body.check_out)
    while d < end:
        if d.isoformat() in unavailable:
            raise HTTPException(status_code=409, detail=f"Dates unavailable: {d.isoformat()}")
        d += timedelta(days=1)

    booking_id = str(uuid.uuid4())
    doc = {
        "id": booking_id,
        "user_id": str(user["_id"]),
        "guest_name": user.get("name", ""),
        "guest_email": user["email"],
        "guest_phone": body.guest_phone,
        "check_in": body.check_in,
        "check_out": body.check_out,
        "guests": body.guests,
        "num_nights": quote["num_nights"],
        "quote": quote,
        "total": quote["total"],
        "amount_due": quote["amount_due"],
        "balance_due": quote["balance_due"],
        "payment_option": quote["payment_option"],
        "transaction_ref": body.transaction_ref,
        "receipt_file_id": body.receipt_file_id,
        "special_requests": body.special_requests or "",
        "status": "pending",
        "reviewed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(doc)
    return {"booking": booking_public(doc, reveal_address=True), "id": booking_id}


@api_router.get("/bookings/my")
async def my_bookings(user: dict = Depends(get_current_user)):
    items = []
    async for bk in db.bookings.find({"user_id": str(user["_id"])}).sort("created_at", -1):
        items.append(booking_public(bk, reveal_address=True))
    return {"bookings": items}


@api_router.get("/bookings")
async def all_bookings(host: dict = Depends(require_host)):
    items = []
    async for bk in db.bookings.find({}).sort("created_at", -1):
        out = {k: v for k, v in bk.items() if k != "_id"}
        out["address"] = PROPERTY["secret_address"] if out.get("status") == "confirmed" else None
        out["maps_link"] = PROPERTY["secret_maps"] if out.get("status") == "confirmed" else None
        items.append(out)
    return {"bookings": items}


@api_router.post("/bookings/{booking_id}/approve")
async def approve_booking(booking_id: str, host: dict = Depends(require_host)):
    bk = await db.bookings.find_one({"id": booking_id})
    if not bk:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "confirmed", "confirmed_at": datetime.now(timezone.utc).isoformat()}})
    bk["status"] = "confirmed"
    return {"booking": booking_public(bk, reveal_address=True), "address": PROPERTY["secret_address"], "maps_link": PROPERTY["secret_maps"]}


@api_router.post("/bookings/{booking_id}/reject")
async def reject_booking(booking_id: str, host: dict = Depends(require_host)):
    bk = await db.bookings.find_one({"id": booking_id})
    if not bk:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "rejected"}})
    return {"ok": True}


@api_router.post("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str, host: dict = Depends(require_host)):
    bk = await db.bookings.find_one({"id": booking_id})
    if not bk:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "completed"}})
    return {"ok": True}


@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    bk = await db.bookings.find_one({"id": booking_id})
    if not bk:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user.get("role") != "host" and bk["user_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not allowed")
    check_in = date.fromisoformat(bk["check_in"])
    checkin_dt = datetime(check_in.year, check_in.month, check_in.day, 12, 0, tzinfo=timezone.utc)
    hours = (checkin_dt - datetime.now(timezone.utc)).total_seconds() / 3600.0
    paid = bk.get("amount_due", 0)
    if hours >= 96:
        refund_pct, refund = 100, paid
    else:
        refund_pct, refund = 40, round(paid * 0.40)
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled", "refund_amount": refund, "refund_percent": refund_pct}})
    return {"ok": True, "refund_amount": refund, "refund_percent": refund_pct}


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------
@api_router.get("/reviews")
async def list_reviews():
    items = []
    async for r in db.reviews.find({}, {"_id": 0}).sort("created_at", -1):
        items.append(r)
    avg = round(sum(r["rating"] for r in items) / len(items), 2) if items else 0
    return {"reviews": items, "average": avg, "count": len(items)}


@api_router.post("/reviews")
async def create_review(body: ReviewInput, user: dict = Depends(get_current_user)):
    bk = await db.bookings.find_one({"id": body.booking_id})
    if not bk or bk["user_id"] != str(user["_id"]):
        raise HTTPException(status_code=404, detail="Booking not found")
    if bk.get("status") != "completed":
        raise HTTPException(status_code=403, detail="You can only review after your stay is completed")
    if bk.get("reviewed"):
        raise HTTPException(status_code=400, detail="You have already reviewed this stay")
    doc = {
        "id": str(uuid.uuid4()),
        "booking_id": body.booking_id,
        "user_id": str(user["_id"]),
        "guest_name": user.get("name", "Guest"),
        "rating": body.rating,
        "comment": body.comment,
        "verified": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reviews.insert_one(doc)
    await db.bookings.update_one({"id": body.booking_id}, {"$set": {"reviewed": True}})
    doc.pop("_id", None)
    return {"review": {k: v for k, v in doc.items() if k != "_id"}}


# ---------------------------------------------------------------------------
# Host calendar controls
# ---------------------------------------------------------------------------
@api_router.post("/host/block")
async def block_dates(body: BlockInput, host: dict = Depends(require_host)):
    for d in body.dates:
        await db.blocked_dates.update_one({"date": d}, {"$set": {"date": d}}, upsert=True)
    return {"ok": True}


@api_router.post("/host/unblock")
async def unblock_dates(body: BlockInput, host: dict = Depends(require_host)):
    await db.blocked_dates.delete_many({"date": {"$in": body.dates}})
    return {"ok": True}


@api_router.post("/host/rate-override")
async def set_rate_override(body: RateOverrideInput, host: dict = Depends(require_host)):
    await db.rate_overrides.update_one({"date": body.date}, {"$set": {"date": body.date, "rate": body.rate}}, upsert=True)
    return {"ok": True}


@api_router.delete("/host/rate-override/{d}")
async def del_rate_override(d: str, host: dict = Depends(require_host)):
    await db.rate_overrides.delete_many({"date": d})
    return {"ok": True}


@api_router.get("/host/stats")
async def host_stats(host: dict = Depends(require_host)):
    total_revenue = 0
    pending = 0
    confirmed = 0
    upcoming = 0
    today = date.today()
    async for bk in db.bookings.find({}):
        if bk.get("status") == "confirmed":
            confirmed += 1
            total_revenue += bk.get("amount_due", 0)
            if date.fromisoformat(bk["check_in"]) >= today:
                upcoming += 1
        elif bk.get("status") == "completed":
            total_revenue += bk.get("total", 0)
        elif bk.get("status") == "pending":
            pending += 1
    return {"total_revenue": total_revenue, "pending": pending, "confirmed": confirmed, "upcoming": upcoming}


# ---------------------------------------------------------------------------
# Quick reply templates
# ---------------------------------------------------------------------------
@api_router.get("/host/quick-replies")
async def list_quick_replies(host: dict = Depends(require_host)):
    items = [q async for q in db.quick_replies.find({}, {"_id": 0}).sort("created_at", 1)]
    return {"templates": items}


@api_router.post("/host/quick-replies")
async def create_quick_reply(body: QuickReplyInput, host: dict = Depends(require_host)):
    doc = {"id": str(uuid.uuid4()), "title": body.title, "message": body.message, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.quick_replies.insert_one(doc)
    return {"template": {k: v for k, v in doc.items() if k != "_id"}}


@api_router.put("/host/quick-replies/{qid}")
async def update_quick_reply(qid: str, body: QuickReplyInput, host: dict = Depends(require_host)):
    await db.quick_replies.update_one({"id": qid}, {"$set": {"title": body.title, "message": body.message}})
    return {"ok": True}


@api_router.delete("/host/quick-replies/{qid}")
async def delete_quick_reply(qid: str, host: dict = Depends(require_host)):
    await db.quick_replies.delete_many({"id": qid})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
DEFAULT_TEMPLATES = [
    {"title": "Check-in Instructions", "message": "Hello! Warm welcome to Nestavia Zirakpur. Your check-in is from 2 PM. Please share your ID on arrival. Reach out anytime — Dr. Gurpreet Kaur."},
    {"title": "Directions", "message": "Here is the exact location for your confirmed stay: Unit No. 1001, 10th Floor, Maya Garden Magnesia Tower-1, PR-7 Airport road, ZIRAKPUR, PUNJAB 140603. Map: https://maps.app.goo.gl/Qb1YFdH2ay7NKLwY6"},
    {"title": "Thank You", "message": "Thank you for staying at Nestavia! We'd love a review on Instagram @Nestavia_stays. Safe travels!"},
]


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.bookings.create_index("id")
        await db.blocked_dates.create_index("date", unique=True)
    except Exception as e:
        logger.warning(f"Index creation: {e}")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Dr. Gurpreet Kaur", "phone": PROPERTY["host_whatsapp"],
            "role": "host", "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Host account seeded")
    else:
        updates = {"role": "host"}
        if not verify_password(admin_password, existing["password_hash"]):
            updates["password_hash"] = hash_password(admin_password)
        await db.users.update_one({"email": admin_email}, {"$set": updates})

    if await db.quick_replies.count_documents({}) == 0:
        for t in DEFAULT_TEMPLATES:
            await db.quick_replies.insert_one({"id": str(uuid.uuid4()), **t, "created_at": datetime.now(timezone.utc).isoformat()})

    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
