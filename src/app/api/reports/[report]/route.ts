import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

const allowed = new Set(["sales", "products", "customers", "inventory", "orders", "category-brand-sales", "coupons", "geography"]);

export async function GET(request: NextRequest, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  if (!allowed.has(report)) return NextResponse.json({ message: "Unknown report." }, { status: 404 });
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/reports/${report}${request.nextUrl.search}`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "Reports are unavailable." }, { status: 503 }); }
}
