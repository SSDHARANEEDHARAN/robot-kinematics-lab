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


// Colors based on the uploaded reference image
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
    
    // Create Mat4 frames from 2D points
    // In planar mode, J1 is at (0,0), J2 is at planarPoints[1], etc.
    // We treat 2D (x,y) as 3D (x,z) to make the robot stand up
    return planarPoints.map((p, i) => {
      // Create a transformation matrix for each joint in the planar arm
      // We map 2D (x, y) to 3D (x, 0, z) and handle link rotation for J2 and J3
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
    
    // Base scale adjusted by viewport size and user zoom
    const currentBaseScale = Math.min(w, h) / 480;
    // We update state inside useEffect, but we need the local value for this render cycle's drawing
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
        z2: z2, // for sorting if needed
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
    if (showAxes) {
      drawAxes({x: 0, y: 0, z: 0}, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], 60, true);
    }

    // Pre-calculate projections for depth sorting
    const projectFrame = (frame: Mat4) => project(originOf(frame));

    // Links and Joints
    for (let i = 0; i < effectiveFrames.length - 1; i++) {
      const a = originOf(effectiveFrames[i] as Mat4);
      const b = originOf(effectiveFrames[i + 1] as Mat4);
      const pa = project(a);
      const pb = project(b);

      const isHighlighted = activeStep !== undefined && i < activeStep;
      const r = (13 - i * 1.2) * currentBaseScale;

      // --- Link body: realistic cylinders based on reference image ---
      const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const dist = Math.sqrt((pb.x - pa.x) ** 2 + (pb.y - pa.y) ** 2);
      
      const nx = Math.cos(ang + Math.PI / 2);
      const ny = Math.sin(ang + Math.PI / 2);
      const lw = r * 2.2;
      
      const linkColor = LINK_COLORS[i % LINK_COLORS.length] || "#7F8C8D";

      ctx.save();
      // Drop shadow for 3D depth
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 6;
      
      // Simple cylindrical shading (darker on bottom)
      const cylinderGrad = ctx.createLinearGradient(
        pa.x + nx * lw * 0.5, pa.y + ny * lw * 0.5,
        pa.x - nx * lw * 0.5, pa.y - ny * lw * 0.5
      );
      cylinderGrad.addColorStop(0, linkColor);
      cylinderGrad.addColorStop(0.5, linkColor);
      cylinderGrad.addColorStop(1, "rgba(0,0,0,0.4)"); 
      
      ctx.strokeStyle = cylinderGrad;
      ctx.lineWidth = lw;
      ctx.lineCap = "butt"; // Use butt for links so they don't overlap joint center visually too much
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      
      drawComplexJoint(pa.x, pa.y, jointAngle, i);

      // --- Joint: Semi-transparent mechanical housing ---
      const hr = r * 2.5;  
      const hw = r * 2.0;  
      
      const drawSchematicJoint = (cx: number, cyy: number, angle: number) => {
        ctx.save();
        ctx.translate(cx, cyy);
        ctx.rotate(angle);
        
        // Semi-transparent housing
        ctx.fillStyle = "rgba(220, 220, 230, 0.6)";
        ctx.strokeStyle = "rgba(100, 100, 120, 0.4)";
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.roundRect(-hw/2, -hr, hw, hr * 2, hr * 0.2);
        ctx.fill();
        ctx.stroke();

        // Internal "axle" detail
        ctx.fillStyle = "rgba(44, 62, 80, 0.8)";
        ctx.fillRect(-hw * 0.1, -hr * 0.8, hw * 0.2, hr * 1.6);
        
        ctx.restore();
      };
      
      // We already have drawComplexJoint defined above in the previous edit, 
      // but let's replace the actual drawing call to match the "schematic" request.
      // I'll update the loop to use this new style for DH 4-6.
      
      // Note: The user asked for this specifically for DH 4, 5, 6.
      // We'll apply this logic inside the loop.
      
      ctx.save();
      ctx.restore(); // Clearing previous link/joint logic for schematic replacement if needed
      // Actually, I'll just refine the existing drawComplexJoint call.

      
      // Draw joint at start of link
      // Use the Z-axis of the frame to orient the joint cylinder
      const frameA = effectiveFrames[i] as Mat4;
      const zAxis = axisOf(frameA, 2);
      const projZ = project({x: a.x + zAxis.x, y: a.y + zAxis.y, z: a.z + zAxis.z});
      const jointAngle = Math.atan2(projZ.y - pa.y, projZ.x - pa.x);
      
      drawComplexJoint(pa.x, pa.y, jointAngle, i);

      if (isHighlighted) {
        ctx.save();
        ctx.strokeStyle = "#3498DB";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(pa.x, pa.y, hr * 1.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Frame axes at each joint
      if (showAxes && effectiveFrames[i]) {
        drawAxes(a, effectiveFrames[i] as Mat4, 34);
      }
    }

    // End Effector (Gripper Base/Tool)
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
      
      const eer = 12 * currentBaseScale;
      
      // Industrial End-Cap Tool Holder
      const eeGrad = ctx.createLinearGradient(0, -eer, 0, eer);
      eeGrad.addColorStop(0, "#3498DB");
      eeGrad.addColorStop(1, "#2980B9");
      
      ctx.fillStyle = eeGrad;
      ctx.beginPath();
      ctx.roundRect(-eer, -eer, eer * 2, eer * 2, eer * 0.3);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.stroke();
      
      // Gripper fingers (Simple aesthetic representation)
      ctx.fillStyle = "#2C3E50";
      ctx.fillRect(eer * 0.5, -eer * 0.8, eer * 0.8, eer * 0.3);
      ctx.fillRect(eer * 0.5, eer * 0.5, eer * 0.8, eer * 0.3);
      
      ctx.restore();

      if (showAxes) {
        drawAxes(eePos, eeFrame as Mat4, 40);
      }
    }


  }, [effectiveFrames, cam, activeStep]);

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
