import { useEffect, useRef, useState, useMemo } from "react";
import { axisOf, originOf, type Mat4, type Vec3, type Vec2 } from "@/lib/kinematics";
import { GhostButton } from "./LabControls";

type Props = { 
  frames?: Mat4[] | undefined;
  activeStep?: number | undefined;
  mode?: string;
  planarPoints?: Vec2[] | undefined;
  linkCount?: number;
  showAxes?: boolean;
};

// Colors based on a premium industrial design: Slate and Bright Orange
const LINK_COLORS = [
  "#FFFFFF", // White
  "#000000", // Black
  "#CCCCCC", // Light Grey
  "#333333", // Dark Grey
  "#999999", // Grey
  "#666666", // Medium Grey
];

export function DHView3D({ frames = [], activeStep, mode = "DH", planarPoints = [], linkCount = 2, showAxes = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cam, setCam] = useState({ yaw: -0.9, pitch: 0.5, zoom: 1.2 });
  const [baseScale, setBaseScale] = useState(1);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const effectiveFrames = useMemo(() => {
    if (mode === "DH" || !planarPoints || planarPoints.length === 0) return frames || [];
    
    return planarPoints.map((p, i) => {
      const pPrev = planarPoints[i - 1];
      const angle = i > 0 && pPrev ? Math.atan2(p.y - pPrev.y, p.x - pPrev.x) : 0;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      
      return [
        c, 0, s, p.x,
        0, 1, 0, 0,
        -s, 0, c, p.y,
        0, 0, 0, 1
      ] as Mat4;
    });
  }, [mode, frames, planarPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const cy = Math.cos(cam.yaw);
    const sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch);
    const sp = Math.sin(cam.pitch);
    
    const currentBaseScale = Math.min(w, h) / 480;
    const drawScale = currentBaseScale * cam.zoom;
    
    if (baseScale !== currentBaseScale) setBaseScale(currentBaseScale);

    const j1Pos = effectiveFrames.length > 0 ? originOf(effectiveFrames[0] as Mat4) : { x: 0, y: 0, z: 0 };
    const ctr = { x: j1Pos.x, y: j1Pos.y, z: j1Pos.z };

    const project = (p0: Vec3) => {
      const p = { x: p0.x - ctr.x, y: p0.y - ctr.y, z: p0.z - ctr.z };
      const x1 = p.x * cy - p.y * sy;
      const y1 = p.x * sy + p.y * cy;
      const z1 = p.z;
      const y2 = y1 * cp - z1 * sp;
      const z2 = y1 * sp + z1 * cp;
      const depth = 1200;
      const persp = depth / (depth + y2 * 0.8);
      return {
        x: w / 2 + x1 * drawScale * persp,
        y: h / 2 + 120 - z2 * drawScale * persp,
        z2: z2,
        y2: y2
      };
    };

    const drawAxes = (pos: Vec3, frame: Mat4, size = 30) => {
      const p = project(pos);
      const axisSize = size * currentBaseScale;
      const xAxis = axisOf(frame, 0);
      const yAxis = axisOf(frame, 1);
      const zAxis = axisOf(frame, 2);

      const px = project({ x: pos.x + xAxis.x * axisSize, y: pos.y + xAxis.y * axisSize, z: pos.z + xAxis.z * axisSize });
      const py = project({ x: pos.x + yAxis.x * axisSize, y: pos.y + yAxis.y * axisSize, z: pos.z + yAxis.z * axisSize });
      const pz = project({ x: pos.x + zAxis.x * axisSize, y: pos.y + zAxis.y * axisSize, z: pos.z + zAxis.z * axisSize });

      const drawLine = (to: {x: number, y: number}, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(p.x, p.y); 
        ctx.lineTo(to.x, to.y); 
        ctx.stroke();
      };

      drawLine(px, "#EF4444"); // X
      drawLine(py, "#22C55E"); // Y
      drawLine(pz, "#3B82F6"); // Z
    };

    // Grid Floor: Dark Factory Floor Grid
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    for(let i = -10; i <= 10; i++) {
        const p1 = project({x: i*60, y: -600, z: 0});
        const p2 = project({x: i*60, y: 600, z: 0});
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        const p3 = project({x: -600, y: i*60, z: 0});
        const p4 = project({x: 600, y: i*60, z: 0});
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
    }

    // Links and Joints
    for (let i = 0; i < effectiveFrames.length - 1; i++) {
      const a = originOf(effectiveFrames[i] as Mat4);
      const b = originOf(effectiveFrames[i + 1] as Mat4);
      const pa = project(a);
      const pb = project(b);

      const isHighlighted = activeStep !== undefined && i < activeStep;
      const r = (14 - i * 1.5) * currentBaseScale;

      // Link body: Sophisticated industrial rods
      const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const nx = Math.cos(ang + Math.PI / 2);
      const ny = Math.sin(ang + Math.PI / 2);
      const lw = r * 2.0;
      
      const linkColor = LINK_COLORS[i % LINK_COLORS.length] || "#7F8C8D";

      ctx.save();
      // Material shading
      const grad = ctx.createLinearGradient(
        pa.x + nx * lw, pa.y + ny * lw,
        pa.x - nx * lw, pa.y - ny * lw
      );
      grad.addColorStop(0, "white");
      grad.addColorStop(0.3, linkColor);
      grad.addColorStop(0.7, linkColor);
      grad.addColorStop(1, "black");
      
      ctx.strokeStyle = grad;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      
      // Glossy highlight
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = lw * 0.2;
      ctx.beginPath();
      ctx.moveTo(pa.x + nx * lw * 0.3, pa.y + ny * lw * 0.3);
      ctx.lineTo(pb.x + nx * lw * 0.3, pb.y + ny * lw * 0.3);
      ctx.stroke();
      ctx.restore();

      // Premium Mechanical Joint
      const hr = r * 2.2;
      const hw = r * 1.6;
      const frameA = effectiveFrames[i] as Mat4;
      const zAxis = axisOf(frameA, 2);
      const projZ = project({x: a.x + zAxis.x, y: a.y + zAxis.y, z: a.z + zAxis.z});
      const jointAngle = Math.atan2(projZ.y - pa.y, projZ.x - pa.x);
      
      ctx.save();
      ctx.translate(pa.x, pa.y);
      ctx.rotate(jointAngle);
      
      // Joint Housing: Brushed Aluminum "Hub" with Warning Stripes
      const hGrad = ctx.createLinearGradient(0, -hr, 0, hr);
      hGrad.addColorStop(0, "white");
      hGrad.addColorStop(0.5, "#999999");
      hGrad.addColorStop(1, "black");
      
      ctx.fillStyle = hGrad;
      
      ctx.beginPath();
      ctx.arc(0, 0, hr, -Math.PI/2, Math.PI/2);
      ctx.lineTo(-hw/2, hr);
      ctx.lineTo(-hw/2, -hr);
      ctx.closePath();
      ctx.fill();
      
      // Safety Warning Stripes (Yellow/Black)
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "white";
      for (let j = -hr; j < hr; j += 8) {
        if (Math.floor(j / 8) % 2 === 0) {
          ctx.fillRect(-hw/2, j, hw, 4);
        }
      }
      ctx.restore();

      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Accented central actuator hub
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.ellipse(0, 0, hw * 0.4, hr * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Aluminum bolt detail
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(0, 0, hw * 0.15, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();

      if (isHighlighted) {
        ctx.save();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, hr * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (showAxes && effectiveFrames[i]) drawAxes(a, effectiveFrames[i] as Mat4, 40);
    }

    // End Effector
    const eeFrame = effectiveFrames[effectiveFrames.length - 1];
    if (eeFrame) {
      const eePos = originOf(eeFrame as Mat4);
      const pee = project(eePos);
      const eer = 15 * currentBaseScale;
      
      ctx.save();
      ctx.translate(pee.x, pee.y);
      ctx.fillStyle = "#FACC15"; // Safety Yellow End Effector
      ctx.beginPath();
      ctx.arc(0, 0, eer, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      if (showAxes) drawAxes(eePos, eeFrame as Mat4, 50);
    }

  }, [effectiveFrames, cam, activeStep, showAxes, baseScale]);

  return (
    <div className="relative h-full w-full bg-background">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          setCam((c) => ({
            ...c,
            yaw: c.yaw + dx * 0.01,
            pitch: Math.max(-1.4, Math.min(1.4, c.pitch + dy * 0.01)),
          }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        onWheel={(e) => {
          setCam((c) => ({ ...c, zoom: Math.max(0.3, Math.min(3, c.zoom - e.deltaY * 0.001)) }));
          e.preventDefault();
        }}
      />
      <div className="absolute bottom-4 right-4 flex gap-2">
        <GhostButton onClick={() => setCam({ yaw: -0.9, pitch: 0.5, zoom: 1.2 })}>
          Reset View
        </GhostButton>
      </div>
      <div className="absolute top-4 right-4 rounded-xl border border-border bg-white/90 p-4 text-[10px] font-bold shadow-2xl backdrop-blur-sm">
        <div className="text-slate-900 uppercase tracking-[0.2em] mb-3 font-black border-b border-yellow-400 pb-2">Factory Precision V3</div>
        <div className="text-slate-500 space-y-1.5">
          {effectiveFrames.length > 0 && (
            <>
              <div className="flex justify-between gap-4"><span>X</span> <span className="font-mono text-slate-900">{originOf(effectiveFrames[effectiveFrames.length - 1] as Mat4).x.toFixed(1)}</span></div>
              <div className="flex justify-between gap-4"><span>Y</span> <span className="font-mono text-slate-900">{originOf(effectiveFrames[effectiveFrames.length - 1] as Mat4).y.toFixed(1)}</span></div>
              <div className="flex justify-between gap-4"><span>Z</span> <span className="font-mono text-slate-900">{originOf(effectiveFrames[effectiveFrames.length - 1] as Mat4).z.toFixed(1)}</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
