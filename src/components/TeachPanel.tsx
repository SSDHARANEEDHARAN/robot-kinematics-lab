import type { Waypoint } from "@/lib/lab";

export function TeachPanel({
  waypoints,
  playing,
  activeIndex,
  onTeach,
  onDelete,
  onSetMove,
  onSetSpeed,
  onGoto,
  onPlay,
  onStop,
  onClear,
  onJogJoint,
  onJogCart,
  jointCount,
  onRunDemo,
}: {
  waypoints: Waypoint[];
  playing: boolean;
  activeIndex: number;
  onTeach: () => void;
  onDelete: (id: string) => void;
  onSetMove: (id: string, m: "MOVJ" | "MOVL") => void;
  onSetSpeed: (id: string, s: number) => void;
  onGoto: (id: string) => void;
  onPlay: () => void;
  onStop: () => void;
  onClear: () => void;
  onJogJoint: (i: number, delta: number) => void;
  onJogCart: (axis: "x" | "y", delta: number) => void;
  jointCount: number;
  onRunDemo: (type: "pick" | "round" | "dance") => void;
}) {
  const btn = "rounded-lg border border-border bg-secondary px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all active:scale-95";
  const jog = "rounded-lg bg-secondary px-3 py-2 text-[10px] font-bold text-foreground hover:bg-foreground hover:text-background transition-all active:scale-95";
  
  return (
    <div className="space-y-6">
      <div>
        <h4 className="lab-label mb-3">Demo Programs</h4>
        <div className="grid grid-cols-3 gap-2">
          <button className={btn} onClick={() => onRunDemo("pick")}>Pick & Place</button>
          <button className={btn} onClick={() => onRunDemo("round")}>Arounding</button>
          <button className={btn} onClick={() => onRunDemo("dance")}>Dancing</button>
        </div>
      </div>

      <div>
        <h4 className="lab-label mb-3">Joint jog (FK)</h4>
        <div className="space-y-2">
          {Array.from({ length: jointCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 text-[10px] font-black uppercase">J{i + 1}</span>
              <button className={`${jog} flex-1`} onClick={() => onJogJoint(i, -5)}>−5°</button>
              <button className={`${jog} flex-1`} onClick={() => onJogJoint(i, 5)}>+5°</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="lab-label mb-3">Cartesian jog (IK)</h4>
        <div className="grid grid-cols-4 gap-2">
          <button className={jog} onClick={() => onJogCart("x", -10)}>X−</button>
          <button className={jog} onClick={() => onJogCart("x", 10)}>X+</button>
          <button className={jog} onClick={() => onJogCart("y", -10)}>Y−</button>
          <button className={jog} onClick={() => onJogCart("y", 10)}>Y+</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button className="rounded-lg bg-foreground px-4 py-2 text-xs font-black uppercase tracking-widest text-background transition-all hover:opacity-90 active:scale-95" onClick={onTeach}>
          Teach P{waypoints.length + 1}
        </button>
        <button className="rounded-lg border border-border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all hover:bg-secondary" onClick={playing ? onStop : onPlay}>
          {playing ? "Stop" : "Play"}
        </button>
        <button className="rounded-lg border border-border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all hover:bg-secondary" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="rounded-xl bg-secondary/30 p-4 font-mono text-[10px] space-y-2">
        {waypoints.length === 0 ? (
          <p className="text-muted-foreground italic">No points taught yet.</p>
        ) : (
          waypoints.map((w, i) => (
            <div key={w.id} className={`flex items-center justify-between p-2 rounded ${i === activeIndex && playing ? "bg-primary/10" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="font-bold opacity-50">{String(i + 1).padStart(2, "0")}</span>
                <button className="font-bold hover:text-primary" onClick={() => onGoto(w.id)}>{w.name}</button>
              </div>
              <button className="text-[9px] font-bold text-destructive uppercase" onClick={() => onDelete(w.id)}>del</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
