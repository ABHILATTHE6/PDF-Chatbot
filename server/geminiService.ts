import { GoogleGenAI } from '@google/genai';
import type { ChatMessage, SourceCitation } from './types';
import { retrieveRelevantChunks } from './embeddingService';
import { getChunks } from './storage';

const MODEL = process.env.LLM_MODEL || 'gemini-2.5-flash';

function getClient() {
  const key = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY or LLM_API_KEY is not configured');
  return new GoogleGenAI({ apiKey: key });
}

export async function answerQuestion(
  documentId: string,
  question: string,
  confidenceThreshold = 0.35,
): Promise<Pick<ChatMessage, 'content' | 'grounded' | 'confidenceLevel' | 'retrievalScore' | 'sources'>> {
  const chunks = getChunks(documentId);
  const retrieved = await retrieveRelevantChunks(chunks, question);
  const bestScore = retrieved[0]?.relevanceScore || 0;

  if (!retrieved.length || bestScore < confidenceThreshold) {
    return {
      content: "I couldn't find this information in the uploaded PDF.",
      grounded: false,
      confidenceLevel: 'unsupported',
      retrievalScore: bestScore,
      sources: [],
    };
  }

  const context = retrieved.map((chunk, index) => `SOURCE ${index + 1} — Page ${chunk.pageNumber}\n${chunk.content}`).join('\n\n');
  const prompt = `You are a document-grounded assistant. Answer ONLY from the supplied PDF context. If the context does not contain enough information, say that you cannot find the answer in the uploaded PDF. Do not invent facts.\n\nPDF CONTEXT:\n${context}\n\nQUESTION:\n${question}`;
  const result = await getClient().models.generateContent({ model: MODEL, contents: prompt });
  const content = result.text?.trim() || "I couldn't find this information in the uploaded PDF.";
  const sources: SourceCitation[] = retrieved.map((chunk) => ({
    id: `source-${chunk.id}`,
    chunkId: chunk.id,
    pageNumber: chunk.pageNumber,
    excerpt: chunk.content.slice(0, 280),
    relevanceScore: chunk.relevanceScore,
    boundingBox: chunk.boundingBox,
    documentFilename: '',
    sectionTitle: chunk.sectionTitle,
  }));

  return {
    content,
    grounded: true,
    confidenceLevel: bestScore >= 0.65 ? 'strong' : 'partial',
    retrievalScore: bestScore,
    sources,
  };
}
