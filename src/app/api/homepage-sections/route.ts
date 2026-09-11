import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    const response = await fetch(getAdminApiUrl("admin/homepage-sections"), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "Homepage sections are unavailable." }, { status: 503 }); }
}
