import { getCompareRunSnapshot } from "@/features/comparator/domain/compareRunTracker";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId é obrigatório" }, { status: 400 });
  }
  const snapshot = getCompareRunSnapshot(runId);
  if (!snapshot) {
    return NextResponse.json({ error: "Execução não encontrada ou expirada" }, { status: 404 });
  }
  return NextResponse.json(snapshot);
}
