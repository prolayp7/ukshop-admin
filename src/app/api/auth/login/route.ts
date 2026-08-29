import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  authCookieOptions,
  getAdminApiUrl,
} from "@/lib/auth";

type AdminUser = {
  id: number;
  email: string;
  name: string;
  roleId: number;
  permissionKeys: string[];
};

type LoginResponse = {
  data?: {
    accessToken?: string;
    refreshToken?: string;
    adminUser?: AdminUser;
  };
  message?: string | string[];
};

function errorMessage(payload: LoginResponse, status: number) {
  if (status === 401) return "The email or password is incorrect.";
  if (Array.isArray(payload.message)) return payload.message[0];
  if (typeof payload.message === "string") return payload.message;
  return "We couldn't sign you in. Please try again.";
}

export async function POST(request: Request) {
  let credentials: { email?: unknown; password?: unknown };

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: "Enter your email and password." }, { status: 400 });
  }

  if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
    return NextResponse.json({ message: "Enter your email and password." }, { status: 400 });
  }

  try {
    const apiResponse = await fetch(getAdminApiUrl("admin/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      }),
      cache: "no-store",
    });
    const payload = (await apiResponse.json().catch(() => ({}))) as LoginResponse;

    if (!apiResponse.ok) {
      return NextResponse.json(
        { message: errorMessage(payload, apiResponse.status) },
        { status: apiResponse.status },
      );
    }

    const { accessToken, refreshToken, adminUser } = payload.data ?? {};
    if (!accessToken || !refreshToken || !adminUser) {
      return NextResponse.json({ message: "The API returned an incomplete login response." }, { status: 502 });
    }

    const response = NextResponse.json({ adminUser });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      ...authCookieOptions,
      maxAge: 15 * 60,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...authCookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json(
      { message: "The admin API is unavailable. Check that it is running and try again." },
      { status: 503 },
    );
  }
}
