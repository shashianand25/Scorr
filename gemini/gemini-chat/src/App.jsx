import { useState, useRef, useEffect } from 'react';
import './App.css';

const VERTEX_URL = `https://asia-south1-aiplatform.googleapis.com/v1/projects/guardian-495515/locations/asia-south1/publishers/google/models/gemini-3.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`;
const PDF_API = 'https://api.scorrapp.com/api/parse-pdf';

const MCQ_PROMPT = (text, count) => `You are an expert educator and assessment designer.

Convert the provided text into high-quality multiple-choice questions for active recall.

The provided text may be one chunk of a larger document.
Generate questions using only the information in the provided text.
Do not assume information outside the provided text.

### Question Generation

* If the provided text already contains MCQs, recreate those MCQs only. Generate exactly the same number of questions as the original MCQs. You may improve the wording for clarity, but do not introduce new questions or concepts.
* If the provided text does not contain MCQs, generate exactly **${count}** MCQs covering the most important concepts, definitions, processes, comparisons, formulas, and facts.
* Cover the entire provided text. Do not concentrate questions only on the beginning or a single section.
* Distribute questions across the major concepts as evenly as possible.
* Prioritize the most important concepts over minor details.
* Generate questions only from information explicitly stated or directly implied by the text. Do not invent, assume, or add information that is not present.
* Avoid duplicate or nearly identical questions.
* Rephrase questions naturally instead of copying sentences whenever possible.
* Match the difficulty to the source material naturally.
* When possible, prefer questions that test understanding, application, or comparison rather than simple memorization.

### Answer Rules

* Each question must have exactly one correct answer and exactly three incorrect answers.
* Incorrect answers should be plausible, relevant, and clearly incorrect based on the provided text.

### Output Format

Output every question exactly in the following format:

? Question

+ Correct Answer

- Wrong Answer
- Wrong Answer
- Wrong Answer

### Formatting Rules

* Every question must start with \`?\`.
* The correct answer must start with \`+\`.
* Every incorrect answer must start with \`-\`.
* Do not number the questions.
* Do not include explanations, headings, notes, or any extra text.
* Output only the formatted questions.

Text:
${text}`;

const callGemini = async (contents) => {
  const res = await fetch(VERTEX_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 65536, temperature: 0.2 } }) });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || res.statusText); }
  return (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [mcqCount, setMcqCount] = useState(10);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const t0 = Date.now();
    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      const text = await callGemini([...history, { role: 'user', parts: [{ text: input }] }]);
      setMessages(prev => [...prev, { role: 'model', content: text, ms: Date.now() - t0 }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: 'Error: ' + err.message, ms: Date.now() - t0 }]);
    } finally { setLoading(false); }
  };

  const handlePDF = async (e) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;
    fileRef.current.value = '';
    setLoading(true);
    const t0 = Date.now();
    try {
      setStatus('📄 Parsing PDF...');
      const form = new FormData();
      form.append('file', file);
      const parseRes = await fetch(PDF_API, { method: 'POST', body: form });
      if (!parseRes.ok) throw new Error('PDF parsing failed');
      const { text } = await parseRes.json();

      setMessages(prev => [...prev, { role: 'user', content: `📄 ${file.name}` }]);

      // Split into 20K char chunks
      const CHUNK_SIZE = 50000;
      const chunks = [];
      for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE));

      const perChunk = Math.max(1, Math.ceil(mcqCount / chunks.length));
      const results = [];
      const CONCURRENCY = 3;
      
      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const totalBatches = Math.ceil(chunks.length / CONCURRENCY);
        if (totalBatches === 1) {
          setStatus('🧠 Generating MCQs...');
        } else {
          setStatus(`🧠 Generating MCQs (Batch ${Math.floor(i / CONCURRENCY) + 1}/${totalBatches})...`);
        }
        const batch = chunks.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map(chunk => callGemini([{ role: 'user', parts: [{ text: MCQ_PROMPT(chunk, perChunk) }] }]))
        );
        results.push(...batchResults);
      }

      setMessages(prev => [...prev, { role: 'model', content: results.join('\n'), ms: Date.now() - t0 }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: 'Error: ' + err.message, ms: Date.now() - t0 }]);
    } finally { setLoading(false); setStatus(''); }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>✨ Gemini Chat</h1>
        <p>Powered by Agent Platform (Gemini 3.5 Flash - Mumbai)</p>
      </header>

      <main className="chat-box">
        {messages.length === 0 && !loading && (
          <div className="empty-state">💬 Chat with Gemini or 📄 upload a PDF to generate MCQs!</div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.role}`}>
            <div className={`message bubble-${msg.role}`}>
              {msg.content}
              {msg.ms && <span className="msg-timer">{msg.ms < 1000 ? `${msg.ms}ms` : `${(msg.ms/1000).toFixed(1)}s`}</span>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message-wrapper model">
            <div className="message bubble-model typing">{status || 'Thinking...'}</div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      <form onSubmit={sendMessage} className="input-area">
        <input type="file" accept=".pdf" ref={fileRef} onChange={handlePDF} style={{ display: 'none' }} />
        <button type="button" className="pdf-btn" onClick={() => fileRef.current.click()} disabled={loading} title="Upload PDF">📄</button>
        <input type="number" min="1" max="50" value={mcqCount} onChange={e => setMcqCount(+e.target.value)} className="mcq-count" title="Number of MCQs" disabled={loading} />
        <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message or upload a PDF..." autoFocus />
        <button type="submit" disabled={!input.trim() || loading}>Send</button>
      </form>
    </div>
  );
}

export default App;
