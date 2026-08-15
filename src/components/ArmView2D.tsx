import { useRef } from "react";
import type { Vec2 } from "@/lib/kinematics";
import { fmtAngle } from "@/lib/lab";


const LINK_CLASSES = ["stroke-link-1", "stroke-link-2", "stroke-link-3"];

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
  const interactive = Boolean(onTargetChange || onPathPoint);

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
        {/* workspace sweep */}
        {workspace && workspace.length > 0 && (
          <g opacity={0.15}>
            {workspace.map((p, i) => (
              <circle key={i} cx={r1(p.x)} cy={r1(p.y)} r={3} className="fill-brand" />
            ))}
          </g>
        )}
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

        {/* end-effector trace */}
        {trace && trace.length > 1 && (
          <polyline
            points={trace.map((p) => `${r1(p.x)},${r1(p.y)}`).join(" ")}
            className="stroke-primary/40"
            strokeWidth={2}
            fill="none"
          />
        )}

        {/* taught path */}
        {path && path.length > 0 && (
          <g>
            <polyline
              points={path.map((p) => `${r1(p.x)},${r1(p.y)}`).join(" ")}
              className="stroke-brand"
              strokeWidth={2}
              strokeDasharray="7 6"
              fill="none"
            />
            {path.map((p, i) => (
              <g key={i}>
                <circle cx={r1(p.x)} cy={r1(p.y)} r={6} className="fill-brand" />
                <g transform={`translate(${r1(p.x) + 10}, ${r1(p.y)}) scale(1,-1)`}>
                  <text className="fill-foreground" fontSize={13} fontWeight={700}>
                    P{i + 1}
                  </text>
                </g>
              </g>
            ))}
          </g>
        )}

        {/* ghost (other IK branch) */}
        {ghostPoints && ghostPoints.length > 1 && (
          <g opacity={0.35}>
            {ghostPoints.slice(0, -1).map((p, i) => {
              const q = ghostPoints[i + 1] as Vec2;
              return (
                <line
                  key={`g${i}`}
                  x1={r1(p.x)}
                  y1={r1(p.y)}
                  x2={r1(q.x)}
                  y2={r1(q.y)}
                  className="stroke-muted-foreground"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                />
              );
            })}
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
              x1={r1(p.x)}
              y1={r1(p.y)}
              x2={r1(q.x)}
              y2={r1(q.y)}
              className={LINK_CLASSES[i % 3]}
              strokeWidth={11}
              strokeLinecap="round"
            />
          );
        })}

        {/* Measurement Overlays (2D) */}
        {points.slice(0, -1).map((p, i) => {
          const q = points[i + 1] as Vec2;
          const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
          const len = lengths[i] ?? 0;
          return (
            <g key={`m${i}`} transform={`translate(${r1(mid.x)}, ${r1(mid.y)}) scale(1,-1)`}>
              <rect x={-20} y={-8} width={40} height={16} rx={4} className="fill-card shadow-sm" opacity={0.8} />
              <text textAnchor="middle" dy={4} fontSize={10} fontWeight={700} className="fill-foreground">
                {Math.round(len)}
              </text>
            </g>
          );
        })}


        {/* joints */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={r1(p.x)}
            cy={r1(p.y)}
            r={i === 0 ? 8 : 7}
            className={i === 0 ? "fill-foreground stroke-foreground" : "fill-card stroke-foreground"}
            strokeWidth={2.5}
          />
        ))}

        <circle cx={r1(end.x)} cy={r1(end.y)} r={6} className="fill-primary" />
        <g transform={`translate(${r1(end.x) + 12}, ${r1(end.y) + 12}) scale(1,-1)`}>
          <rect x={-5} y={-24} width={75} height={32} rx={4} className="fill-primary/90" />
          <text x={4} y={-10} fontSize={9} fontWeight={800} className="fill-primary-foreground">
            EE: {Math.round(end.x)}, {Math.round(end.y)}
          </text>
        </g>


        {/* velocity vector */}
        {velocity && (
          <g>
            <line
              x1={r1(end.x)}
              y1={r1(end.y)}
              x2={r1(end.x + velocity.x * 20)}
              y2={r1(end.y + velocity.y * 20)}
              className="stroke-link-2"
              strokeWidth={3}
              markerEnd="url(#arrowhead)"
            />
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="0"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" className="fill-link-2" />
              </marker>
            </defs>
          </g>
        )}
      </g>
    </svg>
  );
}
