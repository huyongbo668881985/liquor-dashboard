import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const expenses = await prisma.directExpense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.directExpense.create({
      data: {
        date: new Date(body.date),
        category: body.category,
        amount: body.amount,
        remark: body.remark || "",
      },
    });

    // 费用是真实花出去的钱，自动同步生成一笔现金流出记录
    if (created.amount > 0) {
      await tx.cashFlow.create({
        data: {
          date: created.date,
          type: "out",
          amount: created.amount,
          remark: `直营费用 - ${created.category}${created.remark ? "：" + created.remark : ""}`,
          sourceType: "direct_expense",
          sourceId: created.id,
        },
      });
    }

    return created;
  });

  return NextResponse.json(expense);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");

  await prisma.$transaction(async (tx) => {
    await tx.cashFlow.deleteMany({ where: { sourceType: "direct_expense", sourceId: id } });
    await tx.directExpense.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
