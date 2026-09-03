import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createServer as createViteServer } from 'vite';
import { extractPdfContent } from './server/pdfService';
import { embedChunks } from './server/embeddingService';
import { answerQuestion } from './server/geminiService';
import { storage } from './server/storage';
import type { ChatMessage, DocumentMetadata } from './server/types';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB || 25) * 1024 * 1024 }, fileFilter: (_req, file, cb) => { const ok = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf'); cb(ok ? null : new Error('Only PDF documents are supported.'), ok); } });
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const SAMPLE_DOCS = [{
  id: 'sample-rag-demo', type: 'rag-demo', filename: 'PDF_Chatbot_RAG_Demo.pdf', title: 'PDF Chatbot RAG Demonstration',
  description: 'A small demo document designed to verify grounded document question answering.', icon: 'file-text',
  suggestedQuestions: ['What is Retrieval-Augmented Generation?', 'What are the three main stages in the pipeline?', 'What is the purpose of the vector database?', 'Who is the author of the demo document?'],
}];

function metadata(filename: string, fileSize: number, id: string): DocumentMetadata { return { id, filename, fileSize, pageCount: 0, status: 'processing', progressPercent: 0, createdAt: new Date().toISOString() }; }

async function ingest(buffer: Buffer, filename: string, sampleType?: string, suggestedQuestions?: string[]) {
  const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const extraction = await extractPdfContent(buffer, id);
  if (!extraction.chunks.length) throw new Error('This PDF does not contain selectable or usable text.');
  const chunks = await embedChunks(extraction.chunks);
  const doc: DocumentMetadata = {
    ...metadata(filename, buffer.length, id), pageCount: extraction.pageCount, status: 'ready', progressPercent: 100,
    sampleType, suggestedQuestions, summary: { overview: extraction.rawText.replace(/\s+/g, ' ').trim().slice(0, 500), keyTopics: [], documentType: sampleType ? 'Technical Demonstration' : 'PDF Document' },
  };
  storage.saveDocument(doc, buffer, chunks, extraction.rawText);
  return doc;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'pdf-chatbot', hasApiKey: Boolean(process.env.GEMINI_API_KEY), timestamp: new Date().toISOString() }));
app.get('/api/sample-docs/list', (_req, res) => res.json(SAMPLE_DOCS));
app.get('/api/documents', (_req, res) => res.json(storage.getAllDocuments()));
app.get('/api/documents/:id', (req, res) => { const doc = storage.getDocumentMetadata(req.params.id); return doc ? res.json(doc) : res.status(404).json({ error: 'Document not found' }); });
app.get('/api/documents/:id/file', (req, res) => { const pdf = storage.getPdfBuffer(req.params.id); if (!pdf) return res.status(404).json({ error: 'PDF file not found' }); res.type('application/pdf'); return res.send(pdf); });
app.get('/api/documents/:id/chunks', (req, res) => { if (!storage.getDocumentMetadata(req.params.id)) return res.status(404).json({ error: 'Document not found' }); return res.json(storage.getChunks(req.params.id)); });

app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try { if (!req.file) return res.status(400).json({ error: 'A PDF file is required.' }); return res.status(201).json(await ingest(req.file.buffer, req.file.originalname)); }
  catch (error) { console.error('[upload]', error); return res.status(422).json({ error: error instanceof Error ? error.message : 'Failed to process PDF.' }); }
});

app.post('/api/documents/sample/:type', async (req, res) => {
  try {
    const sample = SAMPLE_DOCS.find((item) => item.type === req.params.type || item.id === req.params.type);
    if (!sample) return res.status(404).json({ error: 'Sample document not found.' });
    const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold); const page = pdf.addPage([595, 842]);
    const lines: Array<[string, boolean]> = [['PDF Chatbot RAG Demonstration', true], ['Author: PDF Chatbot Engineering Demo', true], ['Purpose: demonstrate document-grounded question answering.', false], ['Retrieval-Augmented Generation (RAG) combines retrieval with language generation.', false], ['The pipeline has three main stages: ingestion, retrieval, and generation.', false], ['During ingestion, PDF text is extracted and split into chunks.', false], ['During retrieval, embeddings are compared to find the most relevant chunks.', false], ['The vector database stores chunk embeddings for efficient context retrieval.', false], ['During generation, the language model answers from retrieved document context.', false]];
    let y = 790; for (const [text, isBold] of lines) { page.drawText(text, { x: 48, y, font: isBold ? bold : font, size: isBold ? 14 : 11 }); y -= isBold ? 26 : 20; }
    const buffer = Buffer.from(await pdf.save()); return res.status(201).json(await ingest(buffer, sample.filename, sample.type, sample.suggestedQuestions));
  } catch (error) { console.error('[sample]', error); return res.status(500).json({ error: 'Failed to generate sample document.' }); }
});

