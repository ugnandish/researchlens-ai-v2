import { QdrantClient } from "@qdrant/js-client-rest";

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://127.0.0.1:6333",
});

export const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION || "researchlens";

export async function ensureCollection() {
  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (collection) => collection.name === COLLECTION_NAME
  );

  if (!exists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: 768,
        distance: "Cosine",
      },
    });

    console.log(`Created Qdrant collection: ${COLLECTION_NAME}`);
  } else {
    console.log(`Qdrant collection already exists: ${COLLECTION_NAME}`);
  }
}

export default qdrant;