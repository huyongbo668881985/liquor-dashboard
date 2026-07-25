import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const distributorId = searchParams.get("distributorId");
  const where = distributorId ? { distributorId: parseInt(distributorId) } : {};
  const expenses = await prisma.distributorExpense.findMany({
    where,
    include: { product: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  let amount = body.amount || 0;

  // 如果是酒水费用，自动计算成本
  if (body.type === "product" && body.productId && body.quantity) {
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (product) {
      amount = product.cost * body.quantity;
    }
  }

  const expense = await prisma.distributorExpense.create({
    data: {
      distributorId: body.distributorId,
      type: body.type || "cash",
      amount,
      productId: body.productId || null,
      quantity: body.quantity || 0,
      date: new Date(body.date),
      remark: body.remark || "",
    },
    include: { product: true },
  });
  return NextResponse.json(expense);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await prisma.distributorExpense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}