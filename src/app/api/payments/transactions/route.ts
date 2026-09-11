import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    const query = request.nextUrl.searchParams.toString();
    const response = await fetch(getAdminApiUrl(`admin/payments/transactions${query ? `?${query}` : "?page=1&perPage=100"}`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "Transactions are unavailable." }, { status: 503 }); }
}
