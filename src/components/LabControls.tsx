import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Section({ 
  title, 
  aside, 
  children, 
  collapsible = false, 
  defaultOpen = true 
}: { 
  title: string; 
  aside?: ReactNode; 
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="transition-colors hover:bg-muted/5 group/section">
      <div 
        className={`flex items-center justify-between px-5 py-3 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => collapsible && setIsOpen(!isOpen)}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <span className="text-muted-foreground transition-transform duration-200">
              {isOpen ? <ChevronDown size={14} className="rotate-0" /> : <ChevronRight size={14} className="-rotate-90" />}
            </span>
          )}
          <h3 className="lab-label text-[10px] text-foreground/70 group-hover/section:text-foreground transition-colors">{title}</h3>
        </div>
        {aside ? <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{aside}</span> : null}
      </div>
      {(!collapsible || isOpen) && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}

export function SegButton({
  options,
  value,
  onChange,
  stacked = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  stacked?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      className={`gap-1 rounded-lg bg-secondary/50 p-1 backdrop-blur-md ${stacked ? "grid grid-cols-1" : "grid grid-flow-col auto-cols-fr"}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          role="radio"
          aria-checked={value === o.value}
          className={`relative z-10 rounded-md px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
            value === o.value
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {value === o.value && (
            <div className="absolute inset-0 -z-10 rounded-md bg-primary shadow-sm animate-in fade-in zoom-in-95 duration-300" />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-foreground">{label}</span>
      <input
        type="number"
        step={step}
        className="lab-input"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  ariaLabel,
  tooltip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  ariaLabel?: string;
  tooltip?: string;
}) {
  const input = (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-xs font-bold text-muted-foreground uppercase tracking-wider" id={`slider-label-${label}`}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1"
        aria-labelledby={`slider-label-${label}`}
        aria-label={ariaLabel}
      />
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lab-input w-20 shrink-0 text-center text-xs"
        aria-label={`${label} numeric value`}
      />
    </div>
  );

  if (!tooltip) return input;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{input}</div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function GhostButton({ children, onClick, tooltip }: { children: ReactNode; onClick: () => void; tooltip?: string }) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg bg-secondary px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground transition-all duration-300 hover:bg-primary hover:text-primary-foreground active:scale-95"
    >
      <span className="relative z-10">{children}</span>
    </button>
  );

  if (!tooltip) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 group relative overflow-hidden bg-secondary/20 rounded-xl transition-all duration-300 hover:bg-secondary/30" role="status" aria-label={`${label}: ${value}`}>
      <div className="relative z-10">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">{label}</div>
        <div className="mt-1 text-xl font-black tabular-nums tracking-tighter text-foreground transition-transform duration-300 group-hover:scale-105">{value}</div>
      </div>
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="lab-card group/card shadow-none border-none flex flex-col h-full">
      {title && (
        <div className="bg-secondary/5 px-6 py-5 backdrop-blur-sm border-b border-border/50 shrink-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/70">{title}</h3>
        </div>
      )}
      <div className="p-6 flex-1 overflow-auto scrollbar-hide">{children}</div>
    </div>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "danger" }) {
  const styles = {
    default: "bg-muted text-muted-foreground",
    success: "bg-foreground text-background",
    warning: "bg-foreground text-background",
    danger: "bg-foreground text-background animate-pulse",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 hover:scale-110 ${styles[variant]}`}>
      {children}
    </span>
  );
}
