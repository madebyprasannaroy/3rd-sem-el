-- Anti-Counterfeit & Fake Product Detection Engine Schema (LabelLens India Edition)
-- Creates product_master_templates, counterfeit_detection_logs, enums, RLS policies, and seed golden templates.

DO $$ BEGIN
  CREATE TYPE counterfeit_verdict AS ENUM ('AUTHENTIC', 'SUSPECTED_FAKE', 'CRITICAL_COUNTERFEIT_RISK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE flag_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS product_master_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  official_barcode TEXT,
  expected_fssai_license TEXT,
  allowed_batch_regex TEXT,
  authorized_cities JSONB DEFAULT '[]'::jsonb,
  golden_extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_master_barcode_idx 
  ON product_master_templates (official_barcode) 
  WHERE official_barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_master_brand_name_idx 
  ON product_master_templates (lower(brand_name), lower(product_name));

CREATE TABLE IF NOT EXISTS counterfeit_detection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  authenticity_score FLOAT NOT NULL CHECK (authenticity_score >= 0.0 AND authenticity_score <= 1.0),
  verdict counterfeit_verdict NOT NULL,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  geo_location JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS counterfeit_logs_scan_idx 
  ON counterfeit_detection_logs (scan_id);

CREATE INDEX IF NOT EXISTS counterfeit_logs_verdict_idx 
  ON counterfeit_detection_logs (verdict);

ALTER TABLE product_master_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterfeit_detection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY master_templates_manufacturer_all ON product_master_templates
  FOR ALL
  USING (manufacturer_id = auth.uid())
  WITH CHECK (manufacturer_id = auth.uid());

CREATE POLICY master_templates_inspector_read ON product_master_templates
  FOR SELECT
  USING (current_role_name() = 'inspector');

CREATE POLICY master_templates_customer_read ON product_master_templates
  FOR SELECT
  USING (true);

CREATE POLICY counterfeit_logs_inspector_read ON counterfeit_detection_logs
  FOR SELECT
  USING (current_role_name() = 'inspector');

CREATE POLICY counterfeit_logs_owner_read ON counterfeit_detection_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scans s 
      WHERE s.id = scan_id AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY counterfeit_logs_insert ON counterfeit_detection_logs
  FOR INSERT
  WITH CHECK (true);
