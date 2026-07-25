import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const distributors = await prisma.distributor.findMany({
    include: {
      shipments: { include: { product: true } },
      expensePlans: true,
      distributorExpenses: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(distributors);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const distributor = await prisma.distributor.create({
    data: { name: body.name, region: body.region || "", remark: body.remark || "" },
  });
  return NextResponse.json(distributor);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await prisma.distributor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}