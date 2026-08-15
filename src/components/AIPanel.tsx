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
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide" style={{ maxHeight: "400px" }}>
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Ask me anything about the current robot configuration, math, or lessons.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => ask("Why is my target unreachable?")}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:bg-accent"
              >
                "Why unreachable?"
              </button>
              <button
                onClick={() => ask("What is a singularity?")}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:bg-accent"
              >
                "What is a singularity?"
              </button>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`border-2 p-4 text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] ${
              m.role === "user"
                ? "ml-8 bg-foreground text-background border-foreground"
                : "mr-8 bg-background text-foreground border-foreground"
            }`}
          >
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest opacity-60">
              {m.role === "user" ? "You" : "AI Tutor"}
            </span>
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-8 animate-pulse border-2 border-foreground bg-background p-4 text-sm text-muted-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
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
          className="border-2 border-foreground bg-foreground px-4 py-2 text-sm font-black uppercase tracking-widest text-background shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
