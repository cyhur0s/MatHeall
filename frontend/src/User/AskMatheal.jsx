import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import UserSidebar from "../UserSidebar";
import { aiFetch, apiFetch } from "../config/api";

const GREETING = { role: "ai", text: "Halo! Saya AskMatheal. Apa yang ingin kamu pelajari tentang matematika hari ini?" };

const FormattedMessage = ({ children }) => (
  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
    {String(children || "")}
  </ReactMarkdown>
);

function AskMatheal() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([GREETING]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [aiStatus, setAiStatus] = useState("checking");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const messagesEndRef = useRef(null);

  const loadSessions = async () => {
    try {
      const response = await apiFetch(`chat_history.php?t=${Date.now()}`, { cache: "no-store", preserveSessionOnUnauthorized: true });
      const data = await response.json();
      if (response.ok && data.status === "success") setSessions(data.sessions || []);
    } catch (error) {
      console.warn("Histori AskMatheal belum dapat dimuat:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    aiFetch("health", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setAiStatus(data.configured && data.reachable !== false ? "ready" : "degraded"))
      .catch(() => setAiStatus("offline"));
  }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, isTyping]);

  const startNewChat = () => {
    setActiveSessionId(null);
    setChat([GREETING]);
    setMessage("");
    setMobileHistoryOpen(false);
  };

  const toggleHistory = () => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setMobileHistoryOpen((open) => !open);
      return;
    }
    setHistoryCollapsed((collapsed) => !collapsed);
  };

  const openSession = async (sessionId) => {
    if (isTyping) return;
    try {
      setHistoryLoading(true);
      const response = await apiFetch(`chat_history.php?session_id=${sessionId}&t=${Date.now()}`, { cache: "no-store", preserveSessionOnUnauthorized: true });
      const data = await response.json();
      if (!response.ok || data.status !== "success") throw new Error(data.message || "Histori tidak tersedia");
      setActiveSessionId(Number(sessionId));
      setChat((data.messages || []).map((item) => ({ role: item.role, text: item.message })));
      setMobileHistoryOpen(false);
    } catch (error) {
      console.warn("Percakapan tidak dapat dibuka:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveHistoryMessage = async ({ sessionId, role, text, title }) => {
    const response = await apiFetch("chat_history.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId || 0, role, message: text, title }),
      preserveSessionOnUnauthorized: true,
    });
    const data = await response.json();
    if (!response.ok || data.status !== "success") throw new Error(data.message || "Histori gagal disimpan");
    return Number(data.session_id);
  };

  const deleteSession = async (event, sessionId) => {
    event.stopPropagation();
    if (!window.confirm("Hapus percakapan ini?")) return;
    try {
      const response = await apiFetch(`chat_history.php?session_id=${sessionId}`, { method: "DELETE", preserveSessionOnUnauthorized: true });
      if (!response.ok) throw new Error("Gagal menghapus percakapan");
      if (Number(sessionId) === activeSessionId) startNewChat();
      await loadSessions();
    } catch (error) {
      console.warn(error);
    }
  };

  const sendMessage = async (prompt = message) => {
    const cleanMessage = String(prompt).trim();
    if (!cleanMessage || isTyping) return;

    const newChat = [...chat, { role: "user", text: cleanMessage }];
    setChat(newChat);
    setMessage("");
    setIsTyping(true);

    let sessionId = activeSessionId;
    try {
      sessionId = await saveHistoryMessage({ sessionId, role: "user", text: cleanMessage, title: cleanMessage.slice(0, 72) });
      setActiveSessionId(sessionId);
    } catch (historyError) {
      // Histori adalah fitur pendukung. Kegagalan database tidak boleh
      // mencegah pengguna memperoleh jawaban dari tutor.
      console.warn("Pesan belum tersimpan ke histori:", historyError);
    }

    try {
      const response = await aiFetch("chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanMessage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Server AI merespons HTTP ${response.status}`);
      if (!data.reply) throw new Error("Server AI tidak mengirim jawaban");
      setAiStatus(data.ai_available === false ? "degraded" : "ready");

      setChat([...newChat, { role: "ai", text: data.reply }]);
      if (sessionId) {
        try {
          await saveHistoryMessage({ sessionId, role: "ai", text: data.reply });
        } catch (historyError) {
          console.warn("Jawaban belum tersimpan ke histori:", historyError);
        }
      }
    } catch (error) {
      setAiStatus("offline");
      const errorText = `Maaf, jawaban belum dapat diproses. ${error.message || "Periksa koneksi server AskMatheal."}`;
      setChat([...newChat, { role: "ai", text: errorText }]);
      if (sessionId) {
        try { await saveHistoryMessage({ sessionId, role: "ai", text: errorText }); } catch {}
      }
    } finally {
      setIsTyping(false);
      loadSessions();
    }
  };

  const suggestions = ["Jelaskan rumus limit dengan sederhana", "Bantu saya memahami logika proposisi", "Berikan contoh soal himpunan"];

  return (
    <><UserSidebar /><div className="usb-page-content ask-page"><div className={`ask-workspace${historyCollapsed ? " history-collapsed" : ""}`}>
      <button type="button" className={`ask-history-overlay${mobileHistoryOpen ? " is-open" : ""}`} onClick={() => setMobileHistoryOpen(false)} aria-label="Tutup histori percakapan" />
      <aside className={`ask-history-panel${mobileHistoryOpen ? " is-open" : ""}`} aria-label="Histori percakapan AskMatheal">
        <div className="ask-history-toolbar">
          <button type="button" className="ask-new-chat" onClick={startNewChat}>＋ <span>Percakapan baru</span></button>
          <button type="button" className="ask-history-collapse" onClick={toggleHistory} aria-label="Perkecil histori percakapan">‹</button>
        </div>
        <div className="ask-history-heading">Histori percakapan</div>
        <div className="ask-history-list">
          {historyLoading && sessions.length === 0 && <div className="ask-history-empty">Memuat histori...</div>}
          {!historyLoading && sessions.length === 0 && <div className="ask-history-empty">Belum ada percakapan tersimpan.</div>}
          {sessions.map((session) => <button type="button" key={session.id} className={`ask-history-item ${Number(session.id) === activeSessionId ? "active" : ""}`} onClick={() => openSession(session.id)}>
            <span><strong>{session.title}</strong><small>{session.preview || "Percakapan baru"}</small></span>
            <i role="button" tabIndex="0" aria-label={`Hapus ${session.title}`} onClick={(event) => deleteSession(event, session.id)}>×</i>
          </button>)}
        </div>
      </aside>
      <div className="chat-container">
        <div className="chat-header"><button type="button" className="ask-history-toggle" onClick={toggleHistory} aria-label="Buka atau tutup histori percakapan" aria-expanded={mobileHistoryOpen || !historyCollapsed}><span></span><span></span><span></span></button><div className="ai-avatar">M</div><div className="chat-title"><h2>AskMatheal</h2><p><span className={`status-dot status-${aiStatus}`}></span> {aiStatus === "ready" ? "Gemini siap membantu" : aiStatus === "checking" ? "Memeriksa koneksi Gemini..." : aiStatus === "degraded" ? "Gemini sedang dihubungkan kembali" : "Server AskMatheal tidak terhubung"}</p></div><span className="chat-header-badge">Tutor AI</span></div>
        <div className="chat-box" aria-live="polite">
          {chat.length === 1 && <div className="ask-suggestions">{suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => sendMessage(suggestion)}>{suggestion}</button>)}</div>}
          {chat.map((item, index) => <div key={`${item.role}-${index}`} className={`msg-row ${item.role === "user" ? "msg-user" : "msg-ai"}`}><div className={item.role === "ai" ? "ai-small-avatar" : "user-avatar"}>{item.role === "ai" ? "M" : "U"}</div><div className="msg-bubble"><FormattedMessage>{item.text}</FormattedMessage></div></div>)}
          {isTyping && <div className="typing-indicator"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>}<div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area"><input className="chat-input" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === "Enter" && sendMessage()} placeholder="Tanyakan tentang matematika di sini..." disabled={isTyping} /><button type="button" className="send-btn" onClick={() => sendMessage()} disabled={isTyping || !message.trim()}><span aria-hidden="true">→</span><span className="sr-only">Kirim</span></button></div>
      </div>
    </div></div></>
  );
}

export default AskMatheal;
