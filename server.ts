import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { createServer as createViteServer } from 'vite';
import { extractPdfContent } from './server/pdfService';
import { embedChunks } from './server/embeddingService';
import { answerQuestion } from './server/geminiService';
import { createDocument, storage } from './server/storage';
import type { ChatMessage, DocumentMetadata } from './server/types';

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB || 25) * 1024 * 1024 },
});
const port = Number(process.env.PORT || 3000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_DOCS = [
  {
    id: 'sample-rag-demo',
    type: 'rag-demo',
    filename: 'PDF_Chatbot_RAG_Demo.pdf',
    title: 'PDF Chatbot RAG Demonstration',
    description: 'A small demo document designed to verify grounded document question answering.',
    icon: 'file-text',
    suggestedQuestions: [
      'What is Retrieval-Augmented Generation?',
      'What are the three main stages in the pipeline?',
      'What is the purpose of the vector database?',
      'Who is the author of the demo document?',
    ],
  },
];

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pdf-chatbot', timestamp: new Date().toISOString() });
});

app.get('/api/sample-docs/list', (_req, res) => res.json(SAMPLE_DOCS));

async function createSamplePdf(): Promise<{ buffer: Buffer; filename: string }> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  let y = 790;
  const lines = [
    ['PDF Chatbot RAG Demonstration', true],
    ['Author: PDF Chatbot Engineering Demo', true],
    ['Purpose: demonstrate document-grounded question answering.', false],
    ['', false],
    ['Retrieval-Augmented Generation (RAG) combines document retrieval with language generation.', false],
    ['The pipeline has three main stages: ingestion, retrieval, and generation.', false],
    ['During ingestion, PDF text is extracted and split into chunks.', false],
    ['During retrieval, embeddings are compared to find the most relevant chunks.', false],
    ['The vector database stores chunk embeddings so relevant context can be retrieved efficiently.', false],
    ['During generation, the language model answers using the retrieved context rather than unrelated outside knowledge.', false],
  ] as const;

  for (const [text, isBold] of lines) {
    if (!text) { y -= 16; continue; }
    page.drawText(text, { x: 48, y, size: isBold ? 14 : 11, font: isBold ? bold : font });
    y -= isBold ? 26 : 20;
  }

  return { buffer: Buffer.from(await pdf.save()), filename: 'PDF_Chatbot_RAG_Demo.pdf' };
}

app.post('/api/documents/sample/:type', async (req, res) => {
  try {
    const sample = SAMPLE_DOCS.find((item) => item.type === req.params.type || item.id === req.params.type);
    if (!sample) return res.status(404).json({ error: 'Sample document not found' });

    const { buffer, filename } = await createSamplePdf();
    const metadata = createDocument(filename, buffer.length, buffer);
    const extracted = await extractPdfContent(buffer, metadata.id);
    const embedded = await embedChunks(extracted.chunks);
    const ready: DocumentMetadata = {
      ...metadata,
      pageCount: extracted.pageCount,
      status: 'ready',
      progressPercent: 100,
      suggestedQuestions: sample.suggestedQuestions,
      sampleType: sample.type,
      summary: {
        overview: 'A demonstration PDF explaining the core stages of a document-grounded RAG chatbot.',
        keyTopics: ['RAG', 'PDF ingestion', 'Semantic retrieval', 'Grounded generation'],
        documentType: 'Technical Demonstration',
      },
    };
    storage.saveDocument(ready, buffer, embedded, extracted.rawText);
    return res.status(201).json(ready);
  } catch (error) {
    console.error('Sample generation failed:', error);
    return res.status(500).json({ error: 'Failed to generate sample document' });
  }
});

app.get('/api/documents', (_req, res) => res.json(storage.getAllDocuments()));

