import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

const SETTING_KEY = "branding.assets";

function unauthorised() {
  return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return unauthorised();

  try {
    const response = await fetch(getAdminApiUrl("admin/settings"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ([]));
    if (!response.ok) return NextResponse.json(payload, { status: response.status });
    const settings = (Array.isArray(payload) ? payload : payload.data ?? []) as Array<{ key: string; value: unknown }>;
    return NextResponse.json({ data: settings.find((item) => item.key === SETTING_KEY)?.value ?? {} });
  } catch {
    return NextResponse.json({ message: "Brand settings are unavailable." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return unauthorised();

  try {
    const response = await fetch(getAdminApiUrl(`admin/settings/${SETTING_KEY}`), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: await request.json() }),
      cache: "no-store",
    });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Brand settings could not be saved." }, { status: 503 });
  }
}
