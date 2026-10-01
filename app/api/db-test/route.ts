import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.proposal.count();

    return NextResponse.json({
      success: true,
      proposalCount: count,
    });
  } catch (error) {
    console.error("Database test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown database error",
      },
      { status: 500 }
    );
  }
}