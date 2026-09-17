import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const expenses = await prisma.distributionGeneralExpense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const amount = Number(body.amount);
  if (!body.date || !body.category || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "请填写日期、费用类别和大于 0 的金额" }, { status: 400 });
  }

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.distributionGeneralExpense.create({
      data: { date: new Date(body.date), category: body.category, amount, remark: body.remark || "" },
    });
    await tx.cashFlow.create({
      data: {
        date: created.date,
        type: "out",
        amount: created.amount,
        remark: `分销整体费用 - ${created.category}${created.remark ? "：" + created.remark : ""}`,
        sourceType: "distribution_general_expense",
        sourceId: created.id,
      },
    });
    return created;
  });
  return NextResponse.json(expense);
}

export async function DELETE(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "费用记录不存在" }, { status: 400 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.cashFlow.deleteMany({ where: { sourceType: "distribution_general_expense", sourceId: id } });
    await tx.distributionGeneralExpense.delete({ where: { id } });
  });
  return NextResponse.json({ success: true });
}
