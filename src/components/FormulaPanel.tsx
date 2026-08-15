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
        hot ? "bg-foreground text-background" : "text-foreground"
      }`}
    >
      {label && <span className="mr-2 font-sans text-[11px] font-black uppercase tracking-widest text-foreground opacity-50">{label}</span>}
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
        x = <span className="font-bold">{n(end.x)}</span>
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
        y = <span className="font-bold">{n(end.y)}</span>
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
        <span className="font-bold">{n(d)}</span>
      </Line>
      <Line label="2">
        reach: |L₁−L₂| ≤ D ≤ L₁+L₂ → {n(Math.abs(l1 - l2), 0)} ≤ {n(d)} ≤ {n(l1 + l2, 0)}{" "}
        <span className={reachable ? "font-bold" : "font-bold text-foreground opacity-50 underline decoration-wavy"}>
          {reachable ? "OK" : "OUT OF REACH"}
        </span>
      </Line>
      <Line label="3" hot={hotTarget}>
        cos(θ₂) = (x²+y²−L₁²−L₂²) / (2·L₁·L₂) = {n(cos2, 4)}
      </Line>
      <Line label="4" hot={hotTarget}>
        θ₂ = ±acos({n(cos2, 4)}) = <span className="font-bold">{u(t2)}</span>
      </Line>
      <Line label="5">θ₁ = atan2(y, x) − atan2(L₂·sin θ₂, L₁ + L₂·cos θ₂)</Line>
      <Line label="6" hot={hotTarget}>
        θ₁ = {u(rad2deg(Math.atan2(target.y, target.x)))} −{" "}
        {u(
          rad2deg(
            Math.atan2(l2 * Math.sin(deg2rad(t2)), l1 + l2 * Math.cos(deg2rad(t2))),
          ),
        )}{" "}
        = <span className="font-bold">{u(t1)}</span>
      </Line>
    </div>
  );
}

export function DHFormula({
  frames,
  dhRows,
  step,
  onStep,
}: {
  frames: Mat4[];
  dhRows: any[];
  step: number;
  onStep: (s: number) => void;
}) {
  const count = Math.max(0, frames.length - 1);
  const currentMatrix = frames[step + 1] as Mat4;
  const prevMatrix = frames[step] as Mat4;

  const renderMatrix = (m: Mat4, label?: string, highlight = false) => (
    <div className={`space-y-1 ${highlight ? "scale-105 transition-transform" : ""}`}>
      {label && <p className="mb-1 text-[10px] font-bold opacity-60">{label}</p>}
      <div className={`rounded-md ${highlight ? "bg-foreground text-background" : "bg-secondary"} p-2 font-mono text-[10px]`}>
        {[0, 1, 2, 3].map((r) => (
          <div key={r} className="flex gap-2 whitespace-nowrap">
            {[0, 1, 2, 3].map((c) => (
              <span key={c} className={`w-10 text-right ${highlight ? "text-background" : "text-secondary-foreground"}`}>
                {(m?.[r * 4 + c] ?? 0).toFixed(1)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {renderMatrix(prevMatrix, `T${step}`)}
          <span className="text-lg font-bold">×</span>
          {renderMatrix(dhRows[step] ? (dhMatrix(dhRows[step]) as any) : identity(), `A${step + 1}`, true)}
          <span className="text-lg font-bold">=</span>
          {renderMatrix(currentMatrix, `T${step + 1}`)}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-secondary px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-foreground hover:text-background"
            onClick={() => onStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            ◀ PREV
          </button>
          <button
            type="button"
            className="rounded-md bg-secondary px-3 py-1.5 text-[11px] font-bold transition-colors hover:bg-foreground hover:text-background"
            onClick={() => onStep(Math.min(count - 1, step + 1))}
            disabled={step >= count - 1}
          >
            NEXT ▶
          </button>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          Step {step + 1} of {count}
        </span>
      </div>
    </div>
  );
}

// Helpers for the formula panel matrix display
const dhMatrix = ({ theta, d, a, alpha }: any) => {
  const ct = Math.cos((theta * Math.PI) / 180);
  const st = Math.sin((theta * Math.PI) / 180);
  const ca = Math.cos((alpha * Math.PI) / 180);
  const sa = Math.sin((alpha * Math.PI) / 180);
  return [
    ct, -st * ca, st * sa, a * ct,
    st, ct * ca, -ct * sa, a * st,
    0, sa, ca, d,
    0, 0, 0, 1,
  ];
};

const identity = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
