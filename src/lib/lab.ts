import { deg2rad, fk2d, ik2d, type DHRow, type Vec2 } from "./kinematics";
import type { jsPDF } from "jspdf";
import "jspdf-autotable";


export type Waypoint = {
  id: string;
  name: string;
  angles: number[];
  target: Vec2;
  move: "MOVJ" | "MOVL";
  spd: number;
};

export type Preset = {
  mode: string;
  linkCount: number;
  lengths: number[];
  angles: number[];
  target: Vec2;
  elbowUp: boolean;
  dh: DHRow[];
  jointCount: number;
  waypoints: Waypoint[];
};

/* ---------- share links ---------- */

const b64encode = (s: string) =>
  typeof window === "undefined" ? "" : window.btoa(unescape(encodeURIComponent(s)));
const b64decode = (s: string) => decodeURIComponent(escape(window.atob(s)));

export function encodePreset(p: Preset): string {
  return b64encode(JSON.stringify(p));
}

export function decodePreset(code: string): Preset | null {
  try {
    const parsed = JSON.parse(b64decode(code));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Preset;
  } catch {
    return null;
  }
}

export function readPresetFromLocation(): Preset | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const code = params.get("lab");
  return code ? decodePreset(code) : null;
}

export function shareUrlFor(p: Preset): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}#lab=${encodePreset(p)}`;
}

/* ---------- units ---------- */

export const fmtAngle = (deg: number, unit: "deg" | "rad") =>
  unit === "deg" ? `${deg.toFixed(1)}°` : `${deg2rad(deg).toFixed(3)} rad`;

/* ---------- interpolation / playback ---------- */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerpArr = (a: number[], b: number[], t: number) =>
  b.map((v, i) => lerp(a[i] ?? 0, v, t));

export const lerpVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

export type Pose = { angles: number[]; target: Vec2 };

/** Sample a pose along a segment using joint (MOVJ) or linear cartesian (MOVL) motion. */
export function samplePose(
  from: Pose,
  to: Waypoint,
  t: number,
  lengths: number[],
  elbowUp: boolean,
): Pose {
  if (to.move === "MOVL") {
    const target = lerpVec(from.target, to.target, t);
    const sol = ik2d(lengths, target, elbowUp, to.angles[2] ?? 0);
    return { angles: sol.angles, target };
  }
  const angles = lerpArr(from.angles, to.angles, t);
  const pts = fk2d(lengths, angles);
  const tip = pts[pts.length - 1] ?? { x: 0, y: 0 };
  return { angles, target: tip };
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export async function exportPresetReport(preset: Preset, stats: any) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text("Industrial Kinematics Lab Report", 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
  doc.text(`Mode: ${preset.mode}`, 20, 40);
  doc.text(`Link Count: ${preset.linkCount}`, 20, 50);
  
  doc.setFontSize(14);
  doc.text("System Parameters", 20, 65);
  
  const paramData = [
    ["Target Position", `X: ${preset.target.x.toFixed(2)}, Y: ${preset.target.y.toFixed(2)}`],
    ["Lengths", preset.lengths.slice(0, preset.linkCount).join(", ")],
    ["Computed Angles", preset.angles.slice(0, preset.linkCount).map(a => a.toFixed(2) + "°").join(", ")],
    ["End-Effector Error", stats.error.toFixed(4) + " units"],
    ["Reachability", stats.reachable ? "YES" : "NO"],
  ];
  
  (doc as any).autoTable({
    startY: 70,
    head: [["Parameter", "Value"]],
    body: paramData,
  });
  
  if (preset.waypoints.length > 0) {
    doc.text("Program Waypoints", 20, (doc as any).lastAutoTable.finalY + 15);
    const waypointsData = preset.waypoints.map(w => [
      w.name,
      w.move,
      `X: ${w.target.x}, Y: ${w.target.y}`,
      w.angles.map(a => a.toFixed(1) + "°").join(", "),
      w.spd
    ]);
    
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["Name", "Type", "Target", "Angles", "Speed"]],
      body: waypointsData,
    });
  }
  
  doc.save(`kinematics-report-${preset.mode.toLowerCase()}.pdf`);
}

