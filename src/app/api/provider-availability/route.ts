import { getProviderAvailabilitySnapshot } from "@/features/comparator/domain/providerAvailability";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("forceRefresh") === "true";
  const snapshot = await getProviderAvailabilitySnapshot(forceRefresh);
  return NextResponse.json(snapshot);
}
