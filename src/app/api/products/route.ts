import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const query = request.nextUrl.searchParams.toString();
  try {
    const response = await fetch(getAdminApiUrl(`admin/products${query ? `?${query}` : ""}`), { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "The product service is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  try {
    const response = await fetch(getAdminApiUrl("admin/products"), { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: await request.text(), cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch { return NextResponse.json({ message: "The product could not be created." }, { status: 503 }); }
}
