import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
async function proxy(request: NextRequest, context: Context, method: "PATCH" | "DELETE") {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "Invalid attribute ID." }, { status: 400 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/product-attributes/${id}`), { method, headers: { Authorization: `Bearer ${token}`, ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}) }, ...(method === "PATCH" ? { body: await request.text() } : {}), cache: "no-store" });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "Product attributes are unavailable." }, { status: 503 }); }
}
export function PATCH(request: NextRequest, context: Context) { return proxy(request, context, "PATCH"); }
export function DELETE(request: NextRequest, context: Context) { return proxy(request, context, "DELETE"); }
