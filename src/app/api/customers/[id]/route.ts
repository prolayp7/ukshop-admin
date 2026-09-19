import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

async function forward(request: NextRequest, context: RouteParams, method: "GET" | "PATCH" | "DELETE") {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "Invalid customer ID." }, { status: 400 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/customers/${id}`), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}) },
      body: method === "PATCH" ? await request.text() : undefined,
      cache: "no-store",
    });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch {
    return NextResponse.json({ message: "The customer account could not be updated." }, { status: 503 });
  }
}

export function GET(request: NextRequest, context: RouteParams) { return forward(request, context, "GET"); }
export function PATCH(request: NextRequest, context: RouteParams) { return forward(request, context, "PATCH"); }
export function DELETE(request: NextRequest, context: RouteParams) { return forward(request, context, "DELETE"); }
