import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  const query = request.nextUrl.searchParams.toString();
  try {
    const response = await fetch(getAdminApiUrl(`admin/products/stock${query ? `?${query}` : ""}`), { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "The stock service is unavailable." }, { status: 503 });
  }
}
