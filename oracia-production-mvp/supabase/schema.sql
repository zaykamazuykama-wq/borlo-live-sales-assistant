CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending_payment','paid','generating_report','report_generated','sending_email','fulfilled','report_failed','email_failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE webhook_event_status AS ENUM ('received','processing','processed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE email_delivery_status AS ENUM ('pending','processing','sent','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  birth_date DATE NOT NULL,
  birth_time TIME,
  birth_place TEXT,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'usd',
  status order_status NOT NULL DEFAULT 'pending_payment',
  report_html TEXT,
  report_pdf_path TEXT,
  download_token TEXT UNIQUE,
  download_expires_at TIMESTAMPTZ,
  download_count INTEGER NOT NULL DEFAULT 0,
  email_sent_at TIMESTAMPTZ,
  last_fulfillment_error_safe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES orders(id),
  event_type TEXT NOT NULL,
  status webhook_event_status NOT NULL DEFAULT 'received',
  locked_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_code TEXT,
  error_message_safe TEXT,
  safe_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  email_type TEXT NOT NULL,
  status email_delivery_status NOT NULL DEFAULT 'pending',
  locked_at TIMESTAMPTZ,
  provider_message_id TEXT,
  error_message_safe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE(order_id, email_type)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS webhook_events_set_updated_at ON webhook_events;
CREATE TRIGGER webhook_events_set_updated_at BEFORE UPDATE ON webhook_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS email_deliveries_set_updated_at ON email_deliveries;
CREATE TRIGGER email_deliveries_set_updated_at BEFORE UPDATE ON email_deliveries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION acquire_webhook_event_lock(p_stripe_event_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE webhook_events
  SET status='processing', locked_at=now(), processed_at=NULL, error_code=NULL, error_message_safe=NULL
  WHERE stripe_event_id=p_stripe_event_id
    AND (status IN ('received','failed') OR (status='processing' AND (locked_at IS NULL OR locked_at < now() - interval '15 minutes')));
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION acquire_email_delivery_lock(p_delivery_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE updated_count INTEGER;
BEGIN
  UPDATE email_deliveries
  SET status='processing', locked_at=now(), error_message_safe=NULL
  WHERE id=p_delivery_id
    AND (status IN ('pending','failed') OR (status='processing' AND (locked_at IS NULL OR locked_at < now() - interval '15 minutes')));
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION increment_download_count(p_order_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE orders SET download_count = download_count + 1 WHERE id = p_order_id;
END;
$$;

-- Create private Supabase Storage bucket named `reports`. It must not be public.
