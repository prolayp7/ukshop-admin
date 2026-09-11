import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; bandId: string }> }) {
  const { id, bandId } = await params;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  try {
    const response = await fetch(getAdminApiUrl(`admin/shipping-methods/${id}/rate-bands/${bandId}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "The rate band could not be removed." }, { status: 503 }); }
}
