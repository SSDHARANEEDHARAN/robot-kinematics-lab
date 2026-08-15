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

    const drawAxes = (pos: Vec3, frame: Mat4, size = 30) => {
      const p = project(pos);
      const xAxis = axisOf(frame, 0);
      const yAxis = axisOf(frame, 1);
      const zAxis = axisOf(frame, 2);

      const px = project({ x: pos.x + xAxis.x * size, y: pos.y + xAxis.y * size, z: pos.z + xAxis.z * size });
      const py = project({ x: pos.x + yAxis.x * size, y: pos.y + yAxis.y * size, z: pos.z + yAxis.z * size });
      const pz = project({ x: pos.x + zAxis.x * size, y: pos.y + zAxis.y * size, z: pos.z + zAxis.z * size });

      // X - Red
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(px.x, px.y); ctx.stroke();
      
      // Y - Green
      ctx.strokeStyle = "#00FF00";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(py.x, py.y); ctx.stroke();
      
      // Z - Blue
      ctx.strokeStyle = "#0000FF";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pz.x, pz.y); ctx.stroke();
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

    // Draw origin axes at base
    drawAxes({x: 0, y: 0, z: 0}, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], 50);

    // Links and Joints
    for (let i = 0; i < frames.length - 1; i++) {
      const a = originOf(frames[i] as Mat4);
      const b = originOf(frames[i + 1] as Mat4);
      const pa = project(a);
      const pb = project(b);
      
      // Fixed link color from reference: dark navy/black
      const color = "#1A252F"; 
      const isHighlighted = activeStep !== undefined && i < activeStep;
      
      // Joint Housing (Transparent Cylinder-like) - matching user-uploads://file-6
      const r = (12 - i * 1);
      
      // Draw joint housing (cylinder effect)
      ctx.fillStyle = "rgba(189, 195, 199, 0.4)"; // Semitransparent grey
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;

      // Bottom circle
      ctx.beginPath();
      ctx.arc(pa.x, pa.y + 4, r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top circle (offset slightly to give 3D cylinder feel)
      ctx.beginPath();
      ctx.arc(pa.x, pa.y - 4, r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Connecting lines for cylinder sides
      ctx.beginPath();
      ctx.moveTo(pa.x - (r + 2), pa.y - 4);
      ctx.lineTo(pa.x - (r + 2), pa.y + 4);
      ctx.moveTo(pa.x + (r + 2), pa.y - 4);
      ctx.lineTo(pa.x + (r + 2), pa.y + 4);
      ctx.stroke();

      // Link Body
      ctx.strokeStyle = color;
      ctx.lineWidth = r * 1.8; // Slightly thicker
      ctx.lineCap = "butt"; // Flat ends to fit inside joint housing
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      
      // Link Highlight
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = r * 0.5;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();

      // Frame axes at each joint
      drawAxes(a, frames[i] as Mat4, 25);
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
