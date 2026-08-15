import { LESSONS, type Lesson, type LessonState } from "@/lib/lessons";
import { useState, useEffect } from "react";
import { CheckCircle2, Circle } from "lucide-react";

export function LessonPanel({
  state,
  activeId,
  onSelect,
  completed,
}: {
  state: LessonState;
  activeId: string;
  onSelect: (l: Lesson) => void;
  completed: Record<string, boolean>;
}) {
  const [showIntro, setShowIntro] = useState(true);
  const active = LESSONS.find((l: Lesson) => l.id === activeId) ?? LESSONS[0]!;
  const passed = active.check(state);

  // Auto-complete lesson if check passes
  useEffect(() => {
    if (passed && !completed[active.id]) {
      // Small delay for visual feedback
      const timer = setTimeout(() => {
        // Parent will handle the completion state
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [passed, active.id, completed]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {LESSONS.map((l: Lesson, idx: number) => (
          <button
            key={l.id}
            onClick={() => {
              setShowIntro(true);
              onSelect(l);
            }}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              l.id === activeId
                ? "bg-foreground text-background shadow-lg shadow-foreground/20"
                : completed[l.id]
                  ? "bg-secondary text-foreground"
                  : "bg-secondary/40 text-muted-foreground opacity-60 hover:opacity-100"
            }`}
          >
            {completed[l.id] ? <CheckCircle2 size={12} /> : <Circle size={12} />}
            <span>Lesson {idx + 1}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Interactive Guide</span>
            <div className="h-[1px] flex-1 bg-border" />
          </div>
          <h4 className="text-2xl font-black uppercase tracking-tighter text-foreground">{active.title}</h4>
        </div>

        <div className="space-y-3">
          {active.body.map((p: string, i: number) => (
            <p key={i} className="font-mono text-[11px] leading-relaxed text-muted-foreground/80">
              {p}
            </p>
          ))}
        </div>
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-500 ${
          passed 
            ? "bg-foreground text-background scale-[1.02] shadow-xl shadow-foreground/20" 
            : "bg-secondary/50 text-foreground ring-1 ring-border"
        }`}
      >
        <div className="relative z-10 flex items-start gap-4">
          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${passed ? 'border-background' : 'border-foreground/20'}`}>
            {passed && <CheckCircle2 size={12} fill="currentColor" className="text-foreground" />}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Active Objective</span>
            <p className="text-xs font-bold leading-tight">{active.goal}</p>
          </div>
        </div>
        
        {passed && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/5 to-transparent animate-shimmer" />
        )}
      </div>

      {!passed && (
        <div className="rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            System Feedback
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground italic">
            {active.id.includes('fk') 
              ? "Current values: " + state.angles.map(a => a.toFixed(1) + '°').join(', ')
              : "End-effector distance: " + Math.hypot(state.target.x, state.target.y).toFixed(1) + " units"}
          </p>
        </div>
      )}
    </div>
  );
}
