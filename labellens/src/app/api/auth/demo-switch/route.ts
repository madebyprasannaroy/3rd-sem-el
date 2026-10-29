import { NextResponse, type NextRequest } from "next/server";
import { isRole } from "@/core/roles";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = NextResponse.json({ success: true, role: body.role ?? null });

    if (body.clear) {
      res.cookies.delete("labellens_demo_role");
      return res;
    }

    if (body.role && isRole(body.role)) {
      res.cookies.set("labellens_demo_role", body.role, {
        path: "/",
        httpOnly: false, // accessible to client for instant UI sync
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "lax",
      });
      return res;
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
