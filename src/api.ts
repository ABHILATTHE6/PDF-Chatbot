export interface UploadResponse {
  document: { id: string; filename: string; size: number };
  chunks: number;
}

export interface ChatResponse {
  content: string;
  grounded: boolean;
  confidenceLevel: string;
  retrievalScore: number;
  sources: Array<{ pageNumber: number; excerpt: string; relevanceScore: number }>;
}

export async function uploadPdf(file: File): Promise<UploadResponse> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/documents/upload', { method: 'POST', body });
  if (!response.ok) throw new Error((await response.json()).error || 'PDF upload failed');
  return response.json();
}

export async function askQuestion(documentId: string, question: string): Promise<ChatResponse> {
  const response = await fetch(`/api/documents/${documentId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error((await response.json()).error || 'Unable to generate answer');
  return response.json();
}
