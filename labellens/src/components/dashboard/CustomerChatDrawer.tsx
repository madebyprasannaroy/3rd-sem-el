"use client";

import { useState } from "react";
import { MessageSquare, Send, Sparkles, X, ShieldAlert, Bot, User, Bookmark } from "lucide-react";

interface Citation {
  fieldKey: string;
  panel: string;
  snippet: string;
}

interface Message {
  sender: "user" | "bot";
  text: string;
  citations?: Citation[];
  timestamp: string;
}

interface CustomerChatDrawerProps {
  scanId: string;
  productName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerChatDrawer({
  scanId,
  productName = "Product Pack",
  isOpen,
  onClose,
}: CustomerChatDrawerProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: `Hello! I am your LabelLens Assistant. Ask me anything about the scanned labels and ingredients for "${productName}". Every answer is cited directly to an extracted label field.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  if (!isOpen) return null;

  async function handleSend(queryText?: string) {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/scans/${scanId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      const botMsg: Message = {
        sender: "bot",
        text: data.reply,
        citations: data.citations,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I was unable to retrieve a grounded answer for this query. Please check your network connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestedQuestions = [
    "Does this contain palm oil?",
    "How much sugar in teaspoons?",
    "What is the sodium content?",
    "Are there any artificial additives?",
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-1.5">
                <span>LabelLens Grounded Q&A</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.2 rounded font-mono">
                  Grounded
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice banner */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-3 py-2 flex items-center gap-2 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Factual label citations only. Not medical diagnosis or legal certification.</span>
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.sender === "user"
                    ? "bg-brand-700 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-900 rounded-bl-sm border border-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                {/* Grounded Field Citations */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-brand-600" />
                      Traceable Label Citations:
                    </span>
                    {m.citations.map((c, i) => (
                      <div
                        key={i}
                        className="text-[11px] bg-white rounded p-1.5 border border-slate-200 text-slate-700 font-mono"
                      >
                        <span className="text-brand-700 font-semibold">{c.panel}:</span>{" "}
                        <span className="italic">"{c.snippet}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic">
              <span className="inline-block w-2 h-2 rounded-full bg-brand-600 animate-pulse"></span>
              Consulting label extraction and legal parameters…
            </div>
          )}
        </div>

        {/* Suggestions chips */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 overflow-x-auto whitespace-nowrap flex gap-1.5">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs bg-white hover:bg-brand-50 hover:text-brand-800 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1 transition-colors shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about ingredients, nutrition, oil..."
            className="flex-1 text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
