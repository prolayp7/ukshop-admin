import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }

  try {
    const apiResponse = await fetch(getAdminApiUrl("admin/me"), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const payload = await apiResponse.json().catch(() => ({}));

    return NextResponse.json(payload, { status: apiResponse.status });
  } catch {
    return NextResponse.json({ message: "The admin API is unavailable." }, { status: 503 });
  }
}

async function proxyMutation(request: NextRequest, path: string, method: "PATCH" | "POST") {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  try {
    const apiResponse = await fetch(getAdminApiUrl(path), {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
    });
    return NextResponse.json(await apiResponse.json().catch(() => ({})), { status: apiResponse.status });
  } catch {
    return NextResponse.json({ message: "The admin API is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  return proxyMutation(request, "admin/me", "PATCH");
}
