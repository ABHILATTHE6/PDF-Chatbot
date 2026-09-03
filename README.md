# PDF Chatbot

> AI-powered, document-grounded question answering for PDF files using React, Express, PDF.js, embeddings, and Gemini.

[![CI](https://github.com/ABHILATTHE6/PDF-Chatbot/actions/workflows/ci.yml/badge.svg)](https://github.com/ABHILATTHE6/PDF-Chatbot/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20Gemini-2ea44f.svg)](https://github.com/ABHILATTHE6/PDF-Chatbot)

## Overview

PDF Chatbot lets a user upload a text-based PDF and ask questions about its contents. The backend extracts and chunks the document, creates embeddings, retrieves relevant passages, and generates an answer from the retrieved context. Responses include grounding information and source excerpts where available.

## Core features

- PDF upload with size and type validation
- PDF text extraction and chunking with page metadata
- Gemini-powered embeddings and semantic retrieval
- Document-grounded answers with confidence scoring
- Refusal path for unsupported questions
- Source/page evidence in chat responses
- PDF file and chunk APIs for the document viewer
- Conversation history and document deletion
- Built-in RAG demonstration PDF
- Grounding test endpoint for supported and unsupported questions
- React + Tailwind-based chat workspace
- GitHub Actions typecheck/build validation
- Docker production image configuration

## Architecture

```text
Browser
  │
  ├── PDF upload ───────────────┐
  │                             ▼
  │                       Express API
  │                             │
  │                 ┌───────────┴───────────┐
  │                 ▼                       ▼
  │          PDF extraction            Document storage
  │                 │
  │                 ▼
  │              Chunks
  │                 │
  │                 ▼
  │             Embeddings
  │                 │
  │                 ▼
  │            Top-K retrieval
  │                 │
  │                 ▼
  │            Gemini answer
  │                 │
  └──── answer + sources ◀────────┘
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
│   ├── api.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── server.ts
└── vite.config.ts
```

## Local setup

### Requirements

- Node.js 20+
- A Gemini API key for embeddings and answer generation

### Install

```bash
git clone https://github.com/ABHILATTHE6/PDF-Chatbot.git
cd PDF-Chatbot
npm install
```

Create a local `.env` from `.env.example` and set `GEMINI_API_KEY`.

### Development

```bash
npm run dev
```

The Express server starts in development mode with Vite middleware.

### Production build

```bash
npm run build
npm start
```

The build creates the Vite frontend in `public/` and the bundled Node server in `dist/server.cjs`.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service health |
| GET | `/api/documents` | List documents |
| POST | `/api/documents/upload` | Upload and process a PDF |
| GET | `/api/documents/:id` | Document metadata |
| GET | `/api/documents/:id/file` | Serve original PDF |
| GET | `/api/documents/:id/chunks` | Retrieve indexed chunks |
| DELETE | `/api/documents/:id` | Delete a document |
| POST | `/api/chat` | Ask a grounded question |
| GET | `/api/chat/history/:documentId` | Conversation history |
| DELETE | `/api/chat/history/:documentId` | Clear conversation |
| GET | `/api/sample-docs/list` | List demo documents |
| POST | `/api/documents/sample/:type` | Create a demo PDF |
| POST | `/api/test/grounding-suite/:documentId` | Run grounding checks |

See [`docs/API.md`](docs/API.md) for request and response details.

## Configuration

The main environment variables are:

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

Never commit `.env`, API keys, uploaded documents, or other secrets.

## Grounding behavior

The application is designed to answer from retrieved PDF context rather than silently substituting unrelated external knowledge. When retrieval does not provide enough evidence, the assistant uses the explicit fallback:

> I couldn't find this information in the uploaded PDF.

The repository also exposes a grounding test endpoint to exercise supported and unsupported questions against the demo document.

## CI/CD

GitHub Actions runs on pushes to `main` and pull requests. The current workflow installs dependencies, runs TypeScript typechecking, and performs the production build.

## Docker

Build the production image:

```bash
docker build -t pdf-chatbot .
docker run --rm -p 3000:3000 --env-file .env pdf-chatbot
```

## Limitations

- Current storage is in-memory; uploaded documents disappear when the server restarts.
- The current ingestion pipeline is intended for text-based PDFs and does not perform OCR for scanned documents.
- Embedding generation requires a configured Gemini-compatible API key.
- The vector index is currently application-memory based rather than a persistent vector database.

## Roadmap

- [x] PDF ingestion pipeline
- [x] Semantic retrieval foundation
- [x] Grounded Gemini answers
- [x] Source evidence and chat history APIs
- [x] Demo document and grounding test workflow
- [x] CI validation
- [x] Docker packaging
- [ ] Persistent database/vector store
- [ ] OCR support for scanned PDFs
- [ ] Streaming responses
- [ ] Multi-document workspaces
- [ ] Automated integration and E2E tests
- [ ] Production deployment guide

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT License. See [`LICENSE`](LICENSE).

## Author

**ABHILATTHE6**

- GitHub: https://github.com/ABHILATTHE6
- Project: https://github.com/ABHILATTHE6/PDF-Chatbot
