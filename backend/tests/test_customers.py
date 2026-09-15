"""Backend tests for Customer blacklist / watchlist feature."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://fb-live-manager-1.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def auth():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": "admin@liveshop.mn", "password": "admin123"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def session_id(auth):
    sessions = requests.get(f"{API}/sessions", headers=auth).json()
    if sessions:
        return sessions[0]["id"]
    r = requests.post(
        f"{API}/sessions",
        json={"name": "TEST_customer_session"},
        headers=auth,
    )
    return r.json()["id"]


# ---------- /customers list and seeded watchlist ----------
def test_list_customers_requires_auth():
    r = requests.get(f"{API}/customers")
    assert r.status_code in (401, 403)


def test_list_customers_contains_seeded_watchlist(auth):
    r = requests.get(f"{API}/customers", headers=auth)
    assert r.status_code == 200, r.text
    customers = r.json()
    assert isinstance(customers, list)
    temuu = next(
        (c for c in customers if c.get("buyerName") == "Тэмүүлэн"), None
    )
    assert temuu is not None, "Seed watchlisted Тэмүүлэн not found"
    assert temuu["status"] == "watchlist"
    assert temuu["phone"] == "99887766"


# ---------- POST /customers/blacklist ----------
def test_blacklist_creates_record(auth):
    name = f"TEST_BL_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().int % 10**7:07d}"
    r = requests.post(
        f"{API}/customers/blacklist",
        json={"buyerName": name, "phone": phone, "reason": "demo bad"},
        headers=auth,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "blacklisted"
    assert data["reason"] == "demo bad"
    assert data["buyerName"] == name
    assert data["phone"] == phone
    # Verify lookup returns same
    look = requests.get(
        f"{API}/customers/lookup", params={"phone": phone}, headers=auth
    )
    assert look.status_code == 200
    assert look.json()["status"] == "blacklisted"


# ---------- POST /customers/watchlist + lookup phone-first/name-fallback ----------
def test_watchlist_and_lookup_phone_first_then_name(auth):
    name = f"TEST_WL_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().int % 10**7:07d}"
    r = requests.post(
        f"{API}/customers/watchlist",
        json={"buyerName": name, "phone": phone, "reason": "watch"},
        headers=auth,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "watchlist"

    # name fallback (no phone)
    look = requests.get(
        f"{API}/customers/lookup", params={"buyerName": name}, headers=auth
    )
    assert look.status_code == 200
    assert look.json()["status"] == "watchlist"

    # phone-first
    look2 = requests.get(
        f"{API}/customers/lookup", params={"phone": phone}, headers=auth
    )
    assert look2.json()["status"] == "watchlist"


# ---------- POST /customers/unblacklist ----------
def test_unblacklist_resets_to_normal(auth):
    name = f"TEST_UN_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().int % 10**7:07d}"
    requests.post(
        f"{API}/customers/blacklist",
        json={"buyerName": name, "phone": phone, "reason": "x"},
        headers=auth,
    )
    r = requests.post(
        f"{API}/customers/unblacklist",
        json={"buyerName": name, "phone": phone},
        headers=auth,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "normal"


# ---------- PUT /customers/{id} ----------
def test_update_customer_fields(auth):
    name = f"TEST_UP_{uuid.uuid4().hex[:6]}"
    r = requests.post(
        f"{API}/customers/watchlist",
        json={"buyerName": name, "reason": "init"},
        headers=auth,
    )
    cid = r.json()["id"]
    upd = requests.put(
        f"{API}/customers/{cid}",
        json={"notes": "updated note", "reason": "changed"},
        headers=auth,
    )
    assert upd.status_code == 200, upd.text
    body = upd.json()
    assert body["notes"] == "updated note"
    assert body["reason"] == "changed"


# ---------- POST /orders for blacklisted customer (phone match) ----------
def test_order_blacklisted_via_phone_review_no_stock(auth):
    name = f"TEST_BLO_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().int % 10**7:07d}"
    requests.post(
        f"{API}/customers/blacklist",
        json={"buyerName": name, "phone": phone, "reason": "no-show"},
        headers=auth,
    )
    # snapshot stock for A12 / Хар / M
    p = next(
        x
        for x in requests.get(f"{API}/products", headers=auth).json()
        if x["productCode"] == "A12"
    )
    variant = next(
        v for v in p["variants"] if v["color"] == "Хар" and str(v["size"]) == "M"
    )
    before = variant["stock"]

    r = requests.post(
        f"{API}/orders",
        json={
            "buyerName": name,
            "phone": phone,
            "productCode": "A12",
            "color": "Хар",
            "size": "M",
            "quantity": 1,
        },
        headers=auth,
    )
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["status"] == "review"
    assert o["customerStatus"] == "blacklisted"
    assert "Хар жагсаалт" in (o.get("note") or "")

    # stock should NOT be reserved
    p2 = next(
        x
        for x in requests.get(f"{API}/products", headers=auth).json()
        if x["productCode"] == "A12"
    )
    after = next(
        v for v in p2["variants"] if v["color"] == "Хар" and str(v["size"]) == "M"
    )["stock"]
    assert after == before, f"Stock changed for blacklisted: {before} -> {after}"


# ---------- POST /orders for watchlist customer ----------
def test_order_watchlist_normal_flow_with_warning(auth):
    name = f"TEST_WLO_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().int % 10**7:07d}"
    requests.post(
        f"{API}/customers/watchlist",
        json={"buyerName": name, "phone": phone, "reason": "watch"},
        headers=auth,
    )
    r = requests.post(
        f"{API}/orders",
        json={
            "buyerName": name,
            "phone": phone,
            "productCode": "A12",
            "color": "Хар",
            "size": "M",
            "quantity": 1,
        },
        headers=auth,
    )
    assert r.status_code == 200, r.text
    o = r.json()
    assert o["customerStatus"] == "watchlist"
    # if stock available -> pending; else review (still warning note)
    assert o["status"] in ("pending", "review")
    assert "Анхаарах" in (o.get("note") or "") or o["status"] == "review"


# ---------- POST /sessions/parse with blacklisted name ----------
def test_parse_comments_blacklisted_by_name(auth, session_id):
    name = f"TESTBL{uuid.uuid4().hex[:5]}"
    requests.post(
        f"{API}/customers/blacklist",
        json={"buyerName": name, "reason": "demo"},
        headers=auth,
    )
    text = f"{name} A12 хар M 1 авъя"
    r = requests.post(
        f"{API}/sessions/parse",
        json={"sessionId": session_id, "text": text},
        headers=auth,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] >= 1
    o = body["orders"][0]
    assert o["status"] == "review"
    assert o["customerStatus"] == "blacklisted"
    assert "Хар жагсаалт" in (o.get("note") or "")


# ---------- GET /orders has fresh customerStatus ----------
def test_orders_list_customer_status_is_fresh(auth):
    name = f"TEST_FR_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().int % 10**7:07d}"
    # create order with watchlisted customer
    requests.post(
        f"{API}/customers/watchlist",
        json={"buyerName": name, "phone": phone},
        headers=auth,
    )
    requests.post(
        f"{API}/orders",
        json={
            "buyerName": name,
            "phone": phone,
            "productCode": "A12",
            "color": "Хар",
            "size": "M",
            "quantity": 1,
        },
        headers=auth,
    )
    # now blacklist same customer
    requests.post(
        f"{API}/customers/blacklist",
        json={"buyerName": name, "phone": phone, "reason": "now bl"},
        headers=auth,
    )
    orders = requests.get(f"{API}/orders", headers=auth).json()
    mine = [o for o in orders if o.get("buyerName") == name]
    assert mine, "Created order missing"
    assert all(
        o["customerStatus"] == "blacklisted" for o in mine
    ), f"Expected fresh blacklisted status, got: {[o['customerStatus'] for o in mine]}"


# ---------- PUT /orders/{id} cancelled increments cancelledCount ----------
def test_cancel_order_increments_cancelled_count(auth):
    name = f"TEST_CN_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().int % 10**7:07d}"
    # create normal order (auto-creates customer)
    o = requests.post(
        f"{API}/orders",
        json={
            "buyerName": name,
            "phone": phone,
            "productCode": "A12",
            "color": "Хар",
            "size": "M",
            "quantity": 1,
        },
        headers=auth,
    ).json()

    look = requests.get(
        f"{API}/customers/lookup", params={"phone": phone}, headers=auth
    ).json()
    before = look.get("cancelledCount", 0)

    upd = requests.put(
        f"{API}/orders/{o['id']}",
        json={"status": "cancelled"},
        headers=auth,
    )
    assert upd.status_code == 200, upd.text

    look2 = requests.get(
        f"{API}/customers/lookup", params={"phone": phone}, headers=auth
    ).json()
    after = look2.get("cancelledCount", 0)
    assert after == before + 1, f"cancelledCount {before}->{after}"


# ---------- POST /payments/match underpaid increments unpaidCount ----------
def test_underpaid_payment_increments_unpaid_count(auth):
    name = f"TEST_UP_{uuid.uuid4().hex[:6]}"
    phone = f"9{uuid.uuid4().int % 10**7:07d}"
    # create pending order
    o = requests.post(
        f"{API}/orders",
        json={
            "buyerName": name,
            "phone": phone,
            "productCode": "A12",
            "color": "Хар",
            "size": "M",
            "quantity": 1,
        },
        headers=auth,
    ).json()
    assert o["status"] == "pending", f"Expected pending, got {o['status']}: {o}"

    look = requests.get(
        f"{API}/customers/lookup", params={"phone": phone}, headers=auth
    ).json()
    before = look.get("unpaidCount", 0)

    # send underpayment (now requires auth)
    pay = requests.post(
        f"{API}/payments/match",
        json={"buyerName": name, "phone": phone, "amount": 1000},
        headers=auth,
    )
    assert pay.status_code == 200, pay.text
    assert pay.json()["result"] == "underpaid", pay.json()

    look2 = requests.get(
        f"{API}/customers/lookup", params={"phone": phone}, headers=auth
    ).json()
    after = look2.get("unpaidCount", 0)
    assert after == before + 1, f"unpaidCount {before}->{after}"


# ---------- Auth required for all customer endpoints ----------
@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/customers", None),
        ("get", "/customers/lookup?phone=99887766", None),
        ("post", "/customers/blacklist", {"buyerName": "x"}),
        ("post", "/customers/watchlist", {"buyerName": "x"}),
        ("post", "/customers/unblacklist", {"buyerName": "x"}),
        ("put", "/customers/none", {"notes": "x"}),
    ],
)
def test_customer_endpoints_require_auth(method, path, body):
    fn = getattr(requests, method)
    r = fn(f"{API}{path}", json=body) if body is not None else fn(f"{API}{path}")
    assert r.status_code in (401, 403), f"{method} {path} -> {r.status_code}"
