import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { LandingUpload } from './components/LandingUpload';
import { ChatWorkspace } from './components/ChatWorkspace';
import { ProcessingModal } from './components/ProcessingModal';
import { GroundingTestModal } from './components/GroundingTestModal';
import { DocumentInfoModal } from './components/DocumentInfoModal';
import { DocumentMetadata, ChatMessage, SampleDocConfig } from './types';

export function App() {
  const [currentDocument, setCurrentDocument] = useState<DocumentMetadata | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sampleConfigs, setSampleConfigs] = useState<SampleDocConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFilename, setProcessingFilename] = useState('Document.pdf');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.35);
  const [isGroundingTestOpen, setIsGroundingTestOpen] = useState(false);
  const [isDocInfoOpen, setIsDocInfoOpen] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const sampleRes = await fetch('/api/sample-docs/list');
        if (sampleRes.ok) setSampleConfigs(await sampleRes.json());
        const docsRes = await fetch('/api/documents');
        if (docsRes.ok) {
          const docs: DocumentMetadata[] = await docsRes.json();
          if (docs.length > 0) { const latest = docs[docs.length - 1]; setCurrentDocument(latest); loadConversation(latest.id); }
        }
      } catch (err) { console.warn('[App] Initial load error:', err); }
    }
    init();
  }, []);

  const loadConversation = async (documentId: string) => {
    try { const res = await fetch(`/api/chat/history/${documentId}`); if (res.ok) setMessages(await res.json()); }
    catch (err) { console.warn('[App] Failed to load chat history:', err); }
  };

  const handleFileUpload = async (file: File) => {
    setProcessingFilename(file.name); setIsProcessing(true);
    try {
      const formData = new FormData(); formData.append('file', file);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Failed to upload and process PDF');
      setCurrentDocument(data); setMessages([]);
    } catch (err: any) { alert(err.message || 'Error processing document'); }
    finally { setIsProcessing(false); }
  };

  const handleSelectSample = async (type: string) => {
    const sample = sampleConfigs.find((s) => s.type === type || s.id === type);
    setProcessingFilename(sample ? sample.filename : 'Sample_Document.pdf'); setIsProcessing(true);
    try {
      const res = await fetch(`/api/documents/sample/${type}`, { method: 'POST' });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Failed to load sample document');
      setCurrentDocument(data); setMessages([]);
    } catch (err: any) { alert(err.message || 'Error loading sample document'); }
    finally { setIsProcessing(false); }
  };

  const handleSendMessage = async (question: string) => {
    if (!currentDocument || isChatLoading) return;
    const tempUserMsg: ChatMessage = { id: `msg-user-temp-${Date.now()}`, conversationId: currentDocument.id, role: 'user', content: question, grounded: true, confidenceLevel: 'strong', retrievalScore: 1, sources: [], createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]); setIsChatLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId: currentDocument.id, question, confidenceThreshold }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Error processing question');
      const message = data.message || { id: `msg-asst-${Date.now()}`, conversationId: currentDocument.id, role: 'assistant', content: data.answer || "I couldn't find this information in the uploaded PDF.", grounded: !!data.grounded, confidenceLevel: data.confidenceLevel || 'unsupported', retrievalScore: data.retrievalScore || 0, sources: data.sources || [], createdAt: new Date().toISOString() };
      setMessages((prev) => [...prev, message]);
    } catch {
      setMessages((prev) => [...prev, { id: `msg-err-${Date.now()}`, conversationId: currentDocument.id, role: 'assistant', content: "I couldn't find this information in the uploaded PDF.", grounded: false, confidenceLevel: 'unsupported', retrievalScore: 0, sources: [], createdAt: new Date().toISOString() }]);
    } finally { setIsChatLoading(false); }
  };

  const handleClearChat = async () => {
    if (!currentDocument) return;
    try { await fetch(`/api/chat/history/${currentDocument.id}`, { method: 'DELETE' }); setMessages([]); }
    catch (err) { console.warn('[App] Clear chat error:', err); }
  };

  const handleDeleteDocument = async () => {
    if (!currentDocument) return;
    try { await fetch(`/api/documents/${currentDocument.id}`, { method: 'DELETE' }); setCurrentDocument(null); setMessages([]); setIsDocInfoOpen(false); }
    catch (err) { console.warn('[App] Delete document error:', err); }
  };

  return <div className="h-screen w-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col font-sans overflow-hidden">
    <Navbar currentDocument={currentDocument} onNewPdfClick={() => setCurrentDocument(null)} onSelectSample={handleSelectSample} sampleConfigs={sampleConfigs} onOpenGroundingTest={() => setIsGroundingTestOpen(true)} onOpenDocInfo={() => setIsDocInfoOpen(true)} onClearChat={handleClearChat} confidenceThreshold={confidenceThreshold} onThresholdChange={setConfidenceThreshold} />
    <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
      {currentDocument ? <ChatWorkspace document={currentDocument} messages={messages} onSendMessage={handleSendMessage} isLoading={isChatLoading} onClearChat={handleClearChat} onSelectSample={handleSelectSample} /> : <div className="flex-1 min-h-0 w-full overflow-y-auto"><LandingUpload onFileUpload={handleFileUpload} onSelectSample={handleSelectSample} sampleConfigs={sampleConfigs} isProcessing={isProcessing} /></div>}
    </main>
    <ProcessingModal isOpen={isProcessing} filename={processingFilename} />
    {currentDocument && <GroundingTestModal document={currentDocument} isOpen={isGroundingTestOpen} onClose={() => setIsGroundingTestOpen(false)} />}
    {currentDocument && <DocumentInfoModal document={currentDocument} isOpen={isDocInfoOpen} onClose={() => setIsDocInfoOpen(false)} onDeleteDocument={handleDeleteDocument} />}
  </div>;
}

export default App;
