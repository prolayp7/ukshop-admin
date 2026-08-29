import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

function unauthorised() {
  return NextResponse.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return unauthorised();

  const query = request.nextUrl.searchParams.toString();

  try {
    const response = await fetch(getAdminApiUrl(`admin/media${query ? `?${query}` : ""}`), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "The media service is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return unauthorised();

  try {
    const formData = await request.formData();
    const response = await fetch(getAdminApiUrl("admin/media"), {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "The upload could not be completed." }, { status: 503 });
  }
}
