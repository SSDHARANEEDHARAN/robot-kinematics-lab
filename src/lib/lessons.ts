import type { Vec2 } from "./kinematics";

export type LessonState = {
  mode: string;
  target: Vec2;
  angles: number[];
  lengths: number[];
  jointCount: number;
};

export type Lesson = {
  id: string;
  title: string;
  goal: string;
  body: string[];
  check: (s: LessonState) => boolean;
};

export const LESSONS: Lesson[] = [
  {
    id: "l1",
    title: "1. Reach the Point",
    goal: "Set Target X to 200",
    body: [
      "Welcome to Kinematics.SelfStudy.",
      "Inverse Kinematics (IK) calculates joint angles for a given target position.",
      "Try dragging the target point to X: 200.",
    ],
    check: (s) => Math.abs(s.target.x - 200) < 5,
  },
  {
    id: "l2",
    title: "2. Stretch Out",
    goal: "Extend the arm to its full length",
    body: [
      "The total reach is the sum of all link lengths.",
      "Straighten the arm to reach the workspace boundary.",
    ],
    check: (s) => {
      const max = s.lengths.reduce((a, b) => a + b, 0);
      const d = Math.hypot(s.target.x, s.target.y);
      return Math.abs(d - max) < 10;
    },
  },
  {
    id: "l3",
    title: "3. The Elbow Angle",
    goal: "Set J2 (Elbow) to 90 degrees",
    body: [
      "Forward Kinematics (FK) calculates the end position from joint angles.",
      "Switch to FK mode and adjust J2 to exactly 90°.",
    ],
    check: (s) => {
      const j2 = s.angles[1];
      if (j2 === undefined) return false;
      return s.mode === "FK" && Math.abs(j2 - 90) < 1;
    },
  },
  {
    id: "l4",
    title: "4. Dead Zone",
    goal: "Move target inside the inner limit",
    body: [
      "The 'inner dead zone' is a region the robot cannot reach.",
      "This happens when the distance is less than |L1 - L2|.",
    ],
    check: (s) => {
      const l1 = s.lengths[0];
      const l2 = s.lengths[1];
      if (l1 === undefined || l2 === undefined) return false;
      return Math.hypot(s.target.x, s.target.y) < Math.abs(l1 - l2);
    },
  },
];
