import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

async function mutate(request: NextRequest, context: RouteParams, method: "PATCH" | "DELETE") {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "Invalid product ID." }, { status: 400 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/products/${id}`), { method, headers: { Authorization: `Bearer ${accessToken}`, ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}) }, body: method === "PATCH" ? await request.text() : undefined, cache: "no-store" });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "The product service is unavailable." }, { status: 503 });
  }
}

export function PATCH(request: NextRequest, context: RouteParams) { return mutate(request, context, "PATCH"); }
export function DELETE(request: NextRequest, context: RouteParams) { return mutate(request, context, "DELETE"); }
