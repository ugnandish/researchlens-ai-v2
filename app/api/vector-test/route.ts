import { NextResponse } from "next/server";
import {
  storeProposalVector,
  searchSimilarProposals,
} from "@/lib/vector-store";

export async function POST() {
  try {
    const proposalId = "test-proposal-001";

    const text = `
      This research proposal investigates the use of artificial intelligence
      to improve early detection of cardiovascular diseases using medical
      imaging and machine learning. The study proposes developing a deep
      learning model and evaluating its performance on clinical datasets.
    `;

    const stored = await storeProposalVector(
      proposalId,
      text,
      "abstract"
    );

    const results = await searchSimilarProposals(
      "Artificial intelligence for detecting heart disease from medical images",
      5
    );

    return NextResponse.json({
      success: true,
      stored,
      results,
    });
  } catch (error) {
    console.error("Vector test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}