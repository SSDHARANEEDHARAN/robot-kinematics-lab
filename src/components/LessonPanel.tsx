import { LESSONS, type Lesson, type LessonState } from "@/lib/lessons";

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
  const active = LESSONS.find((l: Lesson) => l.id === activeId) ?? LESSONS[0]!;
  const passed = active.check(state);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {LESSONS.map((l: Lesson) => (
          <button
            key={l.id}
            onClick={() => onSelect(l)}
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${
              l.id === activeId
                ? "bg-foreground text-background"
                : completed[l.id]
                  ? "bg-secondary text-foreground"
                  : "bg-secondary/50 text-muted-foreground opacity-50"
            }`}
          >
            {l.id.replace("l", "")}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-lg font-black uppercase tracking-tight text-foreground">{active.title}</h4>
        {active.body.map((p: string, i: number) => (
          <p key={i} className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>

      <div
        className={`rounded-2xl p-4 text-[11px] font-bold uppercase tracking-widest transition-all ${
          passed ? "bg-foreground text-background" : "bg-secondary text-foreground"
        }`}
      >
        <span className="opacity-50 mr-2">{passed ? "✓" : "Goal:"}</span>
        {active.goal}
      </div>
    </div>
  );
}
