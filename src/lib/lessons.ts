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
  setup?: {
    mode?: string;
    linkCount?: number;
  };
  check: (s: LessonState) => boolean;
};

export const LESSONS: Lesson[] = [
  {
    id: "fk-intro",
    title: "1. Forward Kinematics (FK)",
    goal: "Reach (X: 200, Y: 0) using joint angles",
    body: [
      "Forward Kinematics is the process of finding the end-effector position given the joint angles.",
      "In this mode, you control the rotation of each joint directly.",
      "Adjust the sliders to set Joint 1 to 0° and Joint 2 to 0° to stretch the arm horizontally.",
    ],
    setup: { mode: "FK", linkCount: 2 },
    check: (s) => s.mode === "FK" && Math.abs(s.target.x - 200) < 5 && Math.abs(s.target.y) < 5,
  },
  {
    id: "ik-intro",
    title: "2. Inverse Kinematics (IK)",
    goal: "Move target to (X: 100, Y: 100)",
    body: [
      "Inverse Kinematics is the process of finding the joint angles needed to reach a specific target position.",
      "In this mode, you drag the target point (or use the crosshair), and the math calculates the angles.",
      "Drag the end-effector to the coordinates (100, 100).",
    ],
    setup: { mode: "IK", linkCount: 2 },
    check: (s) => s.mode === "IK" && Math.abs(s.target.x - 100) < 5 && Math.abs(s.target.y - 100) < 5,
  },
  {
    id: "ik-elbow",
    title: "3. Elbow Up/Down Solutions",
    goal: "Achieve the target with a negative J2 angle",
    body: [
      "For a 2-link arm, there are usually two possible solutions for every reachable point (Elbow Up and Elbow Down).",
      "Notice how the arm 'flips' when you move past certain points.",
      "Try to position the arm such that the elbow (Joint 2) is bent upwards.",
    ],
    setup: { mode: "IK", linkCount: 2 },
    check: (s) => s.mode === "IK" && (s.angles[1] ?? 0) < -5,
  },
  {
    id: "workspace-limits",
    title: "4. Workspace & Singularities",
    goal: "Move the arm to its maximum reach",
    body: [
      "The workspace is the set of all points the robot can reach.",
      "A singularity occurs when the arm is fully extended or folded, losing a degree of freedom.",
      "Move the target to the very edge of the circle (Distance = 200).",
    ],
    setup: { mode: "IK", linkCount: 2 },
    check: (s) => Math.hypot(s.target.x, s.target.y) > 195,
  },
  {
    id: "ik-walkthrough-2link",
    title: "5. Guided IK Walkthrough",
    goal: "Solve IK for (120, 80) and follow the solver logic",
    body: [
      "In this lesson, we'll walk through the mathematical steps to solve Inverse Kinematics for a 2-link arm.",
      "First, set the links to length 120 and 100.",
      "Then move the target to X: 120, Y: 80.",
      "Open the 'Solver Steps' tab to see the law of cosines in action.",
    ],
    setup: { mode: "IK", linkCount: 2 },
    check: (s) => 
      s.mode === "IK" && 
      Math.abs(s.target.x - 120) < 5 && 
      Math.abs(s.target.y - 80) < 5 &&
      Math.abs((s.lengths[0] ?? 0) - 120) < 5,
  },
];
