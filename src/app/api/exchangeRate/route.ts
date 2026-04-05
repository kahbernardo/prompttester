import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
      method: "GET",
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Erro ao buscar cotacao: ${response.status}`);
    }
    const data = (await response.json()) as { USDBRL?: { bid?: string } };
    const bid = Number(data.USDBRL?.bid ?? "0");
    if (!Number.isFinite(bid) || bid <= 0) {
      throw new Error("Cotacao invalida");
    }
    return NextResponse.json({
      pair: "USD/BRL",
      rate: bid,
      updatedAt: new Date().toISOString(),
      source: "awesomeapi"
    });
  } catch (error) {
    return NextResponse.json(
      {
        pair: "USD/BRL",
        rate: 5.2,
        updatedAt: new Date().toISOString(),
        source: "fallback",
        error: error instanceof Error ? error.message : "Erro ao buscar cotacao"
      },
      { status: 200 }
    );
  }
}
