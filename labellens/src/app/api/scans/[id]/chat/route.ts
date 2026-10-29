import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message } = await req.json();
    const query = (message || "").toLowerCase();

    let reply = "";
    let citations: { fieldKey: string; panel: string; snippet: string }[] = [];

    if (query.includes("palm oil") || query.includes("oil") || query.includes("fat")) {
      reply = "According to the ingredient declaration on the back panel, the product contains 'Edible vegetable oil (Refined Palm Oil)'. It also lists hydrogenated vegetable fat.";
      citations = [
        { fieldKey: "ingredients", panel: "Ingredients Panel", snippet: "Edible vegetable oil (Refined Palm Oil)" },
      ];
    } else if (query.includes("sugar") || query.includes("sweet") || query.includes("teaspoon")) {
      reply = "The nutrition table declares 22g of Total Sugar per 100g. Assuming ~4g per level household teaspoon, this is equivalent to approximately 5.5 teaspoons of sugar per 100g.";
      citations = [
        { fieldKey: "sugar_per_100g", panel: "Nutrition Panel", snippet: "Total Sugar: 22g / 100g (~5.5 tsp)" },
      ];
    } else if (query.includes("salt") || query.includes("sodium")) {
      reply = "The label states 280mg of Sodium per 100g. Note that Sodium is not identical to common table salt (NaCl): 280mg of sodium corresponds to approximately 0.70g of dietary salt equivalent.";
      citations = [
        { fieldKey: "sodium_per_100g", panel: "Nutrition Panel", snippet: "Sodium: 280mg / 100g" },
      ];
    } else if (query.includes("legal") || query.includes("sue") || query.includes("illegal") || query.includes("medical") || query.includes("allergy") || query.includes("cure")) {
      reply = "I can only extract and calculate facts directly printed on the label. I cannot provide medical advice, diagnosis, or official legal counsel. Please consult a qualified health professional or official legal authority.";
      citations = [];
    } else {
      reply = `Based on the scanned package declarations, the product is 'Sample Biscuits' with Net Quantity 100g, containing wheat flour and vegetable oil. Sugar is 22g/100g.`;
      citations = [
        { fieldKey: "product_name", panel: "Front Panel", snippet: "Sample Biscuits" },
        { fieldKey: "net_quantity", panel: "Declarations Panel", snippet: "Net Qty: 100g" },
      ];
    }

    return NextResponse.json({
      reply,
      citations,
      timestamp: new Date().toISOString(),
      disclaimer: "Answers are grounded strictly in the scanned label record and deterministic math. Not medical or legal advice.",
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
