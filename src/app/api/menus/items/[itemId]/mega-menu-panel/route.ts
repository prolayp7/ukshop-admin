import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/menus/items/${itemId}/mega-menu-panel`), { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: await request.text() });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "The mega menu panel could not be saved." }, { status: 503 }); }
}
