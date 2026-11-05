import { NextResponse } from "next/server";
import { getAdminApiUrl } from "@/lib/auth";

export async function GET() {
  try {
    const response = await fetch(getAdminApiUrl("settings/general"), { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ message: "Store branding is unavailable." }, { status: response.status });
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const settings = payload.data && typeof payload.data === "object"
      ? payload.data as Record<string, unknown>
      : payload;

    return NextResponse.json({
      data: { brandName: typeof settings.brandName === "string" ? settings.brandName : "" },
    });
  } catch {
    return NextResponse.json({ message: "Store branding is unavailable." }, { status: 503 });
  }
}
