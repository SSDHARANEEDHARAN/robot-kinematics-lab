import { useEffect, useRef, useState } from "react";
import { axisOf, originOf, type Mat4, type Vec3, deg2rad } from "@/lib/kinematics";
import { GhostButton } from "./LabControls";

type Props = { 
  frames: Mat4[];
  activeStep?: number | undefined;
};

const LINK_COLORS = ["oklch(0.3 0.05 250)", "oklch(0.4 0.05 250)", "oklch(0.5 0.05 250)", "oklch(0.6 0.05 250)", "oklch(0.7 0.05 250)", "oklch(0.8 0.05 250)"];

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

    // Fixed J1 location means we don't center the whole robot, we keep J1 near bottom
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
        d: y2,
      };
    };

    const drawJointIndicator = (p: { x: number, y: number }, angle: number, label: string, isHighlighted: boolean) => {
      const r = 30 * cam.zoom;
      ctx.beginPath();
      ctx.strokeStyle = isHighlighted ? "oklch(0.55 0.15 200)" : "oklch(0.5 0.05 250 / 0.3)";
      ctx.setLineDash([2, 2]);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow showing angle
      const rad = deg2rad(angle);
      const ax = p.x + Math.cos(rad) * r;
      const ay = p.y + Math.sin(rad) * r;
      
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ax, ay);
      ctx.strokeStyle = isHighlighted ? "oklch(0.55 0.15 200)" : "oklch(0.5 0.05 250 / 0.5)";
      ctx.stroke();

      // Arrow head
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rad);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, -3);
      ctx.lineTo(-6, 3);
      ctx.closePath();
      ctx.fillStyle = isHighlighted ? "oklch(0.55 0.15 200)" : "oklch(0.5 0.05 250 / 0.5)";
      ctx.fill();
      ctx.restore();
    };

    const drawCylinder = (a: Vec3, b: Vec3, radius: number, color: string) => {
      const pa = project(a);
      const pb = project(b);
      
      // Industrial link body
      ctx.strokeStyle = color;
      ctx.lineWidth = radius * 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();

      // Metallic highlight
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = radius * 0.8;
      ctx.beginPath();
      ctx.moveTo(pa.x - radius/3, pa.y - radius/3);
      ctx.lineTo(pb.x - radius/3, pb.y - radius/3);
      ctx.stroke();
    };

    // Realistic Floor/Base Grid
    ctx.strokeStyle = "oklch(0.5 0.05 250 / 0.1)";
    ctx.lineWidth = 1;
    for(let i = -5; i <= 5; i++) {
        const p1 = project({x: i*50, y: -250, z: 0});
        const p2 = project({x: i*50, y: 250, z: 0});
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        const p3 = project({x: -250, y: i*50, z: 0});
        const p4 = project({x: 250, y: i*50, z: 0});
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
    }

    // Links (Realistic Robot Body)
    for (let i = 0; i < frames.length - 1; i++) {
      const a = originOf(frames[i] as Mat4);
      const b = originOf(frames[i + 1] as Mat4);
      
      const isHighlighted = activeStep !== undefined && i < activeStep;
      const color = isHighlighted ? "oklch(0.55 0.15 200)" : (LINK_COLORS[i % LINK_COLORS.length] || "#475569");
      
      // Realistic joint housings
      const pa = project(a);
      const r = (18 - i * 1.8) * (isHighlighted ? 1.1 : 1);
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "oklch(0.2 0.05 250)";
      ctx.fill();

      drawCylinder(a, b, (12 - i * 1.5) * (isHighlighted ? 1.2 : 1), color);
    }

    // Annotations & Angle Arrows
    frames.forEach((f, i) => {
      const p = project(originOf(f));
      const row = (f as any)._dhRow; // Attempt to get row for angle
      // Use index based highlight
      const isHighlighted = activeStep === i;
      
      // J1 fixed location highlight
      if (i === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "oklch(0.55 0.15 200)";
        ctx.fill();
        ctx.font = "bold 10px JetBrains Mono";
        ctx.fillText("FIXED J1 BASE", p.x + 10, p.y + 20);
      }

      // Draw angle arrow indicator
      const angle = (f as any).theta ?? 0;
      drawJointIndicator(p, angle, `J${i+1}`, isHighlighted);
      
      ctx.fillStyle = isHighlighted ? "oklch(0.55 0.15 200)" : "oklch(0.5 0.05 250)";
      ctx.font = "bold 9px JetBrains Mono";
      ctx.textAlign = "center";
      ctx.fillText(`J${i+1}`, p.x, p.y - 45);
    });

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
