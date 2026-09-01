import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

async function proxy(request: NextRequest, context: RouteContext<"/api/settings/integrations/[scope]">, method: "GET" | "PUT") {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Your session has expired." }, { status: 401 });
  const { scope } = await context.params;
  try {
    const response = await fetch(getAdminApiUrl(`admin/settings/integrations/${encodeURIComponent(scope)}`), { method, headers: { Authorization: `Bearer ${token}`, "X-Settings-Unlock": request.headers.get("x-settings-unlock") ?? "", ...(method === "PUT" ? { "Content-Type": "application/json" } : {}) }, ...(method === "PUT" ? { body: await request.text() } : {}), cache: "no-store" });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "Settings service is unavailable." }, { status: 503 }); }
}

export async function GET(request: NextRequest, context: RouteContext<"/api/settings/integrations/[scope]">) { return proxy(request, context, "GET"); }
export async function PUT(request: NextRequest, context: RouteContext<"/api/settings/integrations/[scope]">) { return proxy(request, context, "PUT"); }
