import { useEffect, useRef, useState } from "react";
import { axisOf, originOf, type Mat4, type Vec3, deg2rad } from "@/lib/kinematics";
import { GhostButton } from "./LabControls";

type Props = { 
  frames: Mat4[];
  activeStep?: number | undefined;
};

// Colors based on the uploaded reference image
const LINK_COLORS = [
  "#2C3E50", // Dark grey/black for base/first link
  "#E74C3C", // Red for second link
  "#9B59B6", // Purple for third link
  "#3498DB", // Blue for fourth link
  "#E67E22", // Orange for fifth link
  "#2ECC71", // Green (if needed)
];

export function DHView3D({ frames, activeStep }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cam, setCam] = useState({ yaw: -0.9, pitch: 0.5, zoom: 1.2 });
  const drag = useRef<{ x: number; y: number } | null>(null);

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
    const scale = (Math.min(w, h) / 480) * cam.zoom;

    const j1Pos = originOf(frames[0] as Mat4);
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
        x: w / 2 + x1 * scale * persp,
        y: h / 2 + 120 - z2 * scale * persp,
        z2: z2, // for sorting if needed
        y2: y2
      };
    };

    const drawAxes = (pos: Vec3, frame: Mat4, size = 30, isBase = false) => {
      const p = project(pos);
      const xAxis = axisOf(frame, 0);
      const yAxis = axisOf(frame, 1);
      const zAxis = axisOf(frame, 2);

      const px = project({ x: pos.x + xAxis.x * size, y: pos.y + xAxis.y * size, z: pos.z + xAxis.z * size });
      const py = project({ x: pos.x + yAxis.x * size, y: pos.y + yAxis.y * size, z: pos.z + yAxis.z * size });
      const pz = project({ x: pos.x + zAxis.x * size, y: pos.y + zAxis.y * size, z: pos.z + zAxis.z * size });

      const drawArrow = (from: {x: number, y: number}, to: {x: number, y: number}, color: string) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(from.x, from.y); 
        ctx.lineTo(to.x, to.y); 
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - 8 * Math.cos(angle - Math.PI/6), to.y - 8 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(to.x - 8 * Math.cos(angle + Math.PI/6), to.y - 8 * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fill();
      };

      if (isBase) {
        drawArrow(p, px, "#FF0000"); // X - Red
        drawArrow(p, pz, "#0000FF"); // Z - Blue
      } else {
        drawArrow(p, px, "#E51400"); // X - Red arrow
        drawArrow(p, py, "#1DB954"); // Y - Green arrow
        drawArrow(p, pz, "#1436D6"); // Z - Blue arrow
      }

    };

    // Realistic Floor/Base Grid - matching the reference
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for(let i = -10; i <= 10; i++) {
        const p1 = project({x: i*40, y: -400, z: 0});
        const p2 = project({x: i*40, y: 400, z: 0});
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        const p3 = project({x: -400, y: i*40, z: 0});
        const p4 = project({x: 400, y: i*40, z: 0});
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
    }

    // Draw origin axes at base with arrows - matching reference
    drawAxes({x: 0, y: 0, z: 0}, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], 60, true);

    // Links and Joints
    for (let i = 0; i < frames.length - 1; i++) {
      const a = originOf(frames[i] as Mat4);
      const b = originOf(frames[i + 1] as Mat4);
      const pa = project(a);
      const pb = project(b);

      const isHighlighted = activeStep !== undefined && i < activeStep;
      const r = 13 - i * 1.2;

      // --- Link body: glossy orange rod with cylindrical shading ---
      const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const nx = Math.cos(ang + Math.PI / 2);
      const ny = Math.sin(ang + Math.PI / 2);
      const lw = r * 2;
      const grad = ctx.createLinearGradient(
        pa.x + nx * lw * 0.5, pa.y + ny * lw * 0.5,
        pa.x - nx * lw * 0.5, pa.y - ny * lw * 0.5,
      );
      grad.addColorStop(0, "#8a3505");
      grad.addColorStop(0.28, "#e4620d");
      grad.addColorStop(0.48, "#ff9a3c");
      grad.addColorStop(0.62, "#ffd7ac");
      grad.addColorStop(0.85, "#e0650f");
      grad.addColorStop(1, "#a03e06");

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.28)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
      ctx.strokeStyle = grad;
      ctx.lineWidth = lw;
      ctx.lineCap = "butt";
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      ctx.restore();

      // specular streak along the rod
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#fff6ea";
      ctx.lineWidth = Math.max(1.5, r * 0.28);
      ctx.beginPath();
      ctx.moveTo(pa.x + nx * r * 0.45, pa.y + ny * r * 0.45);
      ctx.lineTo(pb.x + nx * r * 0.45, pb.y + ny * r * 0.45);
      ctx.stroke();
      ctx.restore();

      // --- Joint: frosted gray cylindrical housing over the rod ---
      const hw = r * 2.5;   // housing half-length along the link axis
      const hr = r * 1.55;  // housing radius
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const c1 = { x: pa.x - dx * hw * 0.35, y: pa.y - dy * hw * 0.35 };
      const c2 = { x: pa.x + dx * hw * 0.75, y: pa.y + dy * hw * 0.75 };

      const hGrad = ctx.createLinearGradient(
        pa.x + nx * hr, pa.y + ny * hr,
        pa.x - nx * hr, pa.y - ny * hr,
      );
      hGrad.addColorStop(0, "rgba(120,126,132,0.92)");
      hGrad.addColorStop(0.3, "rgba(196,201,206,0.92)");
      hGrad.addColorStop(0.5, "rgba(240,242,245,0.92)");
      hGrad.addColorStop(0.75, "rgba(186,191,197,0.92)");
      hGrad.addColorStop(1, "rgba(128,134,140,0.92)");

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.22)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.strokeStyle = hGrad;
      ctx.lineWidth = hr * 2;
      ctx.lineCap = "butt";
      ctx.beginPath();
      ctx.moveTo(c1.x, c1.y);
      ctx.lineTo(c2.x, c2.y);
      ctx.stroke();
      ctx.restore();

      // housing end caps (elliptical rims)
      const capRim = (cx: number, cyy: number) => {
        ctx.save();
        ctx.translate(cx, cyy);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, 0, hr * 0.32, hr, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(226,230,234,0.75)";
        ctx.fill();
        ctx.strokeStyle = "rgba(90,96,102,0.5)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      };
      capRim(c1.x, c1.y);
      capRim(c2.x, c2.y);

      // frosted highlight band
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = hr * 0.35;
      ctx.beginPath();
      ctx.moveTo(c1.x + nx * hr * 0.5, c1.y + ny * hr * 0.5);
      ctx.lineTo(c2.x + nx * hr * 0.5, c2.y + ny * hr * 0.5);
      ctx.stroke();
      ctx.restore();

      if (isHighlighted) {
        ctx.save();
        ctx.strokeStyle = "rgba(20,20,20,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, hr + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Frame axes at each joint
      drawAxes(a, frames[i] as Mat4, 34);
    }

    // End Effector (Blue Sphere in reference)
    const eePos = originOf(frames[frames.length - 1] as Mat4);
    const pee = project(eePos);
    ctx.beginPath();
    ctx.arc(pee.x, pee.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#3498DB";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.stroke();
    drawAxes(eePos, frames[frames.length - 1] as Mat4, 35);


  }, [frames, cam, activeStep]);

  return (
    <div className="relative h-full w-full">
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
      <div className="absolute top-4 right-4 rounded-xl border border-border bg-card/80 p-3 text-[10px] font-bold shadow-xl backdrop-blur-md">
        <div className="text-primary uppercase tracking-[0.2em] mb-2 font-black">Industrial Kinematics</div>
        <div className="text-foreground/70 space-y-1">
          <div>X: {originOf(frames[frames.length - 1] as Mat4).x.toFixed(1)}</div>
          <div>Y: {originOf(frames[frames.length - 1] as Mat4).y.toFixed(1)}</div>
          <div>Z: {originOf(frames[frames.length - 1] as Mat4).z.toFixed(1)}</div>
        </div>
      </div>
    </div>
  );
}
