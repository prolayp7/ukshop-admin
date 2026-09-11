import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: NextRequest, context: Context) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "Invalid attribute ID." }, { status: 400 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/product-attributes/${id}/values`), { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: await request.text(), cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "Attribute values are unavailable." }, { status: 503 }); }
}
