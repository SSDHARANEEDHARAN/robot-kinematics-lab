import { useState, useEffect } from "react";
const n = (v: number, d = 2) => v.toFixed(d);
import { deg2rad, rad2deg, ik2d as solveIK } from "@/lib/kinematics";
import type { Vec2 } from "@/lib/kinematics";
import { Play, Pause, ChevronRight, ChevronLeft, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WalkthroughProps {
  target: Vec2;
  lengths: number[];
  angles: number[];
  unit: "deg" | "rad";
  elbowUp: boolean;
  onStepSelect?: (step: number) => void;
}

export function IKWalkthrough({ target, lengths, angles, unit, elbowUp: initialElbowUp, onStepSelect }: WalkthroughProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [autoplayDelay, setAutoplayDelay] = useState(2000);
  const [lockElbow, setLockElbow] = useState<"auto" | "up" | "down">("auto");
  
  const effectiveElbowUp = lockElbow === "auto" ? initialElbowUp : lockElbow === "up";
  
  const l1 = lengths[0] ?? 0;
  const l2 = lengths[1] ?? 0;
  const x = target.x;
  const y = target.y;
  const d2 = x * x + y * y;
  const d = Math.sqrt(d2);
  
  const cos2 = (d2 - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  
  // Solve both solutions
  const solUp = solveIK(lengths, target, true);
  const solDown = solveIK(lengths, target, false);
  
  const u = (deg: number) => (unit === "deg" ? `${deg.toFixed(1)}°` : `${deg2rad(deg).toFixed(3)}`);

  const steps = [
    {
      title: "1. Cartesian Distance",
      description: "Calculate distance from base to target.",
      tooltip: "The hypotenuse represents the total required reach in a straight line from the origin (0,0).",
      formula: "D = √(x² + y²)",
      calculation: `D = √(${n(x)}² + ${n(y)}²) = ${n(d)}`,
    },
    {
      title: "2. Reachability Check",
      description: "Verify target is within workspace.",
      tooltip: "If D is greater than L1+L2, the target is too far. If D is less than |L1-L2|, it's inside the 'dead zone'.",
      formula: "|L₁ - L₂| ≤ D ≤ L₁ + L₂",
      calculation: `${n(Math.abs(l1 - l2))} ≤ ${n(d)} ≤ ${n(l1 + l2)}`,
    },
    {
      title: "3. Law of Cosines (θ₂)",
      description: "Solve for the interior elbow angle.",
      tooltip: "We use the Law of Cosines on the triangle formed by L1, L2, and the distance D to find the internal angle.",
      formula: "cos(θ₂) = (D² - L₁² - L₂²) / (2 · L₁ · L₂)",
      calculation: `cos(θ₂) = ${n(cos2, 4)}`,
    },
    {
      title: "4. Elbow Configuration",
      description: "Two valid solutions exist for θ₂ (±acos).",
      tooltip: "Robots can reach the same point by bending the elbow up or down. Mathematically, this is the positive and negative root of the arccosine.",
      formula: "θ₂ = ±acos(cos(θ₂))",
      up: `Up: ${u(solUp.angles[1] ?? 0)}`,
      down: `Down: ${u(solDown.angles[1] ?? 0)}`,
    },
    {
      title: "5. Base Angle (θ₁)",
      description: "Final orientation based on θ₂.",
      tooltip: "The base angle depends on both the target position and how Link 2 is oriented relative to Link 1.",
      formula: "θ₁ = atan2(y,x) - atan2(L₂s₂, L₁+L₂c₂)",
      up: `Up: ${u(solUp.angles[0] ?? 0)}`,
      down: `Down: ${u(solDown.angles[0] ?? 0)}`,
    },
  ];

  useEffect(() => {
    onStepSelect?.(activeStep);
  }, [activeStep, onStepSelect]);

  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(() => {
      setActiveStep((s) => (s + 1) % steps.length);
    }, autoplayDelay);
    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, steps.length]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">IK Walkthrough</h3>
          <button 
            onClick={() => setAutoplay(!autoplay)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase transition-all ${autoplay ? 'bg-foreground text-background' : 'bg-secondary text-foreground'}`}
          >
            {autoplay ? <Pause size={10} /> : <Play size={10} />}
            {autoplay ? 'Stop' : 'Auto'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
           <div className="flex flex-col gap-1">
             <span className="text-[8px] font-bold uppercase text-muted-foreground">Speed</span>
             <input 
               type="range" 
               min="500" 
               max="5000" 
               step="100"
               value={autoplayDelay}
               onChange={(e) => setAutoplayDelay(Number(e.target.value))}
               className="w-full"
             />
           </div>
           
           <div className="flex flex-col gap-1">
             <span className="text-[8px] font-bold uppercase text-muted-foreground">Elbow</span>
             <div className="flex items-center justify-between gap-1 rounded-lg bg-secondary p-0.5">
               {(['auto', 'up', 'down'] as const).map((l) => (
                 <button
                   key={l}
                   onClick={() => setLockElbow(l)}
                   className={`flex-1 rounded-md py-0.5 text-[8px] font-bold uppercase transition-all ${
                     lockElbow === l ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                   }`}
                 >
                   {l}
                 </button>
               ))}
             </div>
           </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="flex-1 space-y-3 overflow-y-auto scrollbar-hide px-0.5">
          {steps.map((step, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => setActiveStep(i)}
                  className={`cursor-pointer rounded-2xl p-4 transition-all ${
                    activeStep === i 
                      ? "bg-secondary" 
                      : "hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${activeStep === i ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.title}
                    </h4>
                    <Info size={10} className="text-muted-foreground opacity-40" />
                  </div>
                  
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                  
                  <div className="mt-3 space-y-2 font-mono text-[10px]">
                    <div className="text-muted-foreground/50">{step.formula}</div>
                    {step.calculation && (
                      <div className="font-bold">{step.calculation}</div>
                    )}
                    {(step.up || step.down) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`rounded-xl p-2 ${effectiveElbowUp ? 'bg-foreground text-background' : 'bg-background/50 opacity-30'}`}>
                          <div className="text-[8px] uppercase font-bold opacity-50 mb-0.5">Up</div>
                          <div className="font-bold truncate">{step.up}</div>
                        </div>
                        <div className={`rounded-xl p-2 ${!effectiveElbowUp ? 'bg-foreground text-background' : 'bg-background/50 opacity-30'}`}>
                          <div className="text-[8px] uppercase font-bold opacity-50 mb-0.5">Down</div>
                          <div className="font-bold truncate">{step.down}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px]">
                <p>{step.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          disabled={activeStep === 0}
          className="rounded-full bg-secondary p-2 transition-all hover:bg-foreground hover:text-background disabled:opacity-20"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
          {activeStep + 1} / {steps.length}
        </span>
        <button
          onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
          disabled={activeStep === steps.length - 1}
          className="rounded-full bg-secondary p-2 transition-all hover:bg-foreground hover:text-background disabled:opacity-20"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
