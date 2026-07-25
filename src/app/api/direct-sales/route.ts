import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const sales = await prisma.directSale.findMany({
    include: { product: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sale = await prisma.directSale.create({
    data: {
      date: new Date(body.date),
      productId: body.productId,
      quantity: body.quantity,
      amount: body.amount,
      received: body.received || 0,
    },
    include: { product: true },
  });
  return NextResponse.json(sale);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await prisma.directSale.delete({ where: { id } });
  return NextResponse.json({ success: true });
}