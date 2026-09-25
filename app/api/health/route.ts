import { NextResponse } from "next/server";
import { databaseHealth } from "@/lib/db";

export async function GET() {
  try {
    await databaseHealth();
    return NextResponse.json({ status: "ready", database: "connected" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "not_ready", database: "unavailable" }, { status: 503 });
  }
}
