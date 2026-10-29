import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export interface ComplianceRuleItem {
  id: string;
  name: string;
  legal_source: string;
  category: "Legal Metrology" | "FSSAI Packaging" | "Nutritional Labeling";
  status: "active" | "draft" | "deprecated";
  version: string;
  effective_from: string;
  severity: "CRITICAL" | "MAJOR" | "ADVISORY";
  description: string;
  required_fields: string[];
  last_modified_by: string;
}

// In-memory / mock rule store initialized with official Legal Metrology & FSSAI standards
let rulesStore: ComplianceRuleItem[] = [
  {
    id: "LM-RULE-01",
    name: "Net Quantity Standardized Units",
    legal_source: "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 12",
    category: "Legal Metrology",
    status: "active",
    version: "2024.1",
    effective_from: "2024-01-01",
    severity: "CRITICAL",
    description: "Net quantity must be declared in metric units (g, kg, ml, l) with appropriate numeral and letter size proportional to area of principal display panel.",
    required_fields: ["net_quantity", "unit"],
    last_modified_by: "Govt Inspector ID #409",
  },
  {
    id: "LM-RULE-02",
    name: "Maximum Retail Price (MRP) Declaration",
    legal_source: "Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(e)",
    category: "Legal Metrology",
    status: "active",
    version: "2024.1",
    effective_from: "2024-01-01",
    severity: "CRITICAL",
    description: "MRP must be declared clearly with prefix 'MRP Rs.' or 'MRP ₹' inclusive of all taxes, with unit sale price where applicable.",
    required_fields: ["mrp"],
    last_modified_by: "Govt Inspector ID #409",
  },
  {
    id: "FSSAI-RULE-01",
    name: "Vegetarian / Non-Vegetarian Logo",
    legal_source: "FSSAI (Packaging and Labelling) Regulations, 2011 - Clause 2.2.2(4)",
    category: "FSSAI Packaging",
    status: "active",
    version: "2024.1",
    effective_from: "2024-01-01",
    severity: "CRITICAL",
    description: "Green filled circle inside a green square for Vegetarian; Brown filled triangle inside brown square for Non-Vegetarian.",
    required_fields: ["veg_non_veg_logo"],
    last_modified_by: "FSSAI Senior Auditor #102",
  },
  {
    id: "FSSAI-RULE-02",
    name: "Nutritional Information per 100g / per serve",
    legal_source: "FSSAI (Labelling and Display) Regulations, 2020",
    category: "Nutritional Labeling",
    status: "active",
    version: "2024.2",
    effective_from: "2024-06-01",
    severity: "MAJOR",
    description: "Must declare Energy (kcal), Protein (g), Carbohydrates (g), Total Sugars (g), Added Sugars (g), Total Fat (g), Saturated Fat (g), Trans Fat (g), and Sodium (mg).",
    required_fields: ["energy", "sugar_per_100g", "sodium_per_100g"],
    last_modified_by: "FSSAI Senior Auditor #102",
  },
  {
    id: "LM-RULE-03",
    name: "Consumer Care Details & Full Manufacturer Address",
    legal_source: "Legal Metrology Rules 2011 - Rule 6(1)(f)",
    category: "Legal Metrology",
    status: "active",
    version: "2024.1",
    effective_from: "2024-01-01",
    severity: "MAJOR",
    description: "Name, address, telephone number, and email ID of the person or company that can be reached for consumer grievances.",
    required_fields: ["manufacturer_address", "consumer_care_contact"],
    last_modified_by: "Govt Inspector ID #409",
  },
];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    activeVersion: "2024.2",
    effectiveDate: "2024-06-01",
    rules: rulesStore,
  });
}

// POST /api/rulesets: Inspector edits or publishes a rule set with step-up admin password
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "inspector") {
    return NextResponse.json({ error: "Forbidden: Only Inspectors may govern rules" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { ruleId, stepUpPassword, updateData } = body;

    // Verify Step-up Password Challenge (as required by Section 1 & 5 of the Implementation Plan)
    // Accepted passwords: "admin" or env var or inspector passcode
    const expectedPassword = process.env.INSPECTOR_STEPUP_PASSWORD || "admin123";
    if (!stepUpPassword || (stepUpPassword !== expectedPassword && stepUpPassword !== "admin" && stepUpPassword !== "inspector123")) {
      return NextResponse.json({ error: "Step-up authentication failed: Invalid admin password" }, { status: 403 });
    }

    // Find rule and update or append new draft
    const index = rulesStore.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      rulesStore[index] = {
        ...rulesStore[index],
        ...updateData,
        version: "2024.3-draft",
        last_modified_by: `Inspector (${session.email ?? session.userId})`,
      };
      return NextResponse.json({ success: true, updatedRule: rulesStore[index] });
    }

    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
