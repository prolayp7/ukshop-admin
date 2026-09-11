import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  const { id } = await context.params;
  try {
    const response = await fetch(getAdminApiUrl(`admin/returns/${id}/receive`), { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "The return could not be marked received." }, { status: 503 }); }
}
