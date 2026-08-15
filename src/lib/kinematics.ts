export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export type Vec2 = { x: number; y: number };

/** Planar forward kinematics: returns joint positions starting at origin. */
export function fk2d(lengths: number[], anglesDeg: number[]): Vec2[] {
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  let acc = 0;
  for (let i = 0; i < lengths.length; i++) {
    acc += deg2rad(anglesDeg[i] ?? 0);
    const prev = pts[pts.length - 1] as Vec2;
    const len = lengths[i] ?? 0;
    pts.push({ x: prev.x + len * Math.cos(acc), y: prev.y + len * Math.sin(acc) });
  }
  return pts;
}

export type IKResult = { angles: number[]; reachable: boolean; error: number };

/** Analytic 2-link inverse kinematics with elbow-up / elbow-down branch. */
export function ik2d(
  lengths: number[],
  target: Vec2,
  elbowUp: boolean,
  thirdAngle = 0,
): IKResult {
  const l1 = lengths[0] ?? 1;
  const l2 = lengths[1] ?? 1;
  const d = Math.hypot(target.x, target.y);
  const min = Math.abs(l1 - l2);
  const max = l1 + l2;
  const reachable = d >= min - 1e-6 && d <= max + 1e-6;
  const dc = clamp(d, min, max);

  const cos2 = clamp((dc * dc - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1);
  const t2 = (elbowUp ? 1 : -1) * Math.acos(cos2);
  const t1 =
    Math.atan2(target.y, target.x) -
    Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));

  const angles = [rad2deg(t1), rad2deg(t2)];
  if (lengths.length > 2) angles.push(thirdAngle);

  const pts = fk2d(lengths, angles);
  const tip = (lengths.length > 2 ? pts[2] : pts[pts.length - 1]) as Vec2;
  const error = Math.hypot(tip.x - target.x, tip.y - target.y);
  return { angles, reachable, error };
}

/* ---------- 3D / Denavit-Hartenberg ---------- */

export type Mat4 = number[]; // row-major 4x4

export const identity = (): Mat4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function mul(a: Mat4, b: Mat4): Mat4 {
  const o: number[] = new Array(16).fill(0);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += (a[r * 4 + k] ?? 0) * (b[k * 4 + c] ?? 0);
      o[r * 4 + c] = s;
    }
  return o;
}

export type DHRow = { theta: number; d: number; a: number; alpha: number };

/** Standard (distal) DH transform, angles in degrees. */
export function dhMatrix({ theta, d, a, alpha }: DHRow): Mat4 {
  const ct = Math.cos(deg2rad(theta));
  const st = Math.sin(deg2rad(theta));
  const ca = Math.cos(deg2rad(alpha));
  const sa = Math.sin(deg2rad(alpha));
  return [
    ct, -st * ca, st * sa, a * ct,
    st, ct * ca, -ct * sa, a * st,
    0, sa, ca, d,
    0, 0, 0, 1,
  ];
}

export function dhChain(rows: DHRow[]): Mat4[] {
  const frames: Mat4[] = [identity()];
  let t = identity();
  for (const row of rows) {
    t = mul(t, dhMatrix(row));
    frames.push(t);
  }
  return frames;
}

export type Vec3 = { x: number; y: number; z: number };

export const originOf = (m: Mat4): Vec3 => ({ x: m[3] ?? 0, y: m[7] ?? 0, z: m[11] ?? 0 });

export const axisOf = (m: Mat4, i: 0 | 1 | 2): Vec3 => ({
  x: m[i] ?? 0,
  y: m[4 + i] ?? 0,
  z: m[8 + i] ?? 0,
});

/** 2x2 Jacobian for a planar 2R robot arm.
 *  J = [ -L1*s1 - L2*s12, -L2*s12 ]
 *      [  L1*c1 + L2*c12,  L2*c12 ]
 */
export function jacobian2d(lengths: number[], anglesDeg: number[]): number[][] {
  const l1 = lengths[0] ?? 0;
  const l2 = lengths[1] ?? 0;
  const a1 = deg2rad(anglesDeg[0] ?? 0);
  const a12 = a1 + deg2rad(anglesDeg[1] ?? 0);

  const s1 = Math.sin(a1);
  const c1 = Math.cos(a1);
  const s12 = Math.sin(a12);
  const c12 = Math.cos(a12);

  return [
    [-l1 * s1 - l2 * s12, -l2 * s12],
    [l1 * c1 + l2 * c12, l2 * c12],
  ];
}

/** Determinant of a 2x2 matrix */
export const det2x2 = (m: number[][]) => (m[0]?.[0] ?? 0) * (m[1]?.[1] ?? 0) - (m[0]?.[1] ?? 0) * (m[1]?.[0] ?? 0);

/** Forward workspace sweep: returns points and density for an annulus. */
export function workspaceSweep(lengths: number[], steps = 40): Vec2[] {
  const l1 = lengths[0] ?? 0;
  const l2 = lengths[1] ?? 0;
  const pts: Vec2[] = [];
  // For a 2R robot, the workspace is an annulus between |L1-L2| and L1+L2
  const min = Math.abs(l1 - l2);
  const max = l1 + l2;

  for (let r = min; r <= max; r += (max - min) / 5) {
    for (let a = 0; a < 360; a += 10) {
      const rad = deg2rad(a);
      pts.push({ x: r * Math.cos(rad), y: r * Math.sin(rad) });
    }
  }
  return pts;
}
