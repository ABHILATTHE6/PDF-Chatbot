# API Reference

Base URL: `http://localhost:3000`

## Health

`GET /api/health`

Returns a lightweight service health response.

## Upload a PDF

`POST /api/documents/upload`

Content type: `multipart/form-data`

Field:
- `file` — PDF document

The server validates the MIME type and configured maximum upload size, extracts text, creates chunks, generates embeddings, and indexes the chunks.

Example response:

```json
{
  "document": {
    "id": "document-id",
    "filename": "example.pdf",
    "size": 12345
  },
  "chunks": 12
}
```

## Get document metadata

`GET /api/documents/:id`

Returns document metadata and the number of indexed chunks.

## Ask a question

`POST /api/documents/:id/chat`

Request body:

```json
{
  "question": "What is this document about?"
}
```

The response contains the generated answer, grounding status, retrieval score, confidence level, and relevant source excerpts.

## Error handling

The API uses conventional HTTP status codes:

- `400` — invalid request
- `404` — document not found
- `415` — unsupported file type
- `500` — processing or generation failure

API credentials must be supplied through environment variables and must never be included in requests or committed to the repository.
