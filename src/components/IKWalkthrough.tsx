import { useState, useEffect } from "react";
const n = (v: number, d = 2) => v.toFixed(d);
import { deg2rad, rad2deg, ik2d as solveIK } from "@/lib/kinematics";
import type { Vec2 } from "@/lib/kinematics";
import { Play, Pause, ChevronRight, ChevronLeft } from "lucide-react";

interface WalkthroughProps {
  target: Vec2;
  lengths: number[];
  angles: number[];
  unit: "deg" | "rad";
  elbowUp: boolean;
  onStepSelect?: (step: number) => void;
}

export function IKWalkthrough({ target, lengths, angles, unit, elbowUp, onStepSelect }: WalkthroughProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  
  const l1 = lengths[0] ?? 0;
  const l2 = lengths[1] ?? 0;
  const x = target.x;
  const y = target.y;
  const d2 = x * x + y * y;
  const d = Math.sqrt(d2);
  
  const cos2 = (d2 - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  
  // Solve both solutions
  const solUp = solveIK(target, lengths, true);
  const solDown = solveIK(target, lengths, false);
  
  const u = (deg: number) => (unit === "deg" ? `${deg.toFixed(1)}°` : `${deg2rad(deg).toFixed(3)}`);

  const steps = [
    {
      title: "1. Cartesian Distance",
      description: "Calculate distance from base to target.",
      formula: "D = √(x² + y²)",
      calculation: `D = √(${n(x)}² + ${n(y)}²) = ${n(d)}`,
    },
    {
      title: "2. Reachability Check",
      description: "Verify target is within workspace.",
      formula: "|L₁ - L₂| ≤ D ≤ L₁ + L₂",
      calculation: `${n(Math.abs(l1 - l2))} ≤ ${n(d)} ≤ ${n(l1 + l2)}`,
    },
    {
      title: "3. Law of Cosines (θ₂)",
      description: "Solve for the interior elbow angle.",
      formula: "cos(θ₂) = (D² - L₁² - L₂²) / (2 · L₁ · L₂)",
      calculation: `cos(θ₂) = ${n(cos2, 4)}`,
    },
    {
      title: "4. Elbow Configuration",
      description: "Two valid solutions exist for θ₂ (±acos).",
      formula: "θ₂ = ±acos(cos(θ₂))",
      up: `Elbow Up: ${u(solUp.angles[1] ?? 0)}`,
      down: `Elbow Down: ${u(solDown.angles[1] ?? 0)}`,
    },
    {
      title: "5. Base Angle (θ₁)",
      description: "Final orientation based on θ₂.",
      formula: "θ₁ = atan2(y,x) - atan2(L₂s₂, L₁+L₂c₂)",
      up: `Elbow Up: ${u(solUp.angles[0] ?? 0)}`,
      down: `Elbow Down: ${u(solDown.angles[0] ?? 0)}`,
    },
  ];

  useEffect(() => {
    onStepSelect?.(activeStep);
  }, [activeStep, onStepSelect]);

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(() => {
      setActiveStep((s) => (s + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [autoplay, steps.length]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">IK Walkthrough</h3>
        <button 
          onClick={() => setAutoplay(!autoplay)}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-bold uppercase transition-colors ${autoplay ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
        >
          {autoplay ? <Pause size={10} /> : <Play size={10} />}
          {autoplay ? 'Stop' : 'Autoplay'}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide pr-2">
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
            <h4 className={`text-[10px] font-bold uppercase tracking-wider ${activeStep === i ? "text-primary" : "text-muted-foreground"}`}>
              {step.title}
            </h4>
            <p className="mt-1 text-[10px] leading-relaxed text-secondary-foreground/80">
              {step.description}
            </p>
            
            <div className="mt-2 space-y-1.5 font-mono text-[10px]">
              <div className="text-muted-foreground/60">{step.formula}</div>
              {step.calculation && (
                <div className="font-bold text-foreground">{step.calculation}</div>
              )}
              {(step.up || step.down) && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className={`rounded p-1.5 border ${elbowUp ? 'border-primary bg-primary/5 text-primary' : 'border-border opacity-60'}`}>
                    <div className="text-[8px] uppercase font-bold mb-0.5">Up</div>
                    <div className="font-bold truncate">{step.up}</div>
                  </div>
                  <div className={`rounded p-1.5 border ${!elbowUp ? 'border-primary bg-primary/5 text-primary' : 'border-border opacity-60'}`}>
                    <div className="text-[8px] uppercase font-bold mb-0.5">Down</div>
                    <div className="font-bold truncate">{step.down}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between border-t border-border pt-3">
        <button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          className="rounded border border-border p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[10px] font-bold text-muted-foreground tracking-widest">
          {activeStep + 1} / {steps.length}
        </span>
        <button
          onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
          disabled={activeStep === steps.length - 1}
          className="rounded border border-border p-1.5 transition-colors hover:bg-accent disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
