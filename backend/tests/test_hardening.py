"""
Regression tests for production hardening:
- Multi-tenant shop isolation (seller A cannot see seller B data)
- Duplicate bank-statement row protection
- Audit log records key actions (paid / cancelled / blacklist / payment match)
"""
import os
import uuid
import requests

API = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://fb-live-manager-1.preview.emergentagent.com"
).rstrip("/") + "/api"


def _register():
    """Register a new isolated seller and return (auth_header, user_dict)."""
    email = f"u_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw12345", "name": email})
    assert r.status_code == 200, r.text
    body = r.json()
    return ({"Authorization": f"Bearer {body['access_token']}"}, body["user"])


# ============================================================
# 1. Multi-tenant isolation
# ============================================================
def test_shop_isolation_products():
    auth_a, user_a = _register()
    auth_b, user_b = _register()
    assert user_a["shopId"] != user_b["shopId"], "each seller must get its own shop"

    code_a = f"AA{uuid.uuid4().hex[:5].upper()}"
    code_b = f"BB{uuid.uuid4().hex[:5].upper()}"

    requests.post(f"{API}/products", json={
        "productCode": code_a, "productName": "A's product", "price": 100,
        "category": "T", "variants": [{"color": "Хар", "size": "M", "stock": 5}]
    }, headers=auth_a)
    requests.post(f"{API}/products", json={
        "productCode": code_b, "productName": "B's product", "price": 200,
        "category": "T", "variants": [{"color": "Цагаан", "size": "L", "stock": 3}]
    }, headers=auth_b)

    a_codes = {p["productCode"] for p in requests.get(f"{API}/products", headers=auth_a).json()}
    b_codes = {p["productCode"] for p in requests.get(f"{API}/products", headers=auth_b).json()}
    assert code_a in a_codes
    assert code_a not in b_codes, "Seller B must NOT see Seller A's product"
    assert code_b in b_codes
    assert code_b not in a_codes, "Seller A must NOT see Seller B's product"


def test_shop_isolation_orders_and_dashboard():
    auth_a, _ = _register()
    auth_b, _ = _register()

    code = f"OI{uuid.uuid4().hex[:5].upper()}"
    requests.post(f"{API}/products", json={
        "productCode": code, "productName": "X", "price": 1000,
        "category": "T", "variants": [{"color": "Хар", "size": "M", "stock": 5}]
    }, headers=auth_a)
    requests.post(f"{API}/orders", json={
        "buyerName": f"B_{uuid.uuid4().hex[:5]}", "phone": "1111", "productCode": code,
        "color": "Хар", "size": "M", "quantity": 1
    }, headers=auth_a)

    # Seller B should see no orders for this shop, no products from A
    b_orders = requests.get(f"{API}/orders", headers=auth_b).json()
    assert all(o.get("productCode") != code for o in b_orders), "Seller B should not see A's order"

    # Dashboard for B should be empty / minimal
    stats_b = requests.get(f"{API}/dashboard/stats", headers=auth_b).json()
    assert stats_b["pending"] == 0
    assert stats_b["paid"] == 0


def test_shop_isolation_customers():
    auth_a, _ = _register()
    auth_b, _ = _register()
    name = f"Cust_{uuid.uuid4().hex[:5]}"
    requests.post(f"{API}/customers/blacklist",
                  json={"buyerName": name, "phone": "9911", "reason": "demo"}, headers=auth_a)
    list_b = requests.get(f"{API}/customers", headers=auth_b).json()
    assert all(c["buyerName"] != name for c in list_b), "Seller B should not see A's customer"
    list_a = requests.get(f"{API}/customers", headers=auth_a).json()
    assert any(c["buyerName"] == name for c in list_a)


def test_shop_cannot_update_other_shop_product():
    auth_a, _ = _register()
    auth_b, _ = _register()
    code = f"X{uuid.uuid4().hex[:5].upper()}"
    p = requests.post(f"{API}/products", json={
        "productCode": code, "productName": "P", "price": 100,
        "category": "T", "variants": [{"color": "Хар", "size": "M", "stock": 1}]
    }, headers=auth_a).json()
    pid = p["id"]
    # Seller B tries to update -> 404 (not found in their shop)
    r = requests.put(f"{API}/products/{pid}", json={
        "productCode": code, "productName": "Hijacked", "price": 1,
        "category": "T", "variants": []
    }, headers=auth_b)
    assert r.status_code == 404


# ============================================================
# 2. Duplicate bank-statement protection
# ============================================================
def test_bank_statement_duplicate_protection():
    auth, _ = _register()
    code = f"DD{uuid.uuid4().hex[:5].upper()}"
    buyer = f"Dup_{uuid.uuid4().hex[:5]}"
    phone = f"77{uuid.uuid4().int % 10**6:06d}"
    requests.post(f"{API}/products", json={
        "productCode": code, "productName": "D", "price": 5000,
        "category": "T", "variants": [{"color": "Хар", "size": "M", "stock": 5}]
    }, headers=auth)
    requests.post(f"{API}/orders", json={
        "buyerName": buyer, "phone": phone, "productCode": code,
        "color": "Хар", "size": "M", "quantity": 1
    }, headers=auth)

    paid_at = "2025-02-15T08:00:00Z"
    row = {"buyerName": buyer, "phone": phone, "amount": 5000, "note": code, "paidAt": paid_at}
    r1 = requests.post(f"{API}/payments/bank-statement", json={"rows": [row]}, headers=auth)
    assert r1.status_code == 200
    res1 = r1.json()["results"][0]
    assert res1["result"] == "paid", res1

    # Re-import same row -> must NOT re-apply
    r2 = requests.post(f"{API}/payments/bank-statement", json={"rows": [row]}, headers=auth)
    res2 = r2.json()["results"][0]
    assert res2["result"] == "duplicate", f"second import must be duplicate, got: {res2}"


