import { useState, useEffect } from "react";
const n = (v: number, d = 2) => v.toFixed(d);
import { deg2rad, rad2deg } from "@/lib/kinematics";
import type { Vec2 } from "@/lib/kinematics";

interface WalkthroughProps {
  target: Vec2;
  lengths: number[];
  angles: number[];
  unit: "deg" | "rad";
}

export function IKWalkthrough({ target, lengths, angles, unit }: WalkthroughProps) {
  const [activeStep, setActiveStep] = useState(0);
  const l1 = lengths[0] ?? 0;
  const l2 = lengths[1] ?? 0;
  const x = target.x;
  const y = target.y;
  const d2 = x * x + y * y;
  const d = Math.sqrt(d2);
  
  const cos2 = (d2 - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const t2 = angles[1] ?? 0;
  const t1 = angles[0] ?? 0;

  const u = (deg: number) => (unit === "deg" ? `${deg.toFixed(1)}°` : `${deg2rad(deg).toFixed(3)}`);

  const steps = [
    {
      title: "1. Cartesian Distance",
      description: "First, we calculate the distance from the base to the target coordinates.",
      formula: "D = √(x² + y²)",
      calculation: `D = √(${n(x)}² + ${n(y)}²) = ${n(d)}`,
    },
    {
      title: "2. Reachability Check",
      description: "Ensure the target is within the workspace defined by link lengths.",
      formula: "|L₁ - L₂| ≤ D ≤ L₁ + L₂",
      calculation: `${n(Math.abs(l1 - l2))} ≤ ${n(d)} ≤ ${n(l1 + l2)}`,
    },
    {
      title: "3. Law of Cosines (θ₂)",
      description: "Using the triangle formed by L1, L2, and D, we solve for the elbow angle.",
      formula: "cos(θ₂) = (D² - L₁² - L₂²) / (2 · L₁ · L₂)",
      calculation: `cos(θ₂) = (${n(d2)} - ${n(l1*l1)} - ${n(l2*l2)}) / (2 · ${l1} · ${l2}) = ${n(cos2, 4)}`,
    },
    {
      title: "4. Solve θ₂",
      description: "Calculate the angle using inverse cosine (Acos).",
      formula: "θ₂ = acos(cos(θ₂))",
      calculation: `θ₂ = acos(${n(cos2, 4)}) = ${u(t2)}`,
    },
    {
      title: "5. Solve θ₁",
      description: "Finally, calculate the base angle by subtracting the internal triangle angle from the target heading.",
      formula: "θ₁ = atan2(y, x) - atan2(L₂·sin θ₂, L₁ + L₂·cos θ₂)",
      calculation: `θ₁ = ${u(rad2deg(Math.atan2(y, x)))} - ${u(rad2deg(Math.atan2(l2 * Math.sin(deg2rad(t2)), l1 + l2 * Math.cos(deg2rad(t2)))))} = ${u(t1)}`,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide pr-2">
        {steps.map((step, i) => (
          <div
            key={i}
            onClick={() => setActiveStep(i)}
            className={`cursor-pointer rounded-md border p-3 transition-all ${
              activeStep === i 
                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <h4 className={`text-xs font-bold uppercase tracking-wider ${activeStep === i ? "text-primary" : "text-muted-foreground"}`}>
              {step.title}
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-secondary-foreground">
              {step.description}
            </p>
            <div className="mt-2 space-y-1 font-mono text-[10px]">
              <div className="text-muted-foreground">{step.formula}</div>
              <div className="font-bold text-foreground">{step.calculation}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          className="rounded border border-border px-3 py-1 text-[10px] font-bold uppercase transition-colors hover:bg-accent disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-[10px] font-bold text-muted-foreground">
          Step {activeStep + 1} / {steps.length}
        </span>
        <button
          type="button"
          onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
          disabled={activeStep === steps.length - 1}
          className="rounded border border-border px-3 py-1 text-[10px] font-bold uppercase transition-colors hover:bg-accent disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
