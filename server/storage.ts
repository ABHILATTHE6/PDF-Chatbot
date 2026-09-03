import type { ChatMessage, DocumentChunk, DocumentMetadata } from './types';

interface StoredDocument {
  metadata: DocumentMetadata;
  pdfBuffer: Buffer;
  chunks: DocumentChunk[];
  rawText: string;
}

class Storage {
  private documents = new Map<string, StoredDocument>();
  private conversations = new Map<string, ChatMessage[]>();

  saveDocument(metadata: DocumentMetadata, pdfBuffer: Buffer, chunks: DocumentChunk[], rawText: string): void {
    this.documents.set(metadata.id, { metadata, pdfBuffer, chunks, rawText });
  }

  getDocument(id: string): StoredDocument | undefined { return this.documents.get(id); }
  getDocumentMetadata(id: string): DocumentMetadata | undefined { return this.documents.get(id)?.metadata; }
  updateDocumentMetadata(id: string, updates: Partial<DocumentMetadata>): void {
    const document = this.documents.get(id);
    if (document) document.metadata = { ...document.metadata, ...updates };
  }
  getAllDocuments(): DocumentMetadata[] { return [...this.documents.values()].map(({ metadata }) => metadata); }
  getPdfBuffer(id: string): Buffer | undefined { return this.documents.get(id)?.pdfBuffer; }
  getChunks(id: string): DocumentChunk[] { return this.documents.get(id)?.chunks ?? []; }
  deleteDocument(id: string): boolean { this.conversations.delete(id); return this.documents.delete(id); }
  getConversation(documentId: string): ChatMessage[] { return this.conversations.get(documentId) ?? []; }
  addMessage(documentId: string, message: ChatMessage): void {
    const messages = this.conversations.get(documentId) ?? [];
    messages.push(message);
    this.conversations.set(documentId, messages);
  }
  clearConversation(documentId: string): void { this.conversations.set(documentId, []); }
  clearAll(): void { this.documents.clear(); this.conversations.clear(); }
}

export const storage = new Storage();

export const createDocument = (filename: string, fileSize: number, pdfBuffer: Buffer = Buffer.alloc(0)): DocumentMetadata => {
  const metadata: DocumentMetadata = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    filename,
    fileSize,
    pageCount: 0,
    status: 'processing',
    progressPercent: 0,
    createdAt: new Date().toISOString(),
  };
  storage.saveDocument(metadata, pdfBuffer, [], '');
  return metadata;
};

export const addChunks = (documentId: string, chunks: DocumentChunk[], rawText = ''): void => {
  const existing = storage.getDocument(documentId);
  if (!existing) return;
  existing.chunks = chunks;
  existing.rawText = rawText;
  storage.updateDocumentMetadata(documentId, { status: 'ready', progressPercent: 100, pageCount: Math.max(0, ...chunks.map((c) => c.pageNumber)) });
};

export const getDocument = (id: string) => storage.getDocumentMetadata(id);
export const getChunks = (id: string) => storage.getChunks(id);
