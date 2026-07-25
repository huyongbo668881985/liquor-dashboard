import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const cashflows = await prisma.cashFlow.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(cashflows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cf = await prisma.cashFlow.create({
    data: {
      date: new Date(body.date),
      type: body.type,
      amount: body.amount,
      remark: body.remark || "",
    },
  });
  return NextResponse.json(cf);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");

  const record = await prisma.cashFlow.findUnique({ where: { id } });
  if (record?.sourceType) {
    return NextResponse.json(
      { error: "该记录由其他模块自动生成，请到对应的销售/费用/发货记录里删除源记录" },
      { status: 400 }
    );
  }

  await prisma.cashFlow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}