import qdrant, { COLLECTION_NAME } from "./qdrant";
import { generateEmbedding } from "./ollama";

export async function storeProposalVector(
  proposalId: string,
  text: string,
  section?: string
) {
  const embedding = await generateEmbedding(text);

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: crypto.randomUUID(),
        vector: embedding,
        payload: {
          proposalId,
          text,
          section: section || null,
        },
      },
    ],
  });

  return {
    proposalId,
    dimensions: embedding.length,
  };
}

export async function searchSimilarProposals(
  text: string,
  limit = 5
) {
  const embedding = await generateEmbedding(text);

  const results = await qdrant.query(COLLECTION_NAME, {
    query: embedding,
    limit,
    with_payload: true,
  });

  return results;
}