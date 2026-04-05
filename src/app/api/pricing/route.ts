import { getPricingSnapshot } from "@/features/comparator/domain/pricingService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("forceRefresh") === "true";
    const snapshot = await getPricingSnapshot(forceRefresh);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar pricing" },
      { status: 500 }
    );
  }
}