app.delete('/api/documents/:id', (req, res) => { if (!storage.deleteDocument(req.params.id)) return res.status(404).json({ error: 'Document not found' }); return res.json({ success: true }); });
app.get('/api/chat/history/:documentId', (req, res) => res.json(storage.getConversation(req.params.documentId)));
app.delete('/api/chat/history/:documentId', (req, res) => { storage.clearConversation(req.params.documentId); return res.json({ success: true }); });

app.post('/api/chat', async (req, res) => {
  try {
    const { documentId, question, confidenceThreshold } = req.body ?? {};
    if (typeof documentId !== 'string' || typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: 'documentId and question are required' });
    const doc = storage.getDocument(documentId); if (!doc) return res.status(404).json({ error: 'Document not found' });
    const result = await answerQuestion(documentId, question.trim(), typeof confidenceThreshold === 'number' ? confidenceThreshold : 0.35);
    const userMessage: ChatMessage = { id: `msg-user-${Date.now()}`, conversationId: documentId, role: 'user', content: question.trim(), grounded: true, confidenceLevel: 'strong', retrievalScore: 1, sources: [], createdAt: new Date().toISOString() };
    const assistantMessage: ChatMessage = { id: `msg-asst-${Date.now()}`, conversationId: documentId, role: 'assistant', content: result.content, grounded: result.grounded, confidenceLevel: result.confidenceLevel as ChatMessage['confidenceLevel'], retrievalScore: result.retrievalScore, sources: result.sources, createdAt: new Date().toISOString() };
    storage.addMessage(documentId, userMessage); storage.addMessage(documentId, assistantMessage);
    return res.json({ ...result, answer: result.content, message: assistantMessage });
  } catch (error) { console.error('[chat]', error); return res.status(500).json({ content: "I couldn't find this information in the uploaded PDF.", answer: "I couldn't find this information in the uploaded PDF.", grounded: false, confidenceLevel: 'unsupported', retrievalScore: 0, sources: [] }); }
});

app.post('/api/test/grounding-suite/:documentId', async (req, res) => {
  const doc = storage.getDocument(req.params.documentId); if (!doc) return res.status(404).json({ error: 'Document not found' });
  const tests = [{ id: 'supported', testName: 'Supported document question', question: 'What are the three main stages in the pipeline?', expectedGrounded: true }, { id: 'outside', testName: 'Outside knowledge refusal', question: 'What is the capital of Australia?', expectedGrounded: false }];
  const results = await Promise.all(tests.map(async (test) => { const answer = await answerQuestion(doc.metadata.id, test.question, 0.35); return { ...test, actualGrounded: answer.grounded, passed: answer.grounded === test.expectedGrounded, confidenceLevel: answer.confidenceLevel, answer: answer.content, sources: answer.sources, details: answer.grounded === test.expectedGrounded ? 'Passed' : 'Expectation mismatch' }; }));
  const passedCount = results.filter((r) => r.passed).length; return res.json({ documentId: doc.metadata.id, filename: doc.metadata.filename, totalTests: results.length, passedCount, successRate: Math.round((passedCount / results.length) * 100), results });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') { const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); }
  else { const publicDir = path.resolve(process.cwd(), 'dist'); app.use(express.static(publicDir)); app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html'))); }
  app.listen(port, '0.0.0.0', () => console.log(`PDF Chatbot running on http://localhost:${port}`));
}
startServer().catch((error) => { console.error('Failed to start server:', error); process.exit(1); });
