-- Anti-Counterfeit & Fake Product Detection Engine Schema (LabelLens India Edition)
-- Creates product_master_templates, counterfeit_detection_logs, enums, RLS policies, and seed golden templates.

-- 1. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE counterfeit_verdict AS ENUM ('AUTHENTIC', 'SUSPECTED_FAKE', 'CRITICAL_COUNTERFEIT_RISK');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE flag_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. PRODUCT MASTER TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS product_master_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  official_barcode TEXT,
  expected_fssai_license TEXT, -- 14-digit statutory license string
  allowed_batch_regex TEXT,     -- e.g. '^[A-Z]{2}[0-9]{4,6}$'
  authorized_cities JSONB DEFAULT '[]'::jsonb, -- e.g. ["Mumbai", "Delhi", "Bangalore"] for geo-routing verification
  golden_extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb, -- Canonical verified ingredients, net_quantity, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_master_barcode_idx 
  ON product_master_templates (official_barcode) 
  WHERE official_barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS product_master_brand_name_idx 
  ON product_master_templates (lower(brand_name), lower(product_name));

-- 3. COUNTERFEIT DETECTION LOGS TABLE
CREATE TABLE IF NOT EXISTS counterfeit_detection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  authenticity_score FLOAT NOT NULL CHECK (authenticity_score >= 0.0 AND authenticity_score <= 1.0),
  verdict counterfeit_verdict NOT NULL,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  geo_location JSONB, -- Optional lat, lng, city, state from scan metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS counterfeit_logs_scan_idx 
  ON counterfeit_detection_logs (scan_id);

CREATE INDEX IF NOT EXISTS counterfeit_logs_verdict_idx 
  ON counterfeit_detection_logs (verdict);

-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE product_master_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterfeit_detection_logs ENABLE ROW LEVEL SECURITY;

-- Product Master Templates Policies:
-- Manufacturers can manage their own templates
CREATE POLICY master_templates_manufacturer_all ON product_master_templates
  FOR ALL
  USING (manufacturer_id = auth.uid())
  WITH CHECK (manufacturer_id = auth.uid());

-- Inspectors can read all master templates
CREATE POLICY master_templates_inspector_read ON product_master_templates
  FOR SELECT
  USING (current_role_name() = 'inspector');

-- Customers can read master templates for verification comparison
CREATE POLICY master_templates_customer_read ON product_master_templates
  FOR SELECT
  USING (true);

-- Counterfeit Detection Logs Policies:
-- Inspectors can inspect all counterfeit logs
CREATE POLICY counterfeit_logs_inspector_read ON counterfeit_detection_logs
  FOR SELECT
  USING (current_role_name() = 'inspector');

-- Customers can view logs linked to their own scans
CREATE POLICY counterfeit_logs_owner_read ON counterfeit_detection_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scans s 
      WHERE s.id = scan_id AND s.owner_id = auth.uid()
    )
  );

-- Allow authenticated users & server backend to insert detection logs
CREATE POLICY counterfeit_logs_insert ON counterfeit_detection_logs
  FOR INSERT
  WITH CHECK (true);

-- 5. REALTIME PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE counterfeit_detection_logs;

-- 6. SEED INITIAL GOLDEN MASTER TEMPLATES (Indian Domestic Standards)
INSERT INTO product_master_templates (
  brand_name,
  product_name,
  official_barcode,
  expected_fssai_license,
  allowed_batch_regex,
  authorized_cities,
  golden_extracted_fields
) VALUES 
(
  'Britannia',
  'NutriChoice Digestive',
  '8901063142213',
  '10015043001129',
  '^(BRT|NT)[0-9]{6}[A-Z]?$',
  '["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune"]'::jsonb,
  '{
    "product_name": "NutriChoice Digestive High Fibre",
    "brand": "Britannia",
    "net_quantity": "100 g",
    "fssai_license": "10015043001129",
    "veg_non_veg": "veg",
    "ingredients": "Refined Wheat Flour (Maida 55%), Edible Vegetable Oil (Refined Palm Oil), Sugar, Wheat Bran (4.5%), Invert Sugar Syrup, Raising Agents [INS 503(ii), INS 500(ii)], Iodised Salt",
    "energy_kcal": "482",
    "protein_g": "8.2",
    "total_sugar_g": "22.0",
    "sodium_mg": "280"
  }'::jsonb
),
(
  'Lay''s',
  'India''s Magic Masala',
  '8901491101991',
  '10014064000435',
  '^(PEP|LAY)[0-9]{5,7}$',
  '["Delhi", "Mumbai", "Kolkata", "Bengaluru", "Jaipur", "Lucknow", "Ahmedabad"]'::jsonb,
  '{
    "product_name": "Lay''s India''s Magic Masala Potato Chips",
    "brand": "Lay''s",
    "net_quantity": "50 g",
    "fssai_license": "10014064000435",
    "veg_non_veg": "veg",
    "ingredients": "Potato, Edible Vegetable Oil (Palmolein), Seasoning (Spices and Condiments, Iodized Salt, Sugar, Black Salt, Tomato Powder, Onion Powder, Garlic Powder)",
    "energy_kcal": "555",
    "protein_g": "7.0",
    "total_sugar_g": "3.5",
    "sodium_mg": "887"
  }'::jsonb
)
ON CONFLICT (official_barcode) DO NOTHING;
