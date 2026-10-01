import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const proposal = await prisma.proposal.findUnique({
      where: {
        id,
      },
      include: {
        analysis: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        {
          success: false,
          error: "Proposal not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (error) {
    console.error("Failed to fetch proposal:", error);

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