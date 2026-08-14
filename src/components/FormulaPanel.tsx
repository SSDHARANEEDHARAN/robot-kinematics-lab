import { useEffect, useRef, useState } from "react";
import { deg2rad, rad2deg, type Mat4, type Vec2 } from "@/lib/kinematics";

type Unit = "deg" | "rad";

function Line({
  label,
  children,
  hot,
}: {
  label?: string;
  children: React.ReactNode;
  hot?: boolean;
}) {
  return (
    <div
      className={`rounded-md px-2 py-1.5 font-mono text-xs leading-relaxed transition-colors ${
        hot ? "bg-primary/10 text-foreground" : "text-secondary-foreground"
      }`}
    >
      {label && <span className="mr-2 font-sans text-[11px] font-bold text-brand">{label}</span>}
      {children}
    </div>
  );
}

function useChanged(value: string) {
  const [hot, setHot] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setHot(true);
      const id = setTimeout(() => setHot(false), 600);
      return () => clearTimeout(id);
    }
    return;
  }, [value]);
  return hot;
}

const n = (v: number, d = 2) => v.toFixed(d);

export function FKFormula({
  lengths,
  angles,
  unit,
  end,
}: {
  lengths: number[];
  angles: number[];
  unit: Unit;
  end: Vec2;
}) {
  const a = (i: number) => angles.slice(0, i + 1).reduce((s, v) => s + (v ?? 0), 0);
  const u = (deg: number) => (unit === "deg" ? `${n(deg, 1)}°` : `${n(deg2rad(deg), 3)}`);
  const hot = useChanged(angles.join(",") + lengths.join(","));

  return (
    <div className="space-y-1">
      <Line label="1">x = Σ Lᵢ·cos(θ₁+…+θᵢ)</Line>
      <Line label="2" hot={hot}>
        x ={" "}
        {lengths
          .map((L, i) => `${n(L, 0)}·cos(${u(a(i))})`)
          .join(" + ")}
      </Line>
      <Line label="3" hot={hot}>
        x = <span className="font-bold text-primary">{n(end.x)}</span>
      </Line>
      <div className="h-1" />
      <Line label="1">y = Σ Lᵢ·sin(θ₁+…+θᵢ)</Line>
      <Line label="2" hot={hot}>
        y ={" "}
        {lengths
          .map((L, i) => `${n(L, 0)}·sin(${u(a(i))})`)
          .join(" + ")}
      </Line>
      <Line label="3" hot={hot}>
        y = <span className="font-bold text-primary">{n(end.y)}</span>
      </Line>
    </div>
  );
}

export function IKFormula({
  lengths,
  target,
  angles,
  unit,
  reachable,
}: {
  lengths: number[];
  target: Vec2;
  angles: number[];
  unit: Unit;
  reachable: boolean;
}) {
  const l1 = lengths[0] ?? 0;
  const l2 = lengths[1] ?? 0;
  const d = Math.hypot(target.x, target.y);
  const cos2 = (target.x * target.x + target.y * target.y - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const t1 = angles[0] ?? 0;
  const t2 = angles[1] ?? 0;
  const u = (deg: number) => (unit === "deg" ? `${n(deg, 1)}°` : `${n(deg2rad(deg), 3)}`);
  const hotTarget = useChanged(`${target.x},${target.y}`);

  return (
    <div className="space-y-1">
      <Line label="1" hot={hotTarget}>
        D = √(x² + y²) = √({n(target.x)}² + {n(target.y)}²) ={" "}
        <span className="font-bold text-primary">{n(d)}</span>
      </Line>
      <Line label="2">
        reach: |L₁−L₂| ≤ D ≤ L₁+L₂ → {n(Math.abs(l1 - l2), 0)} ≤ {n(d)} ≤ {n(l1 + l2, 0)}{" "}
        <span className={reachable ? "font-bold text-link-3" : "font-bold text-destructive"}>
          {reachable ? "OK" : "OUT OF REACH"}
        </span>
      </Line>
      <Line label="3" hot={hotTarget}>
        cos(θ₂) = (x²+y²−L₁²−L₂²) / (2·L₁·L₂) = {n(cos2, 4)}
      </Line>
      <Line label="4" hot={hotTarget}>
        θ₂ = ±acos({n(cos2, 4)}) = <span className="font-bold text-primary">{u(t2)}</span>
      </Line>
      <Line label="5">θ₁ = atan2(y, x) − atan2(L₂·sin θ₂, L₁ + L₂·cos θ₂)</Line>
      <Line label="6" hot={hotTarget}>
        θ₁ = {u(rad2deg(Math.atan2(target.y, target.x)))} −{" "}
        {u(
          rad2deg(
            Math.atan2(l2 * Math.sin(deg2rad(t2)), l1 + l2 * Math.cos(deg2rad(t2))),
          ),
        )}{" "}
        = <span className="font-bold text-primary">{u(t1)}</span>
      </Line>
    </div>
  );
}

export function DHFormula({ frames, step, onStep }: { frames: Mat4[]; step: number; onStep: (s: number) => void }) {
  const count = Math.max(0, frames.length - 1);
  const shown = frames[Math.min(step + 1, frames.length - 1)] as Mat4;
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-secondary-foreground">
        T = A₁ · A₂ · … · A{count} &nbsp; (multiplying up to A{step + 1})
      </p>
      <div className="rounded-md bg-secondary p-2 font-mono text-[11px]">
        {[0, 1, 2, 3].map((r) => (
          <div key={r} className="flex gap-3 whitespace-nowrap">
            {[0, 1, 2, 3].map((c) => (
              <span key={c} className="w-12 text-right text-secondary-foreground">
                {(shown?.[r * 4 + c] ?? 0).toFixed(2)}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-xs font-semibold"
          onClick={() => onStep(Math.max(0, step - 1))}
        >
          ◀ step
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-xs font-semibold"
          onClick={() => onStep(Math.min(count - 1, step + 1))}
        >
          step ▶
        </button>
        <span className="text-xs text-muted-foreground">
          A{step + 1} of {count}
        </span>
      </div>
    </div>
  );
}
