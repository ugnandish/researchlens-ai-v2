const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "gemma3:4b";

const OLLAMA_EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL || "embeddinggemma";

export async function generateText(prompt: string) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama generation failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return data.response as string;
}

export async function generateEmbedding(text: string) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama embedding failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  return data.embeddings[0] as number[];
}