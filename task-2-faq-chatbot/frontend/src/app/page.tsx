"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";

type Faq = {
  id: number;
  question: string;
  answer: string;
};

type ChatResponse = {
  answer: string;
  matched_question: string | null;
  confidence: number;
  suggestions: {
    question: string;
    score: number;
  }[];
};

type Message = {
  id: number;
  role: "bot" | "user";
  text: string;
  meta?: string;
  warning?: boolean;
};

const API_URL =  "http://127.0.0.1:8001";

const fallbackExamples = [
  "How do I track my order?",
  "What is your return policy?",
  "How do I reset my password?",
  "Where can I find my invoice?",
  "When will I receive my refund?",
];

export default function Home() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "bot",
      text: "Hi. Ask me an FAQ question and I will match it against the knowledge base using TF-IDF cosine similarity.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const nextId = useRef(2);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/faqs`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("FAQ API failed");
        }
        return response.json();
      })
      .then((data: Faq[]) => {
        setFaqs(data);
        setIsOnline(true);
      })
      .catch(() => {
        setIsOnline(false);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(message: Omit<Message, "id">) {
    setMessages((current) => [...current, { id: nextId.current++, ...message }]);
  }

  async function askBot(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isSending) {
      return;
    }

    addMessage({ role: "user", text: trimmed });
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Chat API failed");
      }

      const data = (await response.json()) as ChatResponse;
      const meta = data.matched_question
        ? `Matched: "${data.matched_question}" | confidence ${Math.round(data.confidence * 100)}%`
        : `Closest topics: ${data.suggestions.map((item) => item.question).join(" | ")}`;

      addMessage({
        role: "bot",
        text: data.answer,
        meta,
        warning: !data.matched_question,
      });
      setIsOnline(true);
    } catch {
      addMessage({
        role: "bot",
        text: "The backend API is not reachable. Start FastAPI on port 8000 and try again.",
        warning: true,
      });
      setIsOnline(false);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askBot(input);
  }

  const examples = faqs.length ? faqs.slice(0, 8).map((faq) => faq.question) : fallbackExamples;

  return (
    <main className="page">
      <section className="shell" aria-label="FAQ chatbot">
        <header className="topbar">
          <div>
            <p className="eyebrow">React + FastAPI</p>
            <h1>FAQ Chatbot</h1>
          </div>
          <div className="status" aria-label="API status">
            <span className={`status-dot ${isOnline ? "" : "offline"}`} />
            {isOnline ? "API online" : "API offline"}
          </div>
        </header>

        <div className="workspace">
          <aside className="sidebar" aria-label="Example questions">
            <h2>Try asking</h2>
            <div className="examples">
              {examples.map((question) => (
                <button
                  className="example-button"
                  key={question}
                  suppressHydrationWarning
                  type="button"
                  onClick={() => void askBot(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </aside>

          <section className="chat" aria-label="Conversation">
            <div className="messages">
              {messages.map((message) => (
                <article
                  className={`message ${message.role} ${message.warning ? "warning" : ""}`}
                  key={message.id}
                >
                  {message.role === "bot" ? <Bot size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}
                  <p>{message.text}</p>
                  {message.meta ? <span className="meta">{message.meta}</span> : null}
                </article>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="composer" onSubmit={handleSubmit}>
              <input
                aria-label="Ask an FAQ question"
                autoComplete="off"
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about orders, payments, returns, account access..."
                suppressHydrationWarning
                value={input}
              />
              <button className="send-button" disabled={isSending} suppressHydrationWarning type="submit">
                <Send size={16} aria-hidden="true" />
                {isSending ? "Sending" : "Send"}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
