export type LessonState = {
  mode: string;
  lengths: number[];
  angles: number[];
  target: { x: number; y: number };
  ikError: number;
  reachable: boolean;
  elbowUp: boolean;
  waypointCount: number;
  jointCount: number;
};

export type Lesson = {
  id: string;
  title: string;
  goal: string;
  body: string[];
  setup?: Partial<{ mode: string; linkCount: number }>;
  check: (s: LessonState) => boolean;
};

export const LESSONS: Lesson[] = [
  {
    id: "l1",
    title: "1. One link, one angle",
    goal: "In FK mode, set θ₁ to 90°.",
    body: [
      "A joint angle θ rotates a link of fixed length L.",
      "The tip sits at (L·cos θ, L·sin θ). Everything else is this idea, repeated.",
    ],
    setup: { mode: "FK" },
    check: (s) => s.mode === "FK" && Math.abs((s.angles[0] ?? 0) - 90) < 3,
  },
  {
    id: "l2",
    title: "2. 2R forward kinematics",
    goal: "Drive the tip past x = 150 using the sliders only.",
    body: [
      "x = L₁cos θ₁ + L₂cos(θ₁+θ₂)",
      "y = L₁sin θ₁ + L₂sin(θ₁+θ₂)",
      "Angles accumulate: link 2 is measured relative to link 1.",
    ],
    setup: { mode: "FK", linkCount: 2 },
    check: (s) => {
      const a1 = s.angles[0] ?? 0;
      const a2 = (s.angles[0] ?? 0) + (s.angles[1] ?? 0);
      const x =
        (s.lengths[0] ?? 0) * Math.cos((a1 * Math.PI) / 180) +
        (s.lengths[1] ?? 0) * Math.cos((a2 * Math.PI) / 180);
      return s.mode === "FK" && x > 150;
    },
  },
  {
    id: "l3",
    title: "3. 2R inverse kinematics",
    goal: "In IK mode, hit a reachable target with error < 1.",
    body: [
      "Law of cosines gives θ₂ from the target distance D.",
      "cos θ₂ = (x² + y² − L₁² − L₂²) / (2 L₁ L₂)",
      "θ₁ = atan2(y,x) − atan2(L₂ sin θ₂, L₁ + L₂ cos θ₂)",
    ],
    setup: { mode: "IK" },
    check: (s) => s.mode === "IK" && s.reachable && s.ikError < 1,
  },
  {
    id: "l4",
    title: "4. Elbow-up vs elbow-down",
    goal: "Switch the elbow branch while keeping the same target.",
    body: [
      "acos returns ±θ₂ — two joint solutions reach the identical point.",
      "The ghost arm shows the other branch live.",
    ],
    setup: { mode: "IK" },
    check: (s) => s.mode === "IK" && s.elbowUp,
  },
  {
    id: "5",
    title: "5. Unreachable targets & singularities",
    goal: "Drag the target outside the workspace and read the warning.",
    body: [
      "Reachable if |L₁ − L₂| ≤ D ≤ L₁ + L₂.",
      "At full stretch the arm is singular: it loses a degree of freedom.",
    ],
    setup: { mode: "IK" },
    check: (s) => s.mode === "IK" && !s.reachable,
  },
  {
    id: "l6",
    title: "6. 3R redundancy",
    goal: "Use 3 links in IK mode.",
    body: ["With a third link there are infinitely many solutions for one point."],
    setup: { mode: "IK", linkCount: 3 },
    check: (s) => s.lengths.length >= 3 && s.mode === "IK",
  },
  {
    id: "l7",
    title: "7. DH parameters",
    goal: "Open DH mode with 6 joints.",
    body: ["Each row (θ, d, a, α) builds one A-matrix; T = A₁·A₂·…·Aₙ."],
    setup: { mode: "DH" },
    check: (s) => s.mode === "DH" && s.jointCount === 6,
  },
  {
    id: "l8",
    title: "8. Position teaching",
    goal: "Teach at least 3 points and play the program.",
    body: [
      "Jog the arm, press Teach — the point stores joint AND cartesian values.",
      "MOVJ interpolates joints (curved path); MOVL interpolates the tip (straight path).",
    ],
    check: (s) => s.waypointCount >= 3,
  },
];

export function LessonPanel({
  state,
  activeId,
  onSelect,
  completed,
}: {
  state: LessonState;
  activeId: string;
  onSelect: (l: Lesson) => void;
  completed: Record<string, boolean>;
}) {
  const active = LESSONS.find((l) => l.id === activeId) ?? LESSONS[0]!;
  const passed = active.check(state);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {LESSONS.map((l) => (
          <button
            key={l.id}
            onClick={() => onSelect(l)}
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              l.id === activeId
                ? "bg-primary text-primary-foreground"
                : completed[l.id]
                  ? "bg-link-3/20 text-foreground"
                  : "bg-secondary text-secondary-foreground"
            }`}
          >
            {l.id.replace("l", "")}
          </button>
        ))}
      </div>
      <h4 className="text-base font-extrabold text-foreground">{active.title}</h4>
      {active.body.map((p, i) => (
        <p key={i} className="font-mono text-xs leading-relaxed text-secondary-foreground">
          {p}
        </p>
      ))}
      <div
        className={`rounded-lg border p-2 text-xs font-semibold ${
          passed ? "border-link-3 bg-link-3/10 text-foreground" : "border-border text-muted-foreground"
        }`}
      >
        {passed ? "✓ Checkpoint passed — " : "Goal: "}
        {active.goal}
      </div>
    </div>
  );
}
