import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  try {
    const response = await fetch(getAdminApiUrl("admin/products/import"), { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: await request.formData(), cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "The import could not be completed." }, { status: 503 });
  }
}
