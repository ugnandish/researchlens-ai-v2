import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storeProposalVector } from "@/lib/vector-store";
import { extractTextFromDocument } from "@/lib/document-parser";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please upload a PDF, DOCX, or TXT file.",
        },
        { status: 400 }
      );
    }

    const text = await extractTextFromDocument(file);

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "No text could be extracted from the uploaded document.",
        },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.create({
      data: {
        filename: file.name,
        text,
        status: "uploaded",
      },
    });

    const vectorResult = await storeProposalVector(
      proposal.id,
      text,
      "full-proposal"
    );

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposal.id,
        filename: proposal.filename,
        status: proposal.status,
        textLength: text.length,
        createdAt: proposal.createdAt,
      },
      vector: vectorResult,
    });
  } catch (error) {
    console.error("Document upload failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown upload error",
      },
      { status: 500 }
    );
  }
}