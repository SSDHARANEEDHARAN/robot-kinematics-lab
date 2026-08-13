import { useEffect, useRef, useState } from "react";
import { axisOf, originOf, type Mat4, type Vec3 } from "@/lib/kinematics";

type Props = { frames: Mat4[] };

const LINK_COLORS = ["#1e293b", "#dc2626", "#10b981", "#7c3aed", "#0ea5e9", "#f59e0b"];

export function DHView3D({ frames }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cam, setCam] = useState({ yaw: -0.9, pitch: 0.5, zoom: 1 });
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

    const project = (p: Vec3) => {
      const x1 = p.x * cy - p.y * sy;
      const y1 = p.x * sy + p.y * cy;
      const z1 = p.z;
      const y2 = y1 * cp - z1 * sp;
      const z2 = y1 * sp + z1 * cp;
      const depth = 900;
      const persp = depth / (depth + y2 * 0.6);
      return {
        x: w / 2 + x1 * scale * persp,
        y: h / 2 + 110 - z2 * scale * persp,
        d: y2,
      };
    };

    const line = (a: Vec3, b: Vec3, color: string, width: number) => {
      const pa = project(a);
      const pb = project(b);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    };

    // floor grid
    const G = 300;
    const step = 60;
    ctx.globalAlpha = 0.5;
    for (let i = -G; i <= G; i += step) {
      line({ x: i, y: -G, z: 0 }, { x: i, y: G, z: 0 }, "#cbd5e1", 1);
      line({ x: -G, y: i, z: 0 }, { x: G, y: i, z: 0 }, "#cbd5e1", 1);
    }
    ctx.globalAlpha = 1;

    // links
    for (let i = 0; i < frames.length - 1; i++) {
      const a = originOf(frames[i] as Mat4);
      const b = originOf(frames[i + 1] as Mat4);
      line(a, b, "#94a3b8", 16);
      line(a, b, LINK_COLORS[i % LINK_COLORS.length] as string, 11);
    }

    // frame axes
    const axisColors = ["#ef4444", "#22c55e", "#3b82f6"];
    frames.forEach((f) => {
      const o = originOf(f);
      ([0, 1, 2] as const).forEach((k) => {
        const ax = axisOf(f, k);
        const len = 42;
        line(
          o,
          { x: o.x + ax.x * len, y: o.y + ax.y * len, z: o.z + ax.z * len },
          axisColors[k] as string,
          2.5,
        );
      });
    });

    // joint spheres
    frames.forEach((f, i) => {
      const p = project(originOf(f));
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === 0 ? 8 : 7, 0, Math.PI * 2);
      ctx.fillStyle = i === frames.length - 1 ? "#2563eb" : "#e2e8f0";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });
  }, [frames, cam]);

  return (
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
      }}
    />
  );
}
