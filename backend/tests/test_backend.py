"""Backend regression tests for Live Shop Manager."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fb-live-manager-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@liveshop.mn", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# -------- Auth --------
def test_login_ok():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@liveshop.mn", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data and data["user"]["email"] == "admin@liveshop.mn"


def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@liveshop.mn", "password": "wrong"})
    assert r.status_code == 401


def test_register_and_me():
    email = f"test_{uuid.uuid4().hex[:8]}@t.mn"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw123456", "name": "T"})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_me_unauth():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code in (401, 403)


def test_products_require_auth():
    r = requests.get(f"{API}/products")
    assert r.status_code in (401, 403)


# -------- Products --------
def test_list_seeded_products(auth):
    r = requests.get(f"{API}/products", headers=auth)
    assert r.status_code == 200
    prods = r.json()
    codes = {p["productCode"] for p in prods}
    assert {"A12", "B01", "C01", "D05"}.issubset(codes)


def test_product_crud(auth):
    code = f"Z{uuid.uuid4().hex[:4].upper()}"
    payload = {
        "productCode": code, "productName": "Test", "price": 1000, "category": "T",
        "variants": [{"color": "Хар", "size": "M", "stock": 5}],
    }
    r = requests.post(f"{API}/products", json=payload, headers=auth)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    payload["price"] = 2000
    r = requests.put(f"{API}/products/{pid}", json=payload, headers=auth)
    assert r.status_code == 200 and r.json()["price"] == 2000
    r = requests.delete(f"{API}/products/{pid}", headers=auth)
    assert r.status_code == 200 and r.json()["deleted"] == 1


# -------- Sessions & Parser --------
@pytest.fixture(scope="session")
def session_id(auth):
    r = requests.get(f"{API}/sessions", headers=auth)
    assert r.status_code == 200
    sessions = r.json()
    if sessions:
        return sessions[0]["id"]
    r = requests.post(f"{API}/sessions", json={"name": "Test"}, headers=auth)
    return r.json()["id"]


def test_create_session(auth):
    r = requests.post(f"{API}/sessions", json={"name": "Unit"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["status"] == "active"


def test_parse_mongolian(auth, session_id):
    text = "Болор A12 хар M 1 авъя\nСараа B01 улаан L 2 ширхэг\nЗүгээр коммент\nBogus X99 xl 1"
    r = requests.post(f"{API}/sessions/parse", json={"sessionId": session_id, "text": text}, headers=auth)
    assert r.status_code == 200, r.text
    orders = r.json()["orders"]
    assert len(orders) == 4
    # Order 1: A12 хар M 1 -> should match product (pending) or review if stock gone
    o1 = orders[0]
    assert o1["productCode"] == "A12"
    assert o1["color"] == "Хар"
    assert o1["size"] == "M"
    assert o1["quantity"] == 1
    assert o1["status"] in ("pending", "review")
    # Order 2: B01 улаан L 2
    o2 = orders[1]
    assert o2["productCode"] == "B01"
    assert o2["color"] == "Улаан"
    assert o2["size"] == "L"
    assert o2["quantity"] == 2
    # Order 3: no product code -> review
    o3 = orders[2]
    assert o3["status"] == "review"
    assert o3["productCode"] == ""
    # Order 4: product not found
    o4 = orders[3]
    assert o4["status"] == "review"


# -------- Orders --------
def test_orders_list_and_filter(auth):
    r = requests.get(f"{API}/orders", headers=auth)
    assert r.status_code == 200 and len(r.json()) >= 4
    r = requests.get(f"{API}/orders?status=pending", headers=auth)
    assert r.status_code == 200
    assert all(o["status"] == "pending" for o in r.json())


def test_cancel_releases_stock(auth):
    # Create a fresh product+order to test
    code = f"Y{uuid.uuid4().hex[:4].upper()}"
    prod = {"productCode": code, "productName": "Y", "price": 100, "category": "T",
            "variants": [{"color": "Хар", "size": "M", "stock": 5}]}
    p = requests.post(f"{API}/products", json=prod, headers=auth).json()
    o = requests.post(f"{API}/orders", json={"buyerName": "B", "phone": "11", "productCode": code,
                                             "color": "Хар", "size": "M", "quantity": 2}, headers=auth).json()
    assert o["status"] == "pending"
    # stock should be 3
    p2 = [x for x in requests.get(f"{API}/products", headers=auth).json() if x["productCode"] == code][0]
    assert p2["variants"][0]["stock"] == 3
    # Cancel
    r = requests.put(f"{API}/orders/{o['id']}", json={"status": "cancelled"}, headers=auth)
    assert r.status_code == 200
    p3 = [x for x in requests.get(f"{API}/products", headers=auth).json() if x["productCode"] == code][0]
    assert p3["variants"][0]["stock"] == 5
    requests.delete(f"{API}/products/{p['id']}", headers=auth)


def test_expired_hold_releases_stock(auth):
    code = f"H{uuid.uuid4().hex[:4].upper()}"
    prod = {"productCode": code, "productName": "Hold", "price": 100, "category": "T",
            "variants": [{"color": "Хар", "size": "M", "stock": 5}]}
    p = requests.post(f"{API}/products", json=prod, headers=auth).json()
    o = requests.post(f"{API}/orders", json={"buyerName": "HoldBuyer", "phone": "99000000", "productCode": code,
                                             "color": "Хар", "size": "M", "quantity": 2}, headers=auth).json()
    assert o["status"] == "pending"
    assert o.get("reservedUntil") is not None

    past = "2000-01-01T00:00:00+00:00"
    r = requests.put(f"{API}/orders/{o['id']}", json={"reservedUntil": past}, headers=auth)
    assert r.status_code == 200

    r = requests.post(f"{API}/orders/release-expired", headers=auth)
    assert r.status_code == 200
    assert r.json()["released"] >= 1
    assert o["id"] in r.json()["orders"]

    expired = [x for x in requests.get(f"{API}/orders?status=expired", headers=auth).json() if x["id"] == o["id"]]
    assert len(expired) == 1

    p2 = [x for x in requests.get(f"{API}/products", headers=auth).json() if x["productCode"] == code][0]
    assert p2["variants"][0]["stock"] == 5
    requests.delete(f"{API}/products/{p['id']}", headers=auth)


def test_released_stock_summary(auth, session_id):
    code = f"S{uuid.uuid4().hex[:4].upper()}"
    prod = {"productCode": code, "productName": "Summary", "price": 200, "category": "T",
            "variants": [{"color": "Улаан", "size": "L", "stock": 5}]}
    requests.post(f"{API}/products", json=prod, headers=auth)
    o = requests.post(f"{API}/orders", json={"sessionId": session_id, "buyerName": "SummaryBuyer", "phone": "99111111", "productCode": code,
                                             "color": "Улаан", "size": "L", "quantity": 1}, headers=auth).json()
    assert o["status"] == "pending"
    past = "2000-01-01T00:00:00+00:00"
    requests.put(f"{API}/orders/{o['id']}", json={"reservedUntil": past}, headers=auth)
    r = requests.post(f"{API}/orders/release-expired?sessionId={session_id}", headers=auth)
    assert r.status_code == 200

    summary = requests.get(f"{API}/sessions/{session_id}/released-stock-summary", headers=auth)
    assert summary.status_code == 200
    data = summary.json()
    assert any(item["productCode"] == code and item["quantity"] >= 1 for item in data)


# -------- Payments --------
def test_payment_exact_match(auth):
    # Create product+pending order with unique buyer
    code = f"P{uuid.uuid4().hex[:4].upper()}"
    buyer = f"Buyer_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().hex[:7]}"
    requests.post(f"{API}/products", json={"productCode": code, "productName": "P", "price": 5000, "category": "T",
                                           "variants": [{"color": "Хар", "size": "M", "stock": 5}]}, headers=auth)
    o = requests.post(f"{API}/orders", json={"buyerName": buyer, "phone": phone, "productCode": code,
                                             "color": "Хар", "size": "M", "quantity": 2}, headers=auth).json()
    assert o["amount"] == 10000
    # Exact match (now requires auth)
    r = requests.post(f"{API}/payments/match", json={"buyerName": buyer, "phone": phone, "amount": 10000}, headers=auth)
    assert r.status_code == 200
    assert r.json()["result"] == "paid"


def test_payment_underpaid(auth):
    code = f"U{uuid.uuid4().hex[:4].upper()}"
    buyer = f"UB_{uuid.uuid4().hex[:6]}"
    phone = f"8{uuid.uuid4().hex[:7]}"
    requests.post(f"{API}/products", json={"productCode": code, "productName": "U", "price": 3000, "category": "T",
                                           "variants": [{"color": "Хар", "size": "M", "stock": 5}]}, headers=auth)
    requests.post(f"{API}/orders", json={"buyerName": buyer, "phone": phone, "productCode": code,
                                         "color": "Хар", "size": "M", "quantity": 1}, headers=auth)
    r = requests.post(f"{API}/payments/match", json={"buyerName": buyer, "phone": phone, "amount": 1000}, headers=auth)
    assert r.json()["result"] == "underpaid"


def test_payment_overpaid(auth):
    code = f"O{uuid.uuid4().hex[:4].upper()}"
    buyer = f"OB_{uuid.uuid4().hex[:6]}"
    phone = f"7{uuid.uuid4().hex[:7]}"
    requests.post(f"{API}/products", json={"productCode": code, "productName": "O", "price": 3000, "category": "T",
                                           "variants": [{"color": "Хар", "size": "M", "stock": 5}]}, headers=auth)
    requests.post(f"{API}/orders", json={"buyerName": buyer, "phone": phone, "productCode": code,
                                         "color": "Хар", "size": "M", "quantity": 1}, headers=auth)
    r = requests.post(f"{API}/payments/match", json={"buyerName": buyer, "phone": phone, "amount": 9999}, headers=auth)
    assert r.json()["result"] == "overpaid"


# -------- Packing / Dashboard --------
def test_packing_and_pack(auth):
    r = requests.get(f"{API}/packing", headers=auth)
    assert r.status_code == 200
    groups = r.json()
    # find a group with an unpacked paid order
    target = None
    for g in groups:
        for item in g["items"]:
            if item["status"] == "paid":
                target = item
                break
        if target:
            break
    if target:
        r = requests.put(f"{API}/orders/{target['id']}/pack", headers=auth)
        assert r.status_code == 200


def test_dashboard_stats(auth):
    r = requests.get(f"{API}/dashboard/stats", headers=auth)
    assert r.status_code == 200
    d = r.json()
    for k in ["todayLives", "pending", "paid", "review", "packed", "totalSales", "lowStockCount", "lowStock"]:
        assert k in d


def test_payment_match_requires_auth():
    """After multi-tenant hardening, /api/payments/match requires authentication for shop scope."""
    r = requests.post(f"{API}/payments/match", json={"buyerName": "nobody_xyz", "phone": "000", "amount": 1})
    assert r.status_code == 401
