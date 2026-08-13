import { useRef } from "react";
import type { Vec2 } from "@/lib/kinematics";

const LINK_CLASSES = ["stroke-link-1", "stroke-link-2", "stroke-link-3"];

type Props = {
  points: Vec2[];
  lengths: number[];
  showZone: boolean;
  target?: Vec2 | null;
  onTargetChange?: (p: Vec2) => void;
};

const W = 760;
const H = 560;

export function ArmView2D({ points, lengths, showZone, target, onTargetChange }: Props) {
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
    if (!onTargetChange) return;
    const p = toWorld(e.clientX, e.clientY);
    if (p) onTargetChange({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 });
  };

  const grid: number[] = [];
  for (let g = -W / 2; g <= W / 2; g += 40) grid.push(g);
  const gridY: number[] = [];
  for (let g = -H / 2; g <= H / 2; g += 40) gridY.push(g);

  const end = points[points.length - 1] ?? { x: 0, y: 0 };

  return (
    <svg
      ref={svgRef}
      viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`}
      className="h-full w-full touch-none select-none"
      style={{ cursor: onTargetChange ? "crosshair" : "default" }}
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
        {/* grid */}
        <g className="stroke-grid" strokeWidth={1} opacity={0.55}>
          {grid.map((g) => (
            <line key={`v${g}`} x1={g} y1={-H / 2} x2={g} y2={H / 2} />
          ))}
          {gridY.map((g) => (
            <line key={`h${g}`} x1={-W / 2} y1={g} x2={W / 2} y2={g} />
          ))}
        </g>
        {/* axes */}
        <g className="stroke-muted-foreground" strokeWidth={1.4} opacity={0.7}>
          <line x1={-W / 2} y1={0} x2={W / 2} y2={0} />
          <line x1={0} y1={-H / 2} x2={0} y2={H / 2} />
        </g>

        {showZone && (
          <g>
            <circle
              r={maxReach}
              className="fill-zone/8 stroke-zone/45"
              strokeWidth={1.5}
              strokeDasharray="0"
            />
            {minReach > 1 && (
              <circle
                r={minReach}
                className="fill-background stroke-zone/35"
                strokeWidth={1.2}
                strokeDasharray="5 5"
              />
            )}
          </g>
        )}

        {target && (
          <g className="stroke-primary" strokeWidth={2} fill="none">
            <circle cx={target.x} cy={target.y} r={9} />
            <line x1={target.x - 15} y1={target.y} x2={target.x + 15} y2={target.y} />
            <line x1={target.x} y1={target.y - 15} x2={target.x} y2={target.y + 15} />
          </g>
        )}

        {/* links */}
        {points.slice(0, -1).map((p, i) => {
          const q = points[i + 1] as Vec2;
          return (
            <line
              key={i}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              className={LINK_CLASSES[i % 3]}
              strokeWidth={11}
              strokeLinecap="round"
            />
          );
        })}

        {/* joints */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === 0 ? 8 : 7}
            className={i === 0 ? "fill-foreground stroke-foreground" : "fill-card stroke-foreground"}
            strokeWidth={2.5}
          />
        ))}

        <circle cx={end.x} cy={end.y} r={6} className="fill-primary" />
      </g>
    </svg>
  );
}
