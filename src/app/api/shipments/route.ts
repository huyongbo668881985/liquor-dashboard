import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const distributorId = searchParams.get("distributorId");
  const where = distributorId ? { distributorId: parseInt(distributorId) } : {};
  const shipments = await prisma.shipment.findMany({
    where,
    include: { product: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(shipments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const shipment = await prisma.shipment.create({
    data: {
      distributorId: body.distributorId,
      productId: body.productId,
      date: new Date(body.date),
      quantity: body.quantity,
      amount: body.amount,
    },
    include: { product: true },
  });
  return NextResponse.json(shipment);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await prisma.shipment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}