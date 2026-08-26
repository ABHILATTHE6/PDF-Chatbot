import { FormEvent, useState } from 'react';
import { askQuestion, uploadPdf } from '../api';

export default function PDFChat() {
  const [documentId, setDocumentId] = useState('');
  const [filename, setFilename] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Array<{ pageNumber: number; excerpt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(file?: File) {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const result = await uploadPdf(file);
      setDocumentId(result.document.id);
      setFilename(result.document.filename);
      setAnswer('PDF processed successfully. Ask a question about it.');
      setSources([]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setLoading(false); }
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    if (!documentId || !question.trim()) return;
    setLoading(true); setError('');
    try {
      const result = await askQuestion(documentId, question.trim());
      setAnswer(result.content);
      setSources(result.sources);
    } catch (err) { setError(err instanceof Error ? err.message : 'Request failed'); }
    finally { setLoading(false); }
  }

  return (
    <main className="chat-shell">
      <section className="card">
        <h1>PDF Chatbot</h1>
        <p>Upload a PDF and ask grounded questions about its contents.</p>
        <label className="upload-box">
          <strong>{loading ? 'Processing…' : 'Choose PDF'}</strong>
          <span>{filename || 'PDF files up to the configured limit'}</span>
          <input type="file" accept="application/pdf" onChange={(e) => handleUpload(e.target.files?.[0])} hidden />
        </label>
      </section>

      {documentId && (
        <section className="card">
          <h2>Ask about {filename}</h2>
          <form onSubmit={handleAsk} className="question-form">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What would you like to know?" />
            <button disabled={loading || !question.trim()} type="submit">Ask</button>
          </form>
          {answer && <div className="answer"><h3>Answer</h3><p>{answer}</p></div>}
          {sources.length > 0 && <div><h3>Sources</h3>{sources.map((source, index) => <article className="source" key={`${source.pageNumber}-${index}`}><strong>Page {source.pageNumber}</strong><p>{source.excerpt}</p></article>)}</div>}
          {error && <p className="error">{error}</p>}
        </section>
      )}
    </main>
  );
}
