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
}) {
  const jog =
    "rounded-md border border-border bg-card px-2 py-2 text-sm font-bold text-foreground hover:bg-accent active:bg-secondary";
  return (
    <div className="space-y-4">
      <div>
        <h4 className="lab-label mb-2">Joint jog (FK)</h4>
        <div className="space-y-1.5">
          {Array.from({ length: jointCount }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <span className="text-sm font-semibold">J{i + 1}</span>
              <button className={jog} onClick={() => onJogJoint(i, -5)}>
                J{i + 1}−
              </button>
              <button className={jog} onClick={() => onJogJoint(i, 5)}>
                J{i + 1}+
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="lab-label mb-2">Cartesian jog (IK)</h4>
        <div className="grid grid-cols-4 gap-2">
          <button className={jog} onClick={() => onJogCart("x", -10)}>
            X−
          </button>
          <button className={jog} onClick={() => onJogCart("x", 10)}>
            X+
          </button>
          <button className={jog} onClick={() => onJogCart("y", -10)}>
            Y−
          </button>
          <button className={jog} onClick={() => onJogCart("y", 10)}>
            Y+
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
          onClick={onTeach}
        >
          Teach P{waypoints.length + 1}
        </button>
        <button
          className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
          onClick={playing ? onStop : onPlay}
        >
          {playing ? "Stop" : "Play program"}
        </button>
        <button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="rounded-md bg-secondary p-2 font-mono text-xs">
        {waypoints.length === 0 ? (
          <p className="text-muted-foreground">No points taught yet.</p>
        ) : (
          waypoints.map((w, i) => (
            <div
              key={w.id}
              className={`rounded px-1 py-0.5 ${i === activeIndex && playing ? "bg-primary/15" : ""}`}
            >
              {String(i + 1).padStart(2, "0")}: {w.move} {w.name} SPD={w.spd}
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        {waypoints.map((w) => (
          <div key={w.id} className="rounded-lg border border-border p-2">
            <div className="flex items-center justify-between">
              <button className="text-sm font-bold text-primary" onClick={() => onGoto(w.id)}>
                {w.name}
              </button>
              <button className="text-xs font-semibold text-destructive" onClick={() => onDelete(w.id)}>
                delete
              </button>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              J: {w.angles.map((a) => a.toFixed(1)).join(", ")} | XY: {w.target.x.toFixed(1)},{" "}
              {w.target.y.toFixed(1)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {(["MOVJ", "MOVL"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onSetMove(w.id, m)}
                  className={`rounded-md px-2 py-1 text-xs font-bold ${
                    w.move === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
              <input
                type="range"
                min={10}
                max={100}
                step={10}
                value={w.spd}
                onChange={(e) => onSetSpeed(w.id, Number(e.target.value))}
                className="min-w-0 flex-1"
              />
              <span className="w-8 text-right text-xs font-semibold">{w.spd}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
