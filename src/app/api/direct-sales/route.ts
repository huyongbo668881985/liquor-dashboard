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
  const received = body.received || 0;

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.directSale.create({
      data: {
        date: new Date(body.date),
        productId: body.productId,
        quantity: body.quantity,
        amount: body.amount,
        received,
      },
      include: { product: true },
    });

    // 已收金额 > 0 时，自动同步生成一笔现金流入记录
    if (received > 0) {
      await tx.cashFlow.create({
        data: {
          date: created.date,
          type: "in",
          amount: received,
          remark: `直营销售回款 - ${created.product.name}`,
          sourceType: "direct_sale",
          sourceId: created.id,
        },
      });
    }

    return created;
  });

  return NextResponse.json(sale);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");

  await prisma.$transaction(async (tx) => {
    await tx.cashFlow.deleteMany({ where: { sourceType: "direct_sale", sourceId: id } });
    await tx.directSale.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
