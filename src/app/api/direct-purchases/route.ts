import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const purchases = await prisma.directPurchase.findMany({
    include: { product: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(purchases);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const purchase = await prisma.directPurchase.create({
    data: {
      date: new Date(body.date),
      productId: body.productId,
      quantity: body.quantity,
      amount: body.amount,
      remark: body.remark || "",
    },
    include: { product: true },
  });
  return NextResponse.json(purchase);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await prisma.directPurchase.delete({ where: { id } });
  return NextResponse.json({ success: true });
}