import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const distributorId = searchParams.get("distributorId");
  const where = distributorId ? { distributorId: parseInt(distributorId) } : {};
  const plans = await prisma.expensePlan.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const plan = await prisma.expensePlan.create({
    data: {
      distributorId: body.distributorId,
      name: body.name,
      amount: body.amount,
      remark: body.remark || "",
    },
  });
  return NextResponse.json(plan);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const plan = await prisma.expensePlan.update({
    where: { id: body.id },
    data: { name: body.name, amount: body.amount, remark: body.remark || "" },
  });
  return NextResponse.json(plan);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "0");
  await prisma.expensePlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}