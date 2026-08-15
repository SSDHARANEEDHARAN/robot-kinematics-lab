import { useRef } from "react";
import type { Vec2 } from "@/lib/kinematics";

const LINK_CLASSES = ["stroke-primary", "stroke-accent", "stroke-primary"];

type Props = {
  points: Vec2[];
  lengths: number[];
  showZone: boolean;
  target?: Vec2 | null | undefined;
  onTargetChange?: ((p: Vec2) => void) | undefined;
  ghostPoints?: Vec2[] | undefined;
  trace?: Vec2[] | undefined;
  path?: Vec2[] | undefined;
  onPathPoint?: ((p: Vec2) => void) | undefined;
  workspace?: Vec2[] | undefined;
  velocity?: Vec2 | undefined;
  unit?: "deg" | "rad";
  activeStep?: number | undefined;
  limits?: { min: number; max: number }[];
  angles?: number[];
  interactive?: boolean;
  heatmap?: { x: number; y: number; reachable: boolean }[];
  collisions?: { colliding: boolean, pairs: [number, number][], points: Vec2[] };
};


const r1 = (n: number) => Math.round(n * 1000) / 1000;

const W = 760;
const H = 560;

export function ArmView2D({
  points,
  lengths,
  showZone,
  target,
  onTargetChange,
  ghostPoints,
  trace,
  path,
  onPathPoint,
  workspace,
  velocity,
  unit = "deg",
  activeStep,
  limits,
  angles,
  interactive: forceInteractive,
  heatmap = [],
  collisions,
}: Props) {

  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const maxReach = lengths.reduce((a, b) => a + b, 0);
  const minReach = Math.abs((lengths[0] ?? 0) - (lengths[1] ?? 0));

  const toWorld = (clientX: number, clientY: number): Vec2 | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W - W / 2;
    const y = -(((clientY - r.top) / r.height) * H - H / 2);
    return { x, y };
  };

  const handlePointer = (e: React.PointerEvent) => {
    const p = toWorld(e.clientX, e.clientY);
    if (!p) return;
    const snapped = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
    if (onPathPoint) onPathPoint(snapped);
    else if (onTargetChange) onTargetChange(snapped);
  };

  const grid: number[] = [];
  for (let g = -W / 2; g <= W / 2; g += 40) grid.push(g);
  const gridY: number[] = [];
  for (let g = -H / 2; g <= H / 2; g += 40) gridY.push(g);

  const end = points[points.length - 1] ?? { x: 0, y: 0 };
  const interactive = forceInteractive ?? Boolean(onTargetChange || onPathPoint);

  return (
    <svg
      ref={svgRef}
      viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`}
      className="h-full w-full touch-none select-none"
      style={{ cursor: interactive ? "crosshair" : "default" }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        handlePointer(e);
      }}
      onPointerMove={(e) => dragging.current && handlePointer(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => (dragging.current = false)}
    >
      <g transform="scale(1,-1)">
        {/* heatmap */}
        {heatmap.map((p, i) => (
          <rect
            key={i}
            x={p.x - 7.5}
            y={p.y - 7.5}
            width={15}
            height={15}
            fill={p.reachable ? "rgba(46, 204, 113, 0.15)" : "rgba(231, 76, 60, 0.05)"}
          />
        ))}
        {/* grid */}

        <g stroke="currentColor" className="text-border" strokeWidth={1} opacity={0.3}>
          {grid.map((g) => (
            <line key={`v${g}`} x1={g} y1={-H / 2} x2={g} y2={H / 2} />
          ))}
          {gridY.map((g) => (
            <line key={`h${g}`} x1={-W / 2} y1={g} x2={W / 2} y2={g} />
          ))}
        </g>
        {/* axes */}
        <g stroke="currentColor" className="text-muted-foreground" strokeWidth={1.4} opacity={0.4}>
          <line x1={-W / 2} y1={0} x2={W / 2} y2={0} />
          <line x1={0} y1={-H / 2} x2={0} y2={H / 2} />
        </g>

        {showZone && (
          <g>
            <circle
              r={maxReach}
              fill="oklch(0.55 0.15 200 / 0.03)"
              stroke="oklch(0.55 0.15 200 / 0.2)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            {minReach > 1 && (
              <circle
                r={minReach}
                className="fill-background"
                stroke="oklch(0.55 0.15 200 / 0.1)"
                strokeWidth={1.2}
                strokeDasharray="2 2"
              />
            )}
          </g>
        )}

        {/* target */}
        {target && (
          <g>
            <g stroke="currentColor" className={showZone && !lengths.every((_, i) => true) ? "text-red-500" : "text-primary"} strokeWidth={2.5} fill="none">
              <circle cx={target.x} cy={target.y} r={10} className="fill-current opacity-10" />
              <line x1={target.x - 18} y1={target.y} x2={target.x + 18} y2={target.y} />
              <line x1={target.x} y1={target.y - 18} x2={target.x} y2={target.y + 18} />
            </g>
            {/* Reachability Warning line if unreachable */}
            {(() => {
              const d = Math.hypot(target.x, target.y);
              const maxReach = lengths.reduce((a, b) => a + b, 0);
              const minReach = Math.abs((lengths[0] ?? 0) - (lengths[1] ?? 0));
              if (d > maxReach || d < minReach) {
                return (
                  <g>
                    <line 
                      x1={end.x} y1={end.y} x2={target.x} y2={target.y} 
                      stroke="red" strokeWidth={1} strokeDasharray="4 2" 
                    />
                    <text 
                      x={(end.x + target.x)/2} y={(end.y + target.y)/2} 
                      className="fill-red-500 text-[10px] font-bold" 
                      transform="scale(1,-1)"
                    >
                      ERR: {Math.round(Math.hypot(end.x - target.x, end.y - target.y))}mm
                    </text>
                  </g>
                );
              }
              return null;
            })()}
          </g>
        )}

        {/* links */}
        {points.slice(0, -1).map((p, i) => {
          const q = points[i + 1] as Vec2;
          
          const isLink1Step = activeStep !== undefined && activeStep >= 1 && activeStep <= 4;
          const isLink2Step = activeStep !== undefined && activeStep >= 2 && activeStep <= 4;
          const isHighlighted = (i === 0 && isLink1Step) || (i === 1 && isLink2Step);
          
          const isColliding = collisions?.pairs.some(pair => pair.includes(i));

          return (
            <g key={i}>
              <line
                x1={r1(p.x)}
                y1={r1(p.y)}
                x2={r1(q.x)}
                y2={r1(q.y)}
                stroke={isColliding ? "#ef4444" : (i % 2 === 0 ? "#94A3B8" : "#FACC15")}
                strokeWidth={isHighlighted ? 18 : 12}
                strokeLinecap="round"
                opacity={isHighlighted ? 1 : 0.9}
              />
              {/* Brushed highlight */}
              <line
                x1={r1(p.x)}
                y1={r1(p.y)}
                x2={r1(q.x)}
                y2={r1(q.y)}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={isHighlighted ? 4 : 3}
                strokeLinecap="round"
                transform="translate(0, -3)"
              />
            </g>
          );
        })}

        {/* collision markers */}
        {collisions?.colliding && collisions.points.map((p, i) => (
          <g key={`col-${i}`}>
            <circle
              cx={r1(p.x)}
              cy={r1(p.y)}
              r={8}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              className="animate-pulse"
            />
            <line x1={p.x - 6} y1={p.y - 6} x2={p.x + 6} y2={p.y + 6} stroke="#ef4444" strokeWidth={2} />
            <line x1={p.x + 6} y1={p.y - 6} x2={p.x - 6} y2={p.y + 6} stroke="#ef4444" strokeWidth={2} />
          </g>
        ))}

        {/* joints & angle arrows */}
        {points.map((p, i) => {
          const isJoint2 = i === 1; 
          const isJoint1 = i === 0; 
          const isJoint2Highlighted = activeStep !== undefined && activeStep >= 2 && isJoint2;
          const isJoint1Highlighted = activeStep !== undefined && activeStep >= 4 && isJoint1;
          const isHighlighted = isJoint1Highlighted || isJoint2Highlighted;

          // Calculate angle for arrow (relative to previous link or world for J1)
          let angle = 0;
          if (i === 0) {
            angle = 0; // World reference
          } else {
            // Simple visual approximation of the joint's current rotation for the arrow
            const q = points[i];
            const prev = points[i-1];
            if (q && prev) {
               angle = Math.atan2(q.y - prev.y, q.x - prev.x);
            }
          }

          const arrowLen = 25;
          const arrowX = p.x + Math.cos(angle) * arrowLen;
          const arrowY = p.y + Math.sin(angle) * arrowLen;

            return (
              <g key={i}>
                {/* Joint Limit Arc/Indicator */}
                {limits && limits[i] && (
                  <g opacity={0.3}>
                    <circle cx={p.x} cy={p.y} r={20} fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth={1} strokeDasharray="2 2" />
                  </g>
                )}
                
                {/* Transparent Joint Housing - matching reference style */}
                <circle
                  cx={r1(p.x)}
                  cy={r1(p.y)}
                  r={i === 0 ? 15 : 12}
                  fill="rgba(40,45,50,0.15)"
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth={1.2}
                />
              
              {/* Angle Indicator Arrow */}
              <line 
                x1={p.x} y1={p.y} x2={arrowX} y2={arrowY}
                className={isHighlighted ? "stroke-primary" : "stroke-muted-foreground/30"}
                strokeWidth={2}
                strokeDasharray="2 2"
              />
              <path 
                d={`M ${arrowX} ${arrowY} l -8 -4 l 0 8 z`}
                transform={`rotate(${(angle * 180) / Math.PI}, ${arrowX}, ${arrowY})`}
                className={isHighlighted ? "fill-primary" : "fill-muted-foreground/30"}
              />

              {/* Core joint circle */}
              <circle
                cx={r1(p.x)}
                cy={r1(p.y)}
                r={isHighlighted ? 8 : (i === 0 ? 7 : 6)}
                className={isHighlighted ? "fill-primary stroke-primary" : (i === 0 ? "fill-primary stroke-primary" : "fill-card stroke-primary")}
                strokeWidth={2}
              />
              {/* Limit Violation Warning */}
              {limits && limits[i] && angles && angles[i] !== undefined && (angles[i] < (limits[i]?.min ?? -360) || angles[i] > (limits[i]?.max ?? 360)) && (
                <circle cx={p.x} cy={p.y} r={isHighlighted ? 12 : 10} className="fill-none stroke-red-500" strokeWidth={2} />
              )}
              {i === 0 && (
                <text x={p.x + 18} y={p.y - 18} className="fill-primary text-[10px] font-black uppercase tracking-widest" transform="scale(1,-1)">FIXED J1</text>
              )}
            </g>
          );
        })}

        <circle cx={r1(end.x)} cy={r1(end.y)} r={8} className="fill-yellow-400 stroke-slate-900" strokeWidth={2} />
      </g>
    </svg>
  );
}
