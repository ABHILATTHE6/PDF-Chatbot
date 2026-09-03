# PDF Chatbot

> AI-powered, document-grounded question answering for PDF files using React, Express, PDF.js, embeddings, and Gemini.

[![CI](https://github.com/ABHILATTHE6/PDF-Chatbot/actions/workflows/ci.yml/badge.svg)](https://github.com/ABHILATTHE6/PDF-Chatbot/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20Gemini-2ea44f.svg)](https://github.com/ABHILATTHE6/PDF-Chatbot)

## Overview

PDF Chatbot lets a user upload a text-based PDF and ask questions about its contents. The backend extracts and chunks the document, generates embeddings, retrieves relevant passages, and produces a grounded answer. Responses can include confidence information and source/page evidence.

## Features

- PDF upload with type and size validation
- PDF text extraction, page metadata, chunking, and source bounding boxes
- Gemini-powered embeddings and semantic retrieval
- Grounded answers with confidence scoring
- Explicit refusal for unsupported questions
- Source/page evidence in chat responses
- PDF viewer and indexed chunk endpoints
- Conversation history and document deletion
- Built-in RAG demonstration PDF
- Grounding benchmark endpoint
- React + Tailwind chat interface
- GitHub Actions typecheck/build validation
- Production Docker image

## Architecture

```text
Browser
  │
  ├── PDF upload ───────────────┐
  │                             ▼
  │                       Express API
  │                             │
  │                   PDF extraction
  │                             │
  │                           Chunks
  │                             │
  │                         Embeddings
  │                             │
  │                       Top-K retrieval
  │                             │
  │                       Gemini answer
  │                             │
  └──── answer + sources ◀──────┘
```

## Project structure

```text
PDF-Chatbot/
├── .github/workflows/ci.yml
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── PROJECT_STATUS.md
├── server/
│   ├── embeddingService.ts
│   ├── geminiService.ts
│   ├── pdfService.ts
│   ├── storage.ts
│   └── types.ts
├── src/
│   ├── components/
│   ├── lib/
│   ├── api.ts
│   ├── App.tsx
│   └── main.tsx
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── CONTRIBUTING.md
├── LICENSE
├── index.html
├── package.json
├── server.ts
└── vite.config.ts
```

## Local setup

### Requirements

- Node.js 20+
- Gemini API key

### Install

```bash
git clone https://github.com/ABHILATTHE6/PDF-Chatbot.git
cd PDF-Chatbot
npm install
```

Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.

### Development

```bash
npm run dev
```

Open the URL shown by the server, normally `http://localhost:3000`.

### Production

```bash
npm run build
npm start
```

The Vite frontend and bundled Express server are written to `dist/`.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service health |
| GET | `/api/documents` | List documents |
| POST | `/api/documents/upload` | Upload and process a PDF |
| GET | `/api/documents/:id` | Document metadata |
| GET | `/api/documents/:id/file` | Serve the original PDF |
| GET | `/api/documents/:id/chunks` | Retrieve indexed chunks |
| DELETE | `/api/documents/:id` | Delete a document |
| POST | `/api/chat` | Ask a grounded question |
| GET | `/api/chat/history/:documentId` | Conversation history |
| DELETE | `/api/chat/history/:documentId` | Clear conversation |
| GET | `/api/sample-docs/list` | List built-in demo documents |
| POST | `/api/documents/sample/:type` | Generate a demo PDF |
| POST | `/api/test/grounding-suite/:documentId` | Run grounding checks |

See [`docs/API.md`](docs/API.md) for details.

## Configuration

```text
GEMINI_API_KEY=
LLM_MODEL=gemini-2.5-flash
EMBEDDING_MODEL=text-embedding-004
PORT=3000
MAX_UPLOAD_SIZE_MB=25
TOP_K_RESULTS=5
CONFIDENCE_THRESHOLD=0.35
NODE_ENV=development
```

Never commit API keys, `.env`, uploaded documents, or generated build artifacts.

## Grounding behavior

The chatbot is designed to answer from retrieved PDF context. When there is not enough supporting evidence, it returns:

> I couldn't find this information in the uploaded PDF.

The repository also provides a grounding test endpoint for supported and unsupported questions.

## CI

GitHub Actions runs on pushes to `main` and pull requests. It installs dependencies, typechecks the project, and runs the production build. citehttps://docs.github.com/en/actions

## Docker

```bash
docker build -t pdf-chatbot .
docker run --rm -p 3000:3000 --env-file .env pdf-chatbot
```

## Known limitations

- Document storage is in-memory; documents disappear after a server restart.
- Scanned PDFs requiring OCR are not processed.
- Embeddings and Gemini answers require a configured API key.
- The retrieval index is memory-based rather than a persistent vector database.

## Roadmap

- [x] PDF ingestion
- [x] Embeddings and retrieval
- [x] Grounded Gemini answers
- [x] Source evidence
- [x] Chat history
- [x] Demo document and grounding tests
- [x] CI validation
- [x] Docker packaging
- [ ] Persistent document/vector storage
- [ ] OCR for scanned PDFs
- [ ] Streaming responses
- [ ] Multi-document workspaces
- [ ] Automated integration/E2E tests
- [ ] Production deployment guide

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT License. See [`LICENSE`](LICENSE).

## Author

**ABHILATTHE6**

- GitHub: https://github.com/ABHILATTHE6
- Project: https://github.com/ABHILATTHE6/PDF-Chatbot
