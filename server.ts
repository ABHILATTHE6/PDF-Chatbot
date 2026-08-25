import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createDocument, addChunks, getDocument, getChunks } from './server/storage';
import { extractAndChunkPdf } from './server/pdfService';
import { embedChunks } from './server/embeddingService';
import { answerQuestion } from './server/geminiService';

const app = express();
const upload = multer({ limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB || 25) * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pdf-chatbot' });
});

app.get('/api/documents/:id', (req, res) => {
  const document = getDocument(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  return res.json({ document, chunks: getChunks(document.id).length });
});

app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'A PDF file is required' });
    if (req.file.mimetype !== 'application/pdf') return res.status(415).json({ error: 'Only PDF files are supported' });

    const document = createDocument(req.file.originalname, req.file.size);
    const chunks = await extractAndChunkPdf(req.file.buffer, document.id);
    const embedded = await embedChunks(chunks);
    addChunks(document.id, embedded);

    return res.status(201).json({ document, chunks: embedded.length });
  } catch (error) {
    console.error('PDF upload failed:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to process PDF' });
  }
});

app.post('/api/documents/:id/chat', async (req, res) => {
  try {
    const document = getDocument(req.params.id);
    if (!document) return res.status(404).json({ error: 'Document not found' });
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question) return res.status(400).json({ error: 'Question is required' });

    const answer = await answerQuestion(document.id, question);
    return res.json(answer);
  } catch (error) {
    console.error('Chat request failed:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to generate an answer' });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`PDF Chatbot server listening on port ${port}`));
