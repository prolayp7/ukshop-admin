import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

const SETTING_KEY = "footer.site";

const unauthorised = () => NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });

// Reads the storefront's public, already-normalised footer (defaults filled in), so the editor
// always shows exactly what shoppers currently see.
export async function GET(request: NextRequest) {
  if (!request.cookies.get(ACCESS_TOKEN_COOKIE)?.value) return unauthorised();
  try {
    const response = await fetch(getAdminApiUrl("settings/footer"), { cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Footer settings are unavailable." }, { status: 503 });
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
    return NextResponse.json({ message: "Footer settings could not be saved." }, { status: 503 });
  }
}
