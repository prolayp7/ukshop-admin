import { NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  // Each segment must start with an alphanumeric/underscore/hyphen char, not
  // a dot - blocks ".."/"." traversal segments while still allowing dots
  // inside filenames (e.g. "photo.jpg").
  if (!path || !/^\/uploads(\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*)+$/.test(path)) {
    return NextResponse.json({ message: "Invalid media path." }, { status: 400 });
  }

  try {
    const response = await fetch(`${getApiOrigin()}${path}`, { cache: "no-store" });
    if (!response.ok || !response.body) return new NextResponse(null, { status: response.status });

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
        "Content-Length": response.headers.get("Content-Length") ?? "",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
