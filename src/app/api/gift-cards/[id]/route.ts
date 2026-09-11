import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/gift-cards/${id}`), { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: await request.text() });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "The gift card could not be updated." }, { status: 503 }); }
}
