import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const expenses = await prisma.directExpense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const expense = await prisma.directExpense.create({
    data: {
      date: new Date(body.date),
      category: body.category,
      amount: body.amount,
      remark: body.remark || "",
    },
  });
  return NextResponse.json(expense);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await prisma.directExpense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}