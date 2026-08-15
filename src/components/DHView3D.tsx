import { useEffect, useRef, useState, useMemo } from "react";
import { axisOf, originOf, type Mat4, type Vec3, deg2rad, type Vec2, fk2d } from "@/lib/kinematics";
import { GhostButton } from "./LabControls";

type Props = { 
  frames?: Mat4[] | undefined;
  activeStep?: number | undefined;
  // Planar support
  mode?: string;
  planarPoints?: Vec2[] | undefined;
  linkCount?: number;
  showAxes?: boolean;
};


// Colors based on schematic request: Dark Blue and Vibrant Red
const LINK_COLORS = [
  "#1A2B3C", // J1: Deep Dark Blue
  "#E74C3C", // J2: Vibrant Red
  "#1A2B3C", // J3: Deep Dark Blue
  "#E74C3C", // J4: Vibrant Red
  "#1A2B3C", // J5: Deep Dark Blue
  "#E74C3C", // J6: Vibrant Red
];


export function DHView3D({ frames = [], activeStep, mode = "DH", planarPoints = [], linkCount = 2, showAxes = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cam, setCam] = useState({ yaw: -0.9, pitch: 0.5, zoom: 1.2 });
  const [baseScale, setBaseScale] = useState(1);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Convert 2D points to 3D frames for consistent rendering if in IK/FK mode
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
    
    if (baseScale !== currentBaseScale) {
       setBaseScale(currentBaseScale);
    }

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

    const drawAxes = (pos: Vec3, frame: Mat4, size = 30, isBase = false) => {
      const p = project(pos);
      const axisSize = size * currentBaseScale;
      const xAxis = axisOf(frame, 0);
      const yAxis = axisOf(frame, 1);
      const zAxis = axisOf(frame, 2);

      const px = project({ x: pos.x + xAxis.x * axisSize, y: pos.y + xAxis.y * axisSize, z: pos.z + xAxis.z * axisSize });
      const py = project({ x: pos.x + yAxis.x * axisSize, y: pos.y + yAxis.y * axisSize, z: pos.z + yAxis.z * axisSize });
      const pz = project({ x: pos.x + zAxis.x * axisSize, y: pos.y + zAxis.y * axisSize, z: pos.z + zAxis.z * axisSize });

      const drawArrow = (from: {x: number, y: number}, to: {x: number, y: number}, color: string) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath(); 
        ctx.moveTo(from.x, from.y); 
        ctx.lineTo(to.x, to.y); 
        ctx.stroke();

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

    // Light grey perspective grid floor
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    for(let i = -10; i <= 10; i++) {
        const p1 = project({x: i*50, y: -500, z: 0});
        const p2 = project({x: i*50, y: 500, z: 0});
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        const p3 = project({x: -500, y: i*50, z: 0});
        const p4 = project({x: 500, y: i*50, z: 0});
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
    }

    if (showAxes) {
      drawAxes({x: 0, y: 0, z: 0}, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], 70, true);
    }

    // Links and Joints
    for (let i = 0; i < effectiveFrames.length - 1; i++) {
      const a = originOf(effectiveFrames[i] as Mat4);
      const b = originOf(effectiveFrames[i + 1] as Mat4);
      const pa = project(a);
      const pb = project(b);

      const isHighlighted = activeStep !== undefined && i < activeStep;
      const r = (12 - i * 1.0) * currentBaseScale;

      // --- Link body: Technical schematic cylinders ---
      const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const nx = Math.cos(ang + Math.PI / 2);
      const ny = Math.sin(ang + Math.PI / 2);
      const lw = r * 2.2;
      
      const linkColor = LINK_COLORS[i % LINK_COLORS.length] || "#7F8C8D";

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      
      const cylinderGrad = ctx.createLinearGradient(
        pa.x + nx * lw * 0.5, pa.y + ny * lw * 0.5,
        pa.x - nx * lw * 0.5, pa.y - ny * lw * 0.5
      );
      cylinderGrad.addColorStop(0, linkColor);
      cylinderGrad.addColorStop(0.3, linkColor);
      cylinderGrad.addColorStop(0.7, "rgba(0,0,0,0.3)");
      cylinderGrad.addColorStop(1, "rgba(0,0,0,0.5)");
      
      ctx.strokeStyle = cylinderGrad;
      ctx.lineWidth = lw;
      ctx.lineCap = "butt";
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      
      // Specular Highlight
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = lw * 0.12;
      ctx.beginPath();
      ctx.moveTo(pa.x + nx * lw * 0.25, pa.y + ny * lw * 0.25);
      ctx.lineTo(pb.x + nx * lw * 0.25, pb.y + ny * lw * 0.25);
      ctx.stroke();
      ctx.restore();

      // --- Joint: Semi-transparent mechanical housing ---
      const hr = r * 2.6;  
      const hw = r * 1.8;  
      
      const frameA = effectiveFrames[i] as Mat4;
      const zAxis = axisOf(frameA, 2);
      const projZ = project({x: a.x + zAxis.x, y: a.y + zAxis.y, z: a.z + zAxis.z});
      const jointAngle = Math.atan2(projZ.y - pa.y, projZ.x - pa.x);
      
      ctx.save();
      ctx.translate(pa.x, pa.y);
      ctx.rotate(jointAngle);
      
      // Housing
      ctx.fillStyle = "rgba(245, 246, 250, 0.75)";
      ctx.strokeStyle = "rgba(189, 195, 199, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-hw/2, -hr, hw, hr * 2, hr * 0.25);
      ctx.fill();
      ctx.stroke();

      // Mechanical core
      ctx.fillStyle = "rgba(52, 73, 94, 0.55)";
      ctx.fillRect(-hw * 0.18, -hr * 0.88, hw * 0.36, hr * 1.76);
      
      ctx.restore();

      if (isHighlighted) {
        ctx.save();
        ctx.strokeStyle = "#E74C3C";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, hr * 1.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (showAxes && effectiveFrames[i]) {
        drawAxes(a, effectiveFrames[i] as Mat4, 42);
      }
    }

    // End Effector
    const eeFrame = effectiveFrames[effectiveFrames.length - 1];
    if (eeFrame) {
      const eePos = originOf(eeFrame as Mat4);
      const pee = project(eePos);
      const zAxis = axisOf(eeFrame as Mat4, 2);
      const projZ = project({x: eePos.x + zAxis.x, y: eePos.y + zAxis.y, z: eePos.z + zAxis.z});
      const eeAngle = Math.atan2(projZ.y - pee.y, projZ.x - pee.x);
      
      ctx.save();
      ctx.translate(pee.x, pee.y);
      ctx.rotate(eeAngle);
      
      const eer = 14 * currentBaseScale;
      ctx.fillStyle = "rgba(52, 152, 219, 0.85)";
      ctx.beginPath();
      ctx.roundRect(-eer, -eer, eer * 2, eer * 2, eer * 0.3);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.stroke();
      
      ctx.restore();

      if (showAxes) {
        drawAxes(eePos, eeFrame as Mat4, 50);
      }
    }

  }, [effectiveFrames, cam, activeStep, showAxes, baseScale]);

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
        <div className="text-primary uppercase tracking-[0.2em] mb-2 font-black">Technical Schematic</div>
        <div className="text-foreground/70 space-y-1">
          {effectiveFrames.length > 0 && (
            <>
              <div>X: {originOf(effectiveFrames[effectiveFrames.length - 1] as Mat4).x.toFixed(1)}</div>
              <div>Y: {originOf(effectiveFrames[effectiveFrames.length - 1] as Mat4).y.toFixed(1)}</div>
              <div>Z: {originOf(effectiveFrames[effectiveFrames.length - 1] as Mat4).z.toFixed(1)}</div>
            </>
          )}
          <div className="mt-2 border-t border-border pt-1 text-[8px] opacity-60">
            Scale: {baseScale.toFixed(3)}x | Zoom: {cam.zoom.toFixed(2)}x
          </div>
        </div>
      </div>
    </div>
  );
}
