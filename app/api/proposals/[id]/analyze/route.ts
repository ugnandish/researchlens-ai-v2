import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/ollama";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // 1. Fetch proposal
    const proposal = await prisma.proposal.findUnique({
      where: {
        id,
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

    // 2. Build analysis prompt
    const prompt = `
You are a research proposal analysis assistant.

Analyze the following research proposal carefully.

Do NOT invent facts that are not present in the proposal.
Do NOT assign a funding probability or funding score.
Focus on qualitative research analysis.

Return ONLY valid JSON using exactly this structure:

{
  "summary": "Brief summary of the proposal",
  "researchProblem": "What problem the research addresses",
  "objectives": [
    "Objective 1",
    "Objective 2"
  ],
  "methodology": "Summary of the proposed methodology",
  "novelty": "Assessment of the research novelty based only on the proposal",
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "weaknesses": [
    "Weakness 1",
    "Weakness 2"
  ],
  "researchGaps": [
    "Potential gap 1",
    "Potential gap 2"
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}

Research proposal:

---
${proposal.text}
---

Remember:
- Return JSON only.
- Do not use Markdown.
- Do not include explanations outside the JSON.
`;

    // 3. Ask Ollama to analyze the proposal
    const response = await generateText(prompt);

    // 4. Parse model response
    let analysisResult;

    try {
        const cleanedResponse = response
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

        analysisResult = JSON.parse(cleanedResponse);
    } catch {
        console.error("Invalid JSON returned by Ollama:", response);

        return NextResponse.json(
            {
                success: false,
                error: "AI returned invalid JSON",
                rawResponse: response,
            },
            { status: 500 }
        );
    }

    // 5. Save analysis to PostgreSQL
    const analysis = await prisma.analysis.upsert({
      where: {
        proposalId: proposal.id,
      },
      update: {
        result: analysisResult,
        summary: analysisResult.summary ?? null,
      },
      create: {
        proposalId: proposal.id,
        result: analysisResult,
        summary: analysisResult.summary ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      proposalId: proposal.id,
      analysis,
    });
  } catch (error) {
    console.error("Proposal analysis failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown analysis error",
      },
      { status: 500 }
    );
  }
}