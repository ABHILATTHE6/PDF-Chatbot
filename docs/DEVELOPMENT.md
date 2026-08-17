# Development Guide

## Goal

Build PDF Chatbot incrementally as a maintainable RAG application rather than putting all PDF processing, retrieval, and LLM logic in one file.

## Recommended implementation order

1. PDF upload and validation
2. Text extraction
3. Text cleaning and chunking
4. Embedding generation
5. Vector-store indexing
6. Similarity retrieval
7. LLM response generation
8. Source/page citation support
9. Chat UI and conversation state
10. Automated tests and CI

## Engineering rules

- Keep provider-specific code behind small service interfaces.
- Never hard-code API keys or credentials.
- Validate uploaded files before processing.
- Keep document content out of logs unless explicitly required for debugging.
- Prefer deterministic, testable functions for extraction and chunking.
- Return useful errors instead of silently failing.
- Add tests for edge cases such as empty PDFs, scanned PDFs, and malformed files.

## Definition of done for a feature

A feature should have:

- Working implementation
- Appropriate error handling
- Tests for important behavior
- Updated documentation
- No secrets committed to Git
- A clear, focused commit message
