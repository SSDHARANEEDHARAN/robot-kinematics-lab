import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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
    <div className="border-b-2 border-foreground last:border-b-0">
      <div 
        className={`flex items-center justify-between px-5 py-4 ${collapsible ? 'cursor-pointer hover:bg-muted/30' : ''}`}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {collapsible && (
            <span className="text-muted-foreground">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          <h3 className="lab-label">{title}</h3>
        </div>
        {aside ? <span className="text-xs font-medium text-muted-foreground">{aside}</span> : null}
      </div>
      {(!collapsible || isOpen) && (
        <div className="px-5 pb-4">
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
      className={`gap-1 rounded-lg bg-secondary p-1 ${stacked ? "grid grid-cols-1" : "grid grid-flow-col auto-cols-fr"}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative z-10 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
            value === o.value
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-sm font-medium text-secondary-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1"
      />
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="lab-input w-20 shrink-0"
      />
    </div>
  );
}

export function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border-2 border-slate-900 bg-secondary px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition-all hover:bg-yellow-400 hover:text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
    >
      {children}
    </button>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="lab-card px-4 py-3 border-l-4 border-l-yellow-400">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black tabular-nums tracking-tight text-primary drop-shadow-none">{value}</div>
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="lab-card overflow-hidden border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {title && (
        <div className="border-b-2 border-slate-900 bg-yellow-400 px-5 py-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "success" | "warning" | "danger" }) {
  const styles = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-link-3/20 text-link-3",
    warning: "bg-link-2/20 text-link-2",
    danger: "bg-destructive/20 text-destructive",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[variant]}`}>
      {children}
    </span>
  );
}
