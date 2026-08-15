import { useEffect, useRef, useState } from "react";
import { axisOf, originOf, type Mat4, type Vec3 } from "@/lib/kinematics";
import { GhostButton } from "./LabControls";


type Props = { frames: Mat4[] };

const LINK_COLORS = ["#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

export function DHView3D({ frames }: Props) {
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

    const pts = frames.map(originOf);
    const ctr = {
      x: pts.reduce((a, b) => a + b.x, 0) / pts.length,
      y: pts.reduce((a, b) => a + b.y, 0) / pts.length,
      z: 0,
    };

    const project = (p0: Vec3) => {
      const p = { x: p0.x - ctr.x, y: p0.y - ctr.y, z: p0.z };
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
        d: y2,
      };
    };

    const drawCylinder = (a: Vec3, b: Vec3, radius: number, color: string) => {
      const pa = project(a);
      const pb = project(b);
      
      // Shadow Link
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = radius * 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y + 4);
      ctx.lineTo(pb.x, pb.y + 4);
      ctx.stroke();

      // Main Link
      ctx.strokeStyle = color;
      ctx.lineWidth = radius * 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();

      // Highlight for "Realistic" look
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = radius;
      ctx.beginPath();
      ctx.moveTo(pa.x - radius/4, pa.y - radius/4);
      ctx.lineTo(pb.x - radius/4, pb.y - radius/4);
      ctx.stroke();
    };

    // Realistic Floor
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.ellipse(w/2, h/2 + 180, 250 * cam.zoom, 100 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    // Links (Realistic Robot Body)
    for (let i = 0; i < frames.length - 1; i++) {
      const a = originOf(frames[i] as Mat4);
      const b = originOf(frames[i + 1] as Mat4);
      const color = LINK_COLORS[i % LINK_COLORS.length] || "#475569";
      drawCylinder(a, b, 14 - i * 1.5, color);
    }

    // Joint Housings (Realistic motors)
    frames.forEach((f, i) => {
      const p = project(originOf(f));
      const r = 18 - i * 1.8;
      
      // Housing gradient
      const grad = ctx.createRadialGradient(p.x - r/3, p.y - r/3, 1, p.x, p.y, r);
      grad.addColorStop(0, "#94a3b8");
      grad.addColorStop(1, "#1e293b");

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      
      // Cap
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = i === frames.length - 1 ? "#0ea5e9" : "#334155";
      ctx.fill();
    });

    // Measurement Overlays (3D)
    frames.forEach((f, i) => {
      const p = project(originOf(f));
      
      // Joint Label
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.beginPath();
      ctx.roundRect(p.x - 12, p.y - 30, 24, 14, 3);
      ctx.fill();
      
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText(`J${i+1}`, p.x, p.y - 20);

      // Link length indicator
      if (i < frames.length - 1) {
        const nextP = project(originOf(frames[i+1] as Mat4));
        const midX = (p.x + nextP.x) / 2;
        const midY = (p.y + nextP.y) / 2;
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.beginPath();
        ctx.arc(midX, midY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#475569";
        ctx.font = "700 8px JetBrains Mono";
        const row = frames[i+1] ? (frames[i+1] as any)._dhRow : null; // We don't have easy access to lengths here without props
        // Instead, just show Euclidean distance for measurement
        const d = Math.sqrt(
          Math.pow(originOf(frames[i+1] as Mat4).x - originOf(frames[i] as Mat4).x, 2) +
          Math.pow(originOf(frames[i+1] as Mat4).y - originOf(frames[i] as Mat4).y, 2) +
          Math.pow(originOf(frames[i+1] as Mat4).z - originOf(frames[i] as Mat4).z, 2)
        );
        ctx.fillText(Math.round(d).toString(), midX, midY + 3);
      }
    });

  }, [frames, cam]);


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
          // Internal scroll for zoom
          setCam((c) => ({ ...c, zoom: Math.max(0.3, Math.min(3, c.zoom - e.deltaY * 0.001)) }));
          e.preventDefault();
        }}
      />
      <div className="absolute bottom-4 right-4 flex gap-2">
        <GhostButton onClick={() => setCam({ yaw: -0.9, pitch: 0.5, zoom: 1.2 })}>
          Reset View
        </GhostButton>
      </div>
      <div className="absolute top-4 right-4 rounded-lg bg-card/80 p-2 text-[10px] font-bold shadow-sm backdrop-blur-sm">
        <div className="text-muted-foreground uppercase tracking-widest mb-1">End Effector</div>
        <div className="text-foreground">
          X: {originOf(frames[frames.length - 1] as Mat4).x.toFixed(1)}<br/>
          Y: {originOf(frames[frames.length - 1] as Mat4).y.toFixed(1)}<br/>
          Z: {originOf(frames[frames.length - 1] as Mat4).z.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

