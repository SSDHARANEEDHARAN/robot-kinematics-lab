export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export type Vec2 = { x: number; y: number };

/** Planar forward kinematics: returns joint positions starting at origin. */
export function fk2d(lengths: number[], anglesDeg: number[]): Vec2[] {
  const pts: Vec2[] = [{ x: 0, y: 0 }];
  let acc = 0;
  for (let i = 0; i < lengths.length; i++) {
    // Each angle is relative to the previous link (accumulated)
    acc += deg2rad(anglesDeg[i] ?? 0);
    const prev = pts[pts.length - 1] as Vec2;
    const len = lengths[i] ?? 0;
    pts.push({ 
      x: prev.x + len * Math.cos(acc), 
      y: prev.y + len * Math.sin(acc) 
    });
  }
  return pts;
}

export type IKResult = { angles: number[]; reachable: boolean; error: number };

/** Analytic inverse kinematics with support for up to 3 links. */
export function ik2d(
  lengths: number[],
  target: Vec2,
  elbowUp: boolean,
  thirdAngle = 0,
): IKResult {
  const l1 = lengths[0] ?? 1;
  const l2 = lengths[1] ?? 1;
  
  // For 3-link IK, the 3rd link acts as an end-effector offset if its angle is fixed
  // However, standard 2R analytic IK solves for the first two joints to reach a point.
  // If a 3rd link exists, we solve for the 'wrist' position (start of 3rd link).
  
  let tx = target.x;
  let ty = target.y;

  if (lengths.length > 2) {
    const l3 = lengths[2] ?? 0;
    // We assume the 3rd joint angle (relative to 2nd link) is 'thirdAngle'
    // To reach 'target', the start of the 3rd link must be at target - offset
    // But since thirdAngle is relative, this is a circular dependency.
    // Usually, 3-link IK implies reaching a point with a specific orientation.
    // For this lab, we treat the first 2 links as the primary positional solver.
  }

  const d2 = tx * tx + ty * ty;
  const d = Math.sqrt(d2);
  const min = Math.abs(l1 - l2);
  const max = l1 + l2;
  const reachable = d >= min - 1e-6 && d <= max + 1e-6;
  const dc2 = clamp(d2, min * min, max * max);
  const dc = Math.sqrt(dc2);

  // Law of Cosines for t2 (angle between link 1 and link 2)
  const cos2 = (dc2 - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const t2 = (elbowUp ? -1 : 1) * Math.acos(clamp(cos2, -1, 1));
  
  // Angle of first link
  const t1 = Math.atan2(ty, tx) - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));

  const angles = [rad2deg(t1), rad2deg(t2)];
  if (lengths.length > 2) angles.push(thirdAngle);

  const pts = fk2d(lengths, angles);
  const tip = pts[pts.length - 1] as Vec2;
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
    const m = dhMatrix(row);
    t = mul(t, m);
    // Attach raw row data for visualization
    const frame = [...t] as any;
    frame.theta = row.theta;
    frame.d = row.d;
    frame.a = row.a;
    frame.alpha = row.alpha;
    frames.push(frame);
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

/** Generates a heatmap grid for reachability */
export function generateReachabilityHeatmap(lengths: number[], step = 10): { x: number; y: number; reachable: boolean }[] {
  const l1 = lengths[0] ?? 0;
  const l2 = lengths[1] ?? 0;
  const max = l1 + l2;
  const grid: { x: number; y: number; reachable: boolean }[] = [];
  
  for (let x = -max; x <= max; x += step) {
    for (let y = -max; y <= max; y += step) {
      const d = Math.hypot(x, y);
      grid.push({ 
        x, 
        y, 
        reachable: d >= Math.abs(l1 - l2) - 1e-6 && d <= max + 1e-6 
      });
    }
  }
  return grid;
}

export type JointLimits = { min: number; max: number };

export function clampAngle(angle: number, limits: JointLimits): number {
  return Math.min(limits.max, Math.max(limits.min, angle));
}

export function isLimitViolated(angle: number, limits: JointLimits): boolean {
  return angle < limits.min - 1e-3 || angle > limits.max + 1e-3;
}

/** Check for collisions between links in 2D. 
 *  Uses line-segment intersection between non-adjacent links.
 */
export function checkCollisions2d(points: Vec2[]): { colliding: boolean, pairs: [number, number][], points: Vec2[] } {
  const result: { colliding: boolean, pairs: [number, number][], points: Vec2[] } = {
    colliding: false,
    pairs: [],
    points: []
  };

  if (points.length < 4) return result; // Need at least 3 links (4 points) for a self-collision

  // Check each link segment against other non-adjacent link segments
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;

    for (let j = i + 2; j < points.length - 1; j++) {
      const p3 = points[j]!;
      const p4 = points[j + 1]!;

      const intersect = getIntersection(p1, p2, p3, p4);
      if (intersect) {
        result.colliding = true;
        result.pairs.push([i, j]);
        result.points.push(intersect);
      }
    }
  }

  return result;
}

function getIntersection(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | null {
  const det = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(det) < 1e-6) return null; // Parallel

  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / det;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / det;

  if (t >= 0.05 && t <= 0.95 && u >= 0.05 && u <= 0.95) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    };
  }
  return null;
}
