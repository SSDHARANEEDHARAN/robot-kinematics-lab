import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTutorHint } from "@/lib/tutor.functions";

type Props = {
  state: {
    mode: string;
    target: { x: number; y: number };
    lengths: number[];
    angles: number[];
    reachable: boolean;
    ikError: number;
  };
};

export function AIPanel({ state }: Props) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const getHint = useServerFn(getTutorHint);

  const ask = async (q?: string) => {
    const question = q || input;
    if (!question && !q) return;

    if (question) setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    setInput("");

    try {
      const hint = await getHint({
        data: {
          ...state,
          userQuestion: question,
        },
      });
      setMessages((m) => [...m, { role: "ai", content: hint }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "ai", content: "I'm having trouble connecting to my robotics knowledge base. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-[400px]">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
        {messages.length === 0 && (
          <div className="rounded-xl bg-secondary/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Ask me anything about the current robot configuration, math, or lessons.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => ask("Why is my target unreachable?")}
                className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                Why unreachable?
              </button>
              <button
                onClick={() => ask("What is a singularity?")}
                className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground hover:bg-foreground hover:text-background transition-colors"
              >
                What is a singularity?
              </button>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 text-sm transition-all ${
              m.role === "user"
                ? "ml-8 bg-foreground text-background"
                : "mr-8 bg-secondary text-foreground"
            }`}
          >
            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] opacity-50">
              {m.role === "user" ? "You" : "AI Tutor"}
            </span>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-8 animate-pulse rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
            Thinking...
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask a question..."
          className="lab-input"
        />
        <button
          onClick={() => ask()}
          disabled={loading}
          className="rounded-lg bg-foreground px-4 py-2 text-xs font-black uppercase tracking-widest text-background transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
