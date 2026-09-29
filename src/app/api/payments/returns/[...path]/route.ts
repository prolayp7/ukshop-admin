import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, getAdminApiUrl } from "@/lib/auth";

// Return detail, workflow actions, inspection uploads and private images: forwarded as-is to admin/returns/*.
async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  const { path } = await context.params;
  const contentType = request.headers.get("content-type");
  try {
    const response = await fetch(getAdminApiUrl(`admin/returns/${path.map(encodeURIComponent).join("/")}`), {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, ...(contentType ? { "Content-Type": contentType } : {}) },
      body: request.method === "POST" ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
    const type = response.headers.get("content-type") ?? "";
    if (response.ok && type.startsWith("image/")) return new NextResponse(response.body, { headers: { "Content-Type": type, "Cache-Control": "private, no-store" } });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch { return NextResponse.json({ message: "The returns service is unavailable." }, { status: 503 }); }
}

export { forward as GET, forward as POST };
