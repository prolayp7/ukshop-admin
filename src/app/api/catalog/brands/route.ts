import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    const response = await fetch(getAdminApiUrl("admin/brands?page=1&perPage=100"), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "Brands are unavailable." }, { status: 503 }); }
}
export async function POST(request: NextRequest) { const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value; if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 }); try { const response = await fetch(getAdminApiUrl("admin/brands"), { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: await request.text() }); return NextResponse.json(await response.json().catch(() => ({})), { status: response.status }); } catch { return NextResponse.json({ message: "Brand could not be created." }, { status: 503 }); } }