app.get('/api/documents/:id', (req, res) => {
  const document = storage.getDocumentMetadata(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  return res.json(document);
});

app.get('/api/documents/:id/file', (req, res) => {
  const buffer = storage.getPdfBuffer(req.params.id);
  if (!buffer) return res.status(404).json({ error: 'PDF file not found' });
  res.type('application/pdf').send(buffer);
});

app.get('/api/documents/:id/chunks', (req, res) => res.json(storage.getChunks(req.params.id)));

app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A PDF file is required' });
    if (req.file.mimetype !== 'application/pdf' && !req.file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(415).json({ error: 'Only PDF files are supported' });
    }

    const metadata = createDocument(req.file.originalname, req.file.size, req.file.buffer);
    const extracted = await extractPdfContent(req.file.buffer, metadata.id);
    if (!extracted.chunks.length) {
      storage.deleteDocument(metadata.id);
      return res.status(422).json({ error: 'This PDF does not contain selectable text.' });
    }

    const embedded = await embedChunks(extracted.chunks);
    const ready: DocumentMetadata = {
      ...metadata,
      pageCount: extracted.pageCount,
      status: 'ready',
      progressPercent: 100,
      suggestedQuestions: [
        'What is the main topic of this document?',
        'What are the key findings?',
        'What methodology or process is described?',
      ],
    };
    storage.saveDocument(ready, req.file.buffer, embedded, extracted.rawText);
    return res.status(201).json(ready);
  } catch (error) {
    console.error('PDF upload failed:', error);
    return res.status(500).json({ error: 'Failed to process PDF' });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  if (!storage.deleteDocument(req.params.id)) return res.status(404).json({ error: 'Document not found' });
  return res.json({ success: true });
});

app.get('/api/chat/history/:documentId', (req, res) => res.json(storage.getConversation(req.params.documentId)));

app.delete('/api/chat/history/:documentId', (req, res) => {
  storage.clearConversation(req.params.documentId);
  return res.json({ success: true });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { documentId, question, confidenceThreshold } = req.body ?? {};
    if (typeof documentId !== 'string' || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'documentId and question are required' });
    }
    const doc = storage.getDocument(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const result = await answerQuestion(documentId, question.trim(), Number(confidenceThreshold) || 0.35);
    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      conversationId: documentId,
      role: 'user',
      content: question.trim(),
      grounded: true,
      confidenceLevel: 'strong',
      retrievalScore: 1,
      sources: [],
      createdAt: new Date().toISOString(),
    };
    const assistantMessage: ChatMessage = {
      id: `msg-asst-${Date.now()}`,
      conversationId: documentId,
      role: 'assistant',
      content: result.content,
      grounded: result.grounded,
      confidenceLevel: result.confidenceLevel as ChatMessage['confidenceLevel'],
      retrievalScore: result.retrievalScore,
      sources: result.sources,
      createdAt: new Date().toISOString(),
    };
    storage.addMessage(documentId, userMessage);
    storage.addMessage(documentId, assistantMessage);
    return res.json({ ...result, message: assistantMessage });
  } catch (error) {
    console.error('Chat request failed:', error);
    return res.status(500).json({
      answer: "I couldn't find this information in the uploaded PDF.",
      content: "I couldn't find this information in the uploaded PDF.",
      grounded: false,
      confidenceLevel: 'unsupported',
      retrievalScore: 0,
      sources: [],
    });
  }
});

app.post('/api/test/grounding-suite/:documentId', async (req, res) => {
  const doc = storage.getDocument(req.params.documentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  const tests = [
    { id: 'grounded-1', testName: 'Supported document question', question: 'What are the three main stages in the pipeline?', expectedGrounded: true },
    { id: 'grounded-2', testName: 'Unsupported outside fact', question: 'What is the capital of Australia?', expectedGrounded: false },
    { id: 'grounded-3', testName: 'Unmentioned detail', question: 'What is the price of the software?', expectedGrounded: false },
  ];
  const results = [];
  for (const test of tests) {
    const answer = await answerQuestion(doc.metadata.id, test.question, 0.35);
    results.push({
      ...test,
      actualGrounded: answer.grounded,
      passed: answer.grounded === test.expectedGrounded,
      confidenceLevel: answer.confidenceLevel,
      answer: answer.content,
      sources: answer.sources,
      details: answer.grounded === test.expectedGrounded ? 'Passed' : 'Grounding expectation mismatch',
    });
  }
  const passedCount = results.filter((r) => r.passed).length;
  return res.json({ documentId: doc.metadata.id, filename: doc.metadata.filename, totalTests: results.length, passedCount, successRate: Math.round((passedCount / results.length) * 100), results });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const publicDir = path.resolve(__dirname, 'public');
    app.use(express.static(publicDir));
    app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  }
  app.listen(port, '0.0.0.0', () => console.log(`PDF Chatbot server running on port ${port}`));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