# ============================================================
# 3. Audit log records actions
# ============================================================
def _audit(auth, **filters):
    r = requests.get(f"{API}/audit-logs", params=filters, headers=auth)
    assert r.status_code == 200
    return r.json()


def test_audit_log_order_paid_and_cancelled():
    auth, _ = _register()
    code = f"AUD{uuid.uuid4().hex[:4].upper()}"
    requests.post(f"{API}/products", json={
        "productCode": code, "productName": "AU", "price": 1000,
        "category": "T", "variants": [{"color": "Хар", "size": "M", "stock": 5}]
    }, headers=auth)
    o = requests.post(f"{API}/orders", json={
        "buyerName": "AuditB", "phone": "55555555", "productCode": code,
        "color": "Хар", "size": "M", "quantity": 1
    }, headers=auth).json()
    oid = o["id"]

    requests.put(f"{API}/orders/{oid}", json={"status": "paid"}, headers=auth)
    requests.put(f"{API}/orders/{oid}", json={"status": "cancelled"}, headers=auth)

    logs = _audit(auth, entityType="order")
    actions_for_o = {l["action"] for l in logs if l.get("entityId") == oid}
    assert "order_created" in actions_for_o, f"missing order_created in {actions_for_o}"
    assert "order_paid" in actions_for_o, f"missing order_paid in {actions_for_o}"
    assert "order_cancelled" in actions_for_o, f"missing order_cancelled in {actions_for_o}"

    # stock_released audit also recorded
    stock_logs = _audit(auth, entityType="product", action="stock_released")
    assert any(l.get("metadata", {}).get("orderId") == oid for l in stock_logs)


def test_audit_log_blacklist():
    auth, _ = _register()
    name = f"BL_{uuid.uuid4().hex[:5]}"
    requests.post(f"{API}/customers/blacklist",
                  json={"buyerName": name, "reason": "scam"}, headers=auth)
    logs = _audit(auth, action="customer_blacklisted")
    assert any(l.get("metadata", {}).get("buyerName") == name for l in logs)


def test_audit_log_payment_match():
    auth, _ = _register()
    code = f"AMP{uuid.uuid4().hex[:4].upper()}"
    buyer = f"PM_{uuid.uuid4().hex[:5]}"
    phone = f"66{uuid.uuid4().int % 10**6:06d}"
    requests.post(f"{API}/products", json={
        "productCode": code, "productName": "M", "price": 2500,
        "category": "T", "variants": [{"color": "Хар", "size": "M", "stock": 3}]
    }, headers=auth)
    requests.post(f"{API}/orders", json={
        "buyerName": buyer, "phone": phone, "productCode": code,
        "color": "Хар", "size": "M", "quantity": 1
    }, headers=auth)
    # Exact match
    r = requests.post(f"{API}/payments/match",
                      json={"buyerName": buyer, "phone": phone, "amount": 2500}, headers=auth)
    assert r.json()["result"] == "paid"

    logs = _audit(auth, action="payment_paid")
    assert any(l.get("metadata", {}).get("buyer") == buyer for l in logs)


def test_audit_log_isolated_per_shop():
    auth_a, _ = _register()
    auth_b, _ = _register()
    name = f"AUD_ISO_{uuid.uuid4().hex[:5]}"
    requests.post(f"{API}/customers/blacklist",
                  json={"buyerName": name, "reason": "x"}, headers=auth_a)
    logs_b = _audit(auth_b)
    assert all(l.get("metadata", {}).get("buyerName") != name for l in logs_b), \
        "Seller B should not see Seller A's audit logs"


# ============================================================
# 4. Payment event stores rich match metadata
# ============================================================
def test_payment_event_stores_match_details():
    auth, _ = _register()
    code = f"PE{uuid.uuid4().hex[:4].upper()}"
    buyer = f"PE_{uuid.uuid4().hex[:5]}"
    phone = f"55{uuid.uuid4().int % 10**6:06d}"
    requests.post(f"{API}/products", json={
        "productCode": code, "productName": "PE", "price": 7000,
        "category": "T", "variants": [{"color": "Хар", "size": "M", "stock": 3}]
    }, headers=auth)
    requests.post(f"{API}/orders", json={
        "buyerName": buyer, "phone": phone, "productCode": code,
        "color": "Хар", "size": "M", "quantity": 1
    }, headers=auth)

    requests.post(f"{API}/payments/bank-statement", json={"rows": [{
        "buyerName": buyer, "phone": phone, "amount": 7000, "note": code,
        "paidAt": "2025-03-01T10:00:00Z"
    }]}, headers=auth)

    history = requests.get(f"{API}/payments", headers=auth).json()
    mine = [h for h in history if h.get("buyerName") == buyer]
    assert mine, "payment event should be recorded"
    ev = mine[0]
    assert ev.get("source") == "bank_statement"
    assert ev.get("dedupeKey")
    assert ev.get("matchReason")
    assert ev.get("matchedOrderIds")
    assert ev.get("paidAt")
    assert ev.get("rawInput")
