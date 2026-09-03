import { GoogleGenAI } from '@google/genai';
import type { DocumentChunk } from './types';

const MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-004';

function getClient() {
  const key = process.env.GEMINI_API_KEY || process.env.EMBEDDING_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

export async function embedText(text: string): Promise<number[]> {
  const client = getClient();
  if (!client) return [];
  const result = await client.models.embedContent({ model: MODEL, contents: text });
  return result.embeddings?.[0]?.values || [];
}

export async function embedChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
  const output: DocumentChunk[] = [];
  for (const chunk of chunks) {
    output.push({ ...chunk, embedding: await embedText(chunk.content) });
  }
  return output;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

export async function retrieveRelevantChunks(
  chunks: DocumentChunk[],
  question: string,
  topK = Number(process.env.TOP_K_RESULTS || 5),
): Promise<Array<DocumentChunk & { relevanceScore: number }>> {
  const queryEmbedding = await embedText(question);
  if (!queryEmbedding.length) return [];
  return chunks
    .map((chunk) => ({ ...chunk, relevanceScore: cosineSimilarity(queryEmbedding, chunk.embedding || []) }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, topK);
}
