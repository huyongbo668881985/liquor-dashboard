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

  const purchase = await prisma.$transaction(async (tx) => {
    const created = await tx.directPurchase.create({
      data: {
        date: new Date(body.date),
        productId: body.productId,
        quantity: body.quantity,
        amount: body.amount,
        remark: body.remark || "",
      },
      include: { product: true },
    });

    // 采购发货是真实花出去的进货款，自动同步生成一笔现金流出记录
    if (created.amount > 0) {
      await tx.cashFlow.create({
        data: {
          date: created.date,
          type: "out",
          amount: created.amount,
          remark: `直营采购发货 - ${created.product.name} × ${created.quantity}`,
          sourceType: "direct_purchase",
          sourceId: created.id,
        },
      });
    }

    return created;
  });

  return NextResponse.json(purchase);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");

  await prisma.$transaction(async (tx) => {
    await tx.cashFlow.deleteMany({ where: { sourceType: "direct_purchase", sourceId: id } });
    await tx.directPurchase.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
