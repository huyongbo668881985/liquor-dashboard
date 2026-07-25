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

  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        distributorId: body.distributorId,
        productId: body.productId,
        date: new Date(body.date),
        quantity: body.quantity,
        amount: body.amount,
      },
      include: { product: true, distributor: true },
    });

    // 分销发货只把"毛利"部分计入现金流（发货成本本身走采购发货那边的现金流出，这里不重复计）
    const grossProfit = created.amount - created.quantity * created.product.cost;
    if (grossProfit !== 0) {
      await tx.cashFlow.create({
        data: {
          date: created.date,
          type: grossProfit > 0 ? "in" : "out",
          amount: Math.abs(grossProfit),
          remark: `分销毛利 - ${created.distributor.name} / ${created.product.name}`,
          sourceType: "shipment",
          sourceId: created.id,
        },
      });
    }

    return created;
  });

  return NextResponse.json(shipment);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");

  await prisma.$transaction(async (tx) => {
    await tx.cashFlow.deleteMany({ where: { sourceType: "shipment", sourceId: id } });
    await tx.shipment.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
