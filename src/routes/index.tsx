import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ArmView2D } from "@/components/ArmView2D";
import { DHView3D } from "@/components/DHView3D";
import { DHFormula, FKFormula, IKFormula } from "@/components/FormulaPanel";
import { AIPanel } from "@/components/AIPanel";
import {
  Badge,
  Card,
  GhostButton,
  NumberField,
  Section,
  SegButton,
  SliderRow,
  Stat,
} from "@/components/LabControls";
import { LessonPanel } from "@/components/LessonPanel";
import { LESSONS, type Lesson } from "@/lib/lessons";
import { QuizPanel } from "@/components/QuizPanel";
import { TeachPanel } from "@/components/TeachPanel";
import { IKWalkthrough } from "@/components/IKWalkthrough";
import {
  det2x2,
  dhChain,
  fk2d,
  ik2d,
  jacobian2d,
  originOf,
  workspaceSweep,
  checkCollisions2d,
  type DHRow,
  type Mat4,
  type Vec2,
} from "@/lib/kinematics";
import {
  fmtAngle,
  readPresetFromLocation,
  samplePose,
  shareUrlFor,
  uid,
  type Preset,
  type Waypoint,
  exportPresetReport,
} from "@/lib/lab";
import { generateReachabilityHeatmap, type JointLimits, isLimitViolated } from "@/lib/kinematics";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Robot Kinematics Virtual Lab | Live FK, IK & DH" },
      {
        name: "description",
        content:
          "Interactive robot kinematics lab: live FK/IK formulas with real numbers, teach-pendant jogging, MOVJ/MOVL trajectories, quizzes, guided lessons and 3D DH chains.",
      },
      { property: "og:title", content: "Robot Kinematics Virtual Lab" },
      {
        property: "og:description",
        content:
          "Learn robot kinematics by simulation: live formula engine, position teaching, trajectory playback, quizzes and guided lessons.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KinematicsLab,
});

type Mode = "IK" | "FK" | "DH" | "EXPERIMENT";
type Tab = "math" | "teach" | "quiz" | "lessons" | "ai" | "industrial" | "progress" | "walkthrough";

const DEFAULT_DH: DHRow[] = [
  { theta: 0, d: 80, a: 0, alpha: -90 },
  { theta: 0, d: 0, a: 120, alpha: 0 },
  { theta: 0, d: 0, a: 100, alpha: 0 },
  { theta: 0, d: 80, a: 0, alpha: -90 },
  { theta: 0, d: 0, a: 60, alpha: 90 },
  { theta: 0, d: 40, a: 0, alpha: 0 },
];

const TABS: { value: Tab; label: string }[] = [
  { value: "math", label: "Math" },
  { value: "walkthrough", label: "Step-by-Step" },
  { value: "teach", label: "Teach" },
  { value: "quiz", label: "Quiz" },
  { value: "ai", label: "AI Tutor" },
  { value: "lessons", label: "Lessons" },
  { value: "industrial", label: "Industrial" },
  { value: "progress", label: "Stats" },
];

function KinematicsLab() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("IK");
  const [linkCount, setLinkCount] = useState(2);
  const [lengths, setLengths] = useState([120, 100, 80, 60, 50, 40]);
  const [angles, setAngles] = useState([20, 20, 10, 0, 0, 0]);
  const [target, setTarget] = useState({ x: 100, y: 30 });
  const [elbowUp, setElbowUp] = useState(false);
  const [showZone, setShowZone] = useState(true);
  const [dh, setDh] = useState<DHRow[]>(DEFAULT_DH);
  const [jointCount, setJointCount] = useState(6);

  const [unit, setUnit] = useState<"deg" | "rad">("deg");
  const [tab, setTab] = useState<Tab>("walkthrough");
  const [dhStep, setDhStep] = useState(0);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pathMode, setPathMode] = useState(false);
  const [trace, setTrace] = useState<Vec2[]>([]);
  const [showTrace, setShowTrace] = useState(true);
  const [showGhost, setShowGhost] = useState(true);
  const [shareMsg, setShareMsg] = useState("");
  const [lessonId, setLessonId] = useState(LESSONS[0]!.id);
  const [activeWalkthroughStep, setActiveWalkthroughStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [showVelocity, setShowVelocity] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [jointLimits, setJointLimits] = useState<JointLimits[]>([
    { min: -180, max: 180 },
    { min: -150, max: 150 },
    { min: -150, max: 150 },
    { min: -150, max: 150 },
    { min: -150, max: 150 },
    { min: -150, max: 150 },
  ]);


  const activeLengths = lengths.slice(0, linkCount);

  /* ---------- shared preset link ---------- */
  useEffect(() => {
    // 1. Try URL preset
    const p = readPresetFromLocation();
    if (p) {
      if (p.mode) setMode(p.mode as Mode);
      if (p.linkCount) setLinkCount(p.linkCount);
      if (p.lengths) setLengths(p.lengths);
      if (p.angles) setAngles(p.angles);
      if (p.target) setTarget(p.target);
      if (typeof p.elbowUp === "boolean") setElbowUp(p.elbowUp);
      if (p.dh) setDh(p.dh);
      if (p.jointCount) setJointCount(p.jointCount);
      if (p.waypoints) setWaypoints(p.waypoints);
      return;
    }

    // 2. Fallback to Local Storage
    const saved = localStorage.getItem("lab-settings");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.mode) setMode(s.mode);
        if (s.linkCount) setLinkCount(s.linkCount);
        if (s.lengths) setLengths(s.lengths);
        if (s.angles) setAngles(s.angles);
        if (s.target) setTarget(s.target);
        if (typeof s.elbowUp === "boolean") setElbowUp(s.elbowUp);
        if (s.dh) setDh(s.dh);
        if (s.jointCount) setJointCount(s.jointCount);
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  // Persist settings
  useEffect(() => {
    const settings = {
      mode,
      linkCount,
      lengths,
      angles,
      target,
      elbowUp,
      dh,
      jointCount,
    };
    localStorage.setItem("lab-settings", JSON.stringify(settings));
  }, [mode, linkCount, lengths, angles, target, elbowUp, dh, jointCount]);


  const preset: Preset = {
    mode,
    linkCount,
    lengths,
    angles,
    target,
    elbowUp,
    dh,
    jointCount,
    waypoints,
  };

  const share = async () => {
    const url = shareUrlFor(preset);
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("COPIED");
    } catch {
      setShareMsg("Link in address bar");
    }
    setTimeout(() => setShareMsg(""), 2500);
  };

  /* ---------- kinematics ---------- */
  const ik = useMemo(() => {
    const res = ik2d(activeLengths, target, elbowUp, angles[2] ?? 0);
    // Apply joint limits to IK result
    const limitedAngles = res.angles.map((a, i) => {
      const limit = jointLimits[i];
      if (!limit) return a;
      return Math.min(limit.max, Math.max(limit.min, a));
    });
    
    // Check if limits were violated
    const violates = res.angles.some((a, i) => {
      const limit = jointLimits[i];
      return limit ? isLimitViolated(a, limit) : false;
    });

    return { 
      ...res, 
      angles: limitedAngles, 
      limitViolation: violates,
      originalAngles: res.angles 
    };
  }, [activeLengths.join(), target.x, target.y, elbowUp, angles[2], jointLimits]);

  const ikGhost = useMemo(
    () => ik2d(activeLengths, target, !elbowUp, angles[2] ?? 0),
    [activeLengths.join(), target.x, target.y, elbowUp, angles[2]],
  );

  const planarAngles = mode === "IK" ? ik.angles : angles.slice(0, linkCount);
  
  // Update joint angles if in IK mode so FK controls stay in sync
  useEffect(() => {
    if (mode === "IK") {
      setAngles(prev => {
        const next = [...prev];
        ik.angles.forEach((a, i) => {
          next[i] = a;
        });
        return next;
      });
    }
  }, [ik.angles, mode]);
  const points = useMemo(
    () => fk2d(activeLengths, planarAngles),
    [activeLengths.join(), planarAngles.join()],
  );
  const ghostPoints = useMemo(
    () => fk2d(activeLengths, ikGhost.angles),
    [activeLengths.join(), ikGhost.angles.join()],
  );
  
  const collisionResult = useMemo(() => {
    if (mode === "DH") return { colliding: false, pairs: [], points: [] };
    return checkCollisions2d(points);
  }, [points, mode]);

  const dhRows = dh.slice(0, jointCount);
  const frames = useMemo(() => dhChain(dhRows), [JSON.stringify(dhRows)]);
  const dhEnd = originOf(frames[frames.length - 1] as Mat4);

  const jacobian = useMemo(
    () => (mode === "DH" || linkCount > 2) ? [[0,0],[0,0]] : jacobian2d(activeLengths, planarAngles),
    [activeLengths.join(), planarAngles.join(), mode, linkCount],
  );
  const manipulability = Math.abs(det2x2(jacobian));
  const isSingular = linkCount <= 2 && manipulability < 5000;

  const heatmap = useMemo(
    () => (showHeatmap ? generateReachabilityHeatmap(activeLengths, 15) : []),
    [activeLengths.join(), showHeatmap],
  );

  const ikFkConsistency = useMemo(() => {
    if (mode === "DH") return null;
    const fkPos = points[points.length - 1] ?? { x: 0, y: 0 };
    const dist = Math.hypot(fkPos.x - target.x, fkPos.y - target.y);
    const limitViolated = planarAngles.some((a, i) => {
      const limit = jointLimits[i];
      return limit ? isLimitViolated(a, limit) : false;
    });

    return {
      match: dist < 1.0 && !limitViolated && !collisionResult.colliding,
      error: dist,
      fkPos,
      limitViolated,
      colliding: collisionResult.colliding,
    };
  }, [points, target, mode, planarAngles, jointLimits, collisionResult.colliding]);


  const velocity = useMemo(() => {
    if (!showVelocity || mode === "DH" || linkCount > 2) return undefined;
    const J = jacobian;
    const j0 = J[0];
    const j1 = J[1];
    if (!j0 || !j1) return undefined;
    return {
      x: (j0[0] ?? 0) + (j0[1] ?? 0),
      y: (j1[0] ?? 0) + (j1[1] ?? 0),
    };
  }, [jacobian, showVelocity, mode]);

  const end = points[points.length - 1] ?? { x: 0, y: 0 };
  const maxReach = activeLengths.reduce((a, b) => a + b, 0);
  const minReach = mode === "IK" ? Math.abs((activeLengths[0] ?? 0) - (activeLengths[1] ?? 0)) : 0;
  const dhReach = dhRows.reduce((s, r) => s + Math.abs(r.a) + Math.abs(r.d), 0);

  const setLength = (i: number, v: number) => setLengths((l) => l.map((x, k) => (k === i ? v : x)));
  const setAngle = (i: number, v: number) => setAngles((a) => a.map((x, k) => (k === i ? v : x)));
  const setDhCell = (i: number, key: keyof DHRow, v: number) =>
    setDh((rows) => rows.map((r, k) => (k === i ? { ...r, [key]: v } : r)));

  /* ---------- trace ---------- */
  useEffect(() => {
    if (mode === "DH" || !showTrace) return;
    setTrace((t) => [...t.slice(-260), { x: end.x, y: end.y }]);
  }, [end.x, end.y, mode, showTrace]);

  /* ---------- teach pendant ---------- */
  const teach = () => {
    const pose = mode === "IK" ? ik.angles : planarAngles;
    const tip = fk2d(activeLengths, pose);
    const last = tip[tip.length - 1] ?? { x: 0, y: 0 };
    setWaypoints((w) => [
      ...w,
      {
        id: uid(),
        name: `P${w.length + 1}`,
        angles: pose.slice(),
        target: { x: Math.round(last.x * 10) / 10, y: Math.round(last.y * 10) / 10 },
        move: "MOVJ",
        spd: 50,
      },
    ]);
  };

  const gotoWaypoint = (id: string) => {
    const w = waypoints.find((x) => x.id === id);
    if (!w) return;
    setAngles((a) => a.map((v, i) => w.angles[i] ?? v));
    setTarget(w.target);
  };

  const playRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing || waypoints.length === 0) return;
    let idx = 0;
    let t = 0;
    let from = { angles: planarAngles.slice(), target };
    setActiveIndex(0);
    setTrace([]);
    const tick = () => {
      const wp = waypoints[idx];
      if (!wp) {
        setPlaying(false);
        setActiveIndex(-1);
        return;
      }
      t += 0.004 * (wp.spd / 50) * 4;
      const pose = samplePose(from, wp, Math.min(1, t), activeLengths, elbowUp);
      setAngles((a) => a.map((v, i) => pose.angles[i] ?? v));
      setTarget(pose.target);
      if (t >= 1) {
        from = { angles: wp.angles.slice(), target: wp.target };
        idx += 1;
        t = 0;
        setActiveIndex(idx);
        if (idx >= waypoints.length) {
          setPlaying(false);
          setActiveIndex(-1);
          return;
        }
      }
      playRef.current = requestAnimationFrame(tick);
    };
    playRef.current = requestAnimationFrame(tick);
    return () => {
      if (playRef.current) cancelAnimationFrame(playRef.current);
    };
  }, [playing]);

  const jogJoint = (i: number, delta: number) => {
    if (mode === "IK") setMode("FK");
    setAngles((a) => a.map((v, k) => {
      if (k === i) {
        const next = v + delta;
        const limit = jointLimits[k];
        if (limit) {
          // Allow free moving for checking limits but visual warning is shown
          return Math.round(next * 10) / 10;
        }
        return Math.round(next * 10) / 10;
      }
      return v;
    }));
  };
  const jogCart = (axis: "x" | "y", delta: number) => {
    if (mode === "FK") {
      setMode("IK");
      setTarget({ x: end.x + (axis === "x" ? delta : 0), y: end.y + (axis === "y" ? delta : 0) });
      return;
    }
    setTarget((t) => ({ ...t, [axis]: Math.round((t[axis] + delta) * 10) / 10 }));
  };

  /* ---------- demo programs ---------- */
  const runDemo = (type: "pick" | "round" | "dance") => {
    setPlaying(false);
    setTrace([]);
    let demoPoints: Waypoint[] = [];
    
    // Scale demo parameters based on joint count
    // DH Mode uses jointCount, IK/FK use linkCount
    const activeJoints = mode === "DH" ? jointCount : linkCount;

    if (type === "pick") {
      const pts = [
        { x: 150, y: 100, name: "Home" },
        { x: 100, y: -50, name: "Over Pick" },
        { x: 100, y: -80, name: "Pick" },
        { x: -100, y: -80, name: "Place" },
        { x: 150, y: 100, name: "Home" },
      ];
      demoPoints = pts.map((p, i) => {
        let anglesForPose: number[] = [];
        if (mode === "DH") {
           anglesForPose = new Array(jointCount).fill(0).map((_, j) => (j === 1 ? -30 : j === 2 ? 60 : 0));
        } else {
           const ikRes = ik2d(activeLengths, p, false);
           anglesForPose = ikRes.angles;
        }
        return {
          id: uid(),
          name: p.name,
          angles: anglesForPose,
          target: p,
          move: i % 2 === 0 ? "MOVJ" : "MOVL",
          spd: 60,
        };
      });
    } else if (type === "round") {
      for (let i = 0; i <= 360; i += 90) {
        const rad = (i * Math.PI) / 180;
        const p = { x: 120 * Math.cos(rad), y: 120 * Math.sin(rad) };
        let anglesForPose: number[] = [];
        if (mode === "DH") {
           anglesForPose = new Array(jointCount).fill(0).map((_, j) => (j === 0 ? i : 0));
        } else {
           const ikRes = ik2d(activeLengths, p, true);
           anglesForPose = ikRes.angles;
        }
        demoPoints.push({
          id: uid(),
          name: `R${i}`,
          angles: anglesForPose,
          target: p,
          move: "MOVL",
          spd: 40,
        });
      }
    } else if (type === "dance") {
      const patterns = [
        new Array(activeJoints).fill(30),
        new Array(activeJoints).fill(-30),
        new Array(activeJoints).fill(0),
      ];
      demoPoints = patterns.map((p, i) => {
        let targetPos = { x: 0, y: 0 };
        if (mode === "DH") {
           const f = dhChain(dhRows.map((r, k) => ({ ...r, theta: p[k] ?? 0 })));
           const o = originOf(f[f.length - 1] as Mat4);
           targetPos = { x: o.x, y: o.y };
        } else {
           const pts = fk2d(activeLengths, p);
           targetPos = pts[pts.length - 1] ?? { x: 0, y: 0 };
        }
        return {
          id: uid(),
          name: `Step ${i + 1}`,
          angles: p,
          target: targetPos,
          move: "MOVJ",
          spd: 80,
        };
      });
    }

    setWaypoints(demoPoints);
    setTimeout(() => setPlaying(true), 100);
  };

  /* ---------- lessons ---------- */
  const lessonState = {
    mode,
    lengths: activeLengths,
    angles: planarAngles,
    target,
    ikError: ik.error,
    reachable: ik.reachable,
    elbowUp,
    waypointCount: waypoints.length,
    jointCount,
  };
  const activeLesson = LESSONS.find((l) => l.id === lessonId) ?? LESSONS[0]!;
  useEffect(() => {
    if (activeLesson.check(lessonState))
      setCompleted((c) => (c[activeLesson.id] ? c : { ...c, [activeLesson.id]: true }));
  }, [JSON.stringify(lessonState), lessonId]);

  const selectLesson = (l: Lesson) => {
    setLessonId(l.id);
    if (l.setup?.mode) setMode(l.setup.mode as any);
    if (l.setup?.linkCount) setLinkCount(l.setup.linkCount);
  };

  const headline =
    mode === "IK"
      ? { title: "Inverse Kinematics", sub: "Analytic 2-link — drag the target" }
      : mode === "FK"
        ? { title: "Forward Kinematics", sub: "Joint angle solve" }
        : {
            title: "DH Forward Kinematics",
            sub: `${jointCount}-joint DH chain — Drag to rotate, scroll to zoom`,
          };

  if (loading) {
    return <LoadingScreen onComplete={() => setLoading(false)} />;
  }

  return (
    <main className="min-h-screen px-4 pb-8 pt-0 md:px-8 max-w-[1920px] mx-auto select-none flex flex-col bg-background text-foreground">
      <header className="mb-8 flex items-center justify-between py-6">
        <div className="flex flex-col gap-0.5 group cursor-default">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary transition-all group-hover:tracking-[0.6em]">
            Kinematics.SelfStudy
          </p>
          <p className="text-xl font-black uppercase tracking-tighter text-foreground">
            Precision Lab V3
          </p>
          {/* Instruction string removed per user request */}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4 mr-4">
            <SegButton
              options={[
                { value: "IK", label: "Inverse" },
                { value: "FK", label: "Forward" },
                { value: "DH", label: "DH-Param" },
              ]}
              value={mode}
              onChange={(v) => setMode(v as Mode)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-full bg-secondary/50 px-4 py-2 backdrop-blur-md transition-all shadow-lg shadow-black/5">
            <span className={`h-2 w-2 rounded-full shadow-[0_0_8px] ${mode === "IK" && !ik.reachable ? "bg-destructive shadow-destructive/50 animate-pulse" : "bg-primary shadow-primary/50"}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
              {mode === "IK" && !ik.reachable ? "Out of reach" : playing ? "Executing" : "Active"}
            </span>
          </div>
        </div>
      </header>


      <div className="grid gap-8 grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_340px] xl:h-[750px]">
        {/* ---------- Left: popups ---------- */}
        <aside className="flex flex-col gap-3 overflow-hidden h-[500px] xl:h-full order-2 xl:order-1">
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="w-full rounded-t-xl border border-border bg-foreground px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-background shadow-lg">
              Robot Configuration
            </div>
            <div className="mt-0 flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-border/50 bg-card/50 backdrop-blur-xl shadow-xl scrollbar-hide">
              <div className="border-none shadow-none divide-y border-border/10">
                <Section title="Robot Operation Mode">
                  <SegButton
                    stacked
                    options={[
                      { value: "IK", label: "Inverse Kinematics (IK)" },
                      { value: "FK", label: "Forward Kinematics (FK)" },
                      { value: "DH", label: "DH Parameters (DH)" },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as Mode)}
                  />
                  <div className="mt-4 flex flex-col gap-2">
                    <GhostButton onClick={share}>
                      {shareMsg || "Share Preset"}
                    </GhostButton>
                  </div>
                </Section>
                {mode === "DH" ? (
                  <>
                    <Section title="Joints">
                      <div className="flex items-center justify-center gap-0 border-2 border-foreground">
                        <button
                          className="px-4 py-2 text-lg font-bold text-foreground hover:bg-foreground hover:text-background transition-colors"
                          onClick={() => setJointCount((c) => Math.max(2, c - 1))}
                        >
                          -
                        </button>
                        <span className="min-w-12 border-x-2 border-foreground px-4 py-2 text-center text-lg font-extrabold">
                          {jointCount}
                        </span>
                        <button
                          className="px-4 py-2 text-lg font-bold text-foreground hover:bg-foreground hover:text-background transition-colors"
                          onClick={() => setJointCount((c) => Math.min(6, c + 1))}
                        >
                          +
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Add joints from 2 to 6</p>
                    </Section>

                    <Section title="DH Parameters" aside="Standard DH">
                      <div className="grid grid-cols-[18px_repeat(4,1fr)] gap-1.5 text-center">
                        <span className="text-xs font-bold text-muted-foreground">#</span>
                        {["θ", "d", "a", "α"].map((h) => (
                          <span key={h} className="text-xs font-bold text-muted-foreground">
                            {h}
                          </span>
                        ))}
                        {dhRows.map((r, i) => (
                          <Fragment key={i}>
                            <span className="self-center text-xs font-bold text-foreground">{i + 1}</span>
                            {(["theta", "d", "a", "alpha"] as const).map((k) => (
                              <input
                                key={`${i}-${k}`}
                                type="number"
                                value={r[k]}
                                onChange={(e) => setDhCell(i, k, Number(e.target.value))}
                                className={`lab-input px-1 text-center text-sm ${k === "theta" ? "text-foreground" : ""}`}
                              />
                            ))}
                          </Fragment>
                        ))}
                      </div>
                    </Section>

                    <Section title="Joint Angles">
                      <div className="space-y-2.5">
                        {dhRows.map((r, i) => (
                          <SliderRow
                            key={i}
                            label={`theta ${i + 1}`}
                            min={-180}
                            max={180}
                            value={r.theta}
                            onChange={(v) => setDhCell(i, "theta", v)}
                          />
                        ))}
                      </div>
                    </Section>

                    <Section title="Presets">
                      <div className="grid grid-cols-2 gap-2">
                        <GhostButton onClick={() => setDh(DEFAULT_DH)}>Home</GhostButton>
                        <GhostButton onClick={() => setDh(DEFAULT_DH)}>Reset</GhostButton>
                      </div>
                    </Section>
                  </>
                ) : (
                  <>
                    <Section title="Validation Stats" collapsible defaultOpen>
                      <div className="grid grid-cols-2 gap-3">
                        <Stat label="FK POS X" value={`${Math.round(ikFkConsistency?.fkPos.x ?? 0)}mm`} />
                        <Stat label="FK POS Y" value={`${Math.round(ikFkConsistency?.fkPos.y ?? 0)}mm`} />
                        <Stat label="POS ERROR" value={`${(ikFkConsistency?.error ?? 0).toFixed(1)}mm`} />
                        <Stat 
                          label="STATUS" 
                          value={ikFkConsistency?.limitViolated ? "LIMIT!" : (ikFkConsistency?.match ? "VALID" : "DRIFT")} 
                        />
                      </div>
                      {ikFkConsistency?.limitViolated && (
                        <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-[10px] font-bold uppercase tracking-wider text-red-600">
                          Joint Limit Violation
                        </div>
                      )}
                    </Section>

                    <Section title="Links" collapsible defaultOpen={false}>
                      <SegButton
                        stacked
                        options={[
                          { value: "2", label: "2 Links" },
                          { value: "3", label: "3 Links" },
                          { value: "4", label: "4 Links" },
                          { value: "5", label: "5 Links" },
                          { value: "6", label: "6 Links" },
                        ]}
                        value={String(linkCount)}
                        onChange={(v) => setLinkCount(Number(v))}
                      />
                    </Section>
                    <Section title="Link Lengths" aside="px" collapsible defaultOpen={false}>
                      <div className="grid grid-cols-2 gap-3">
                        <NumberField label="L1" value={lengths[0] ?? 0} onChange={(v) => setLength(0, v)} />
                        <NumberField label="L2" value={lengths[1] ?? 0} onChange={(v) => setLength(1, v)} />
                        {linkCount > 2 && (
                          <NumberField label="L3" value={lengths[2] ?? 0} onChange={(v) => setLength(2, v)} />
                        )}
                        {linkCount > 3 && (
                          <NumberField label="L4" value={lengths[3] ?? 0} onChange={(v) => setLength(3, v)} />
                        )}
                        {linkCount > 4 && (
                          <NumberField label="L5" value={lengths[4] ?? 0} onChange={(v) => setLength(4, v)} />
                        )}
                        {linkCount > 5 && (
                          <NumberField label="L6" value={lengths[5] ?? 0} onChange={(v) => setLength(5, v)} />
                        )}
                      </div>
                    </Section>
                    {mode === "FK" ? (
                      <Section title="Joint Angles" collapsible>
                        <div className="space-y-2.5">
                          {Array.from({ length: linkCount }).map((_, i) => (
                            <SliderRow
                              key={i}
                              label={`theta ${i + 1}`}
                              min={jointLimits[i]?.min ?? -180}
                              max={jointLimits[i]?.max ?? 180}
                              value={angles[i] ?? 0}
                              onChange={(v) => setAngle(i, v)}
                            />
                          ))}
                        </div>
                      </Section>
                    ) : (
                      <Section title="Target" collapsible>
                        <div className="grid grid-cols-2 gap-3">
                          <NumberField
                            label="X"
                            value={target.x}
                            onChange={(v) => setTarget((t) => ({ ...t, x: v }))}
                          />
                          <NumberField
                            label="Y"
                            value={target.y}
                            onChange={(v) => setTarget((t) => ({ ...t, y: v }))}
                          />
                        </div>
                      </Section>
                    )}
                    
                    <Section title="Joint Limits" collapsible defaultOpen={false}>
                      <div className="flex flex-col gap-4">
                        {[0, 1, 2, 3, 4, 5].slice(0, linkCount).map(i => (
                          <div key={i} className="space-y-2">
                            <div className="text-[10px] font-bold uppercase text-muted-foreground">Joint J{i+1} Limits</div>
                            <SliderRow 
                              label="Min" 
                              min={-180} max={0} 
                              value={jointLimits[i]?.min ?? -180} 
                              onChange={v => setJointLimits(prev => prev.map((l, k) => k === i ? { ...l, min: v } : l))} 
                            />
                            <SliderRow 
                              label="Max" 
                              min={0} max={180} 
                              value={jointLimits[i]?.max ?? 180} 
                              onChange={v => setJointLimits(prev => prev.map((l, k) => k === i ? { ...l, max: v } : l))} 
                            />
                          </div>
                        ))}
                      </div>
                    </Section>

                    <Section title="Environment" collapsible defaultOpen={false}>
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="accent-foreground" checked={showAxes} onChange={e => setShowAxes(e.target.checked)} />
                          <span className="text-xs font-bold uppercase tracking-widest">Show Joint Axes</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="accent-foreground" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} />
                          <span className="text-xs font-bold uppercase tracking-widest">Show Heatmap</span>
                        </label>
                        <GhostButton onClick={() => setAngles([0,0,0])}>Reset Pose</GhostButton>
                        <GhostButton onClick={() => exportPresetReport(preset, ikFkConsistency)}>
                          Export PDF
                        </GhostButton>
                      </div>
                    </Section>

                  </>
                )}
              </div>
            </div>
          </div>
        </aside>

      <div className="flex-1 min-h-[500px] xl:h-full order-1 xl:order-2">
        <section className="lab-card flex h-full flex-col overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500">
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 bg-background">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                {headline.title}
              </h2>
              <p className="text-sm text-muted-foreground">{headline.sub}</p>
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden bg-panel">
             {/* Realistic fixed simulation area */}
            <div className="relative h-full w-full">
              {mode === "DH" ? (
                <DHView3D 
                  mode={mode}
                  frames={mode === "DH" ? frames : undefined}
                  planarPoints={mode !== "DH" ? points : undefined}
                  linkCount={mode === "DH" ? jointCount : linkCount}
                  showAxes={showAxes}
                  activeStep={tab === "walkthrough" ? activeWalkthroughStep : undefined}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-panel">
                   <ArmView2D
                    points={points}
                    lengths={activeLengths}
                    showZone={showZone}
                    target={target}
                    onTargetChange={setTarget}
                    ghostPoints={showGhost ? ghostPoints : undefined}
                    trace={showTrace ? trace : undefined}
                    path={waypoints.map((w) => w.target)}
                    heatmap={heatmap}
                    workspace={[]}
                    velocity={velocity}
                    unit={unit}
                    activeStep={tab === "walkthrough" ? activeWalkthroughStep : undefined}
                    limits={jointLimits}
                    angles={planarAngles}
                    interactive={true}
                    collisions={collisionResult}
                  />
                </div>
              )}

            </div>
          </div>
        </section>
      </div>


        {/* ---------- Right: readouts + tools ---------- */}
        <aside className="flex flex-col gap-4 overflow-hidden h-auto xl:h-full order-3">
          <div className="grid grid-cols-2 gap-3 divide-y-0">
            <Stat label="End X" value={(mode === "DH" ? dhEnd.x : end.x).toFixed(1)} />
            <Stat label="End Y" value={(mode === "DH" ? dhEnd.y : end.y).toFixed(1)} />
            {mode === "DH" && <Stat label="End Z" value={dhEnd.z.toFixed(1)} />}
            <Stat label="Error" value={(mode === "IK" ? ik.error : 0).toFixed(1)} />
          </div>

          <div className="lab-card flex flex-1 flex-col overflow-hidden border-2 border-foreground border-t-8 border-t-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {/* Validation & Settings Panel */}
              <Section title="Validation & Settings" collapsible defaultOpen>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="FK POS X" value={`${Math.round(ikFkConsistency?.fkPos.x ?? 0)}mm`} />
                    <Stat label="FK POS Y" value={`${Math.round(ikFkConsistency?.fkPos.y ?? 0)}mm`} />
                    <Stat label="POS ERROR" value={`${(ikFkConsistency?.error ?? 0).toFixed(1)}mm`} />
                    <Stat 
                      label="STATUS" 
                      value={ikFkConsistency?.limitViolated ? "LIMIT!" : (ikFkConsistency?.match ? "VALID" : "DRIFT")} 
                    />
                  </div>
                  {ikFkConsistency?.limitViolated && (
                    <div className="rounded border border-red-200 bg-red-50 p-2 text-[10px] font-bold uppercase tracking-wider text-red-600">
                      Joint Limit Violation Detected
                    </div>
                  )}

                  <div className="space-y-4 border-t border-border pt-4">
                    <SliderRow
                      label="Links"
                      min={1}
                      max={3}
                      value={linkCount}
                      onChange={(v) => {
                        setLinkCount(v);
                        if (v > lengths.length) setLengths([...lengths, 80]);
                      }}
                    />
                    {activeLengths.map((l, i) => (
                      <SliderRow
                        key={i}
                        label={`L${i + 1} (mm)`}
                        min={20}
                        max={200}
                        value={l}
                        onChange={(v) => setLength(i, v)}
                      />
                    ))}
                    {mode === "FK" &&
                      activeLengths.map((_, i) => (
                        <SliderRow
                          key={i}
                          label={`J${i + 1} (°)`}
                          min={jointLimits[i]?.min ?? -180}
                          max={jointLimits[i]?.max ?? 180}
                          value={angles[i] ?? 0}
                          onChange={(v) => setAngle(i, v)}
                        />
                      ))}
                    
                    {/* Joint Limits Config */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Limit Configuration</h4>
                      {activeLengths.map((_, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <NumberField 
                            label={`J${i+1} Min`} 
                            value={jointLimits[i]?.min ?? -180} 
                            onChange={(v) => setJointLimits(l => l.map((lim, k) => k === i ? {...lim, min: v} : lim))} 
                          />
                          <NumberField 
                            label={`J${i+1} Max`} 
                            value={jointLimits[i]?.max ?? 180} 
                            onChange={(v) => setJointLimits(l => l.map((lim, k) => k === i ? {...lim, max: v} : lim))} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Math Formulas" collapsible defaultOpen={false}>
                <div className="space-y-3">
                   {mode === "FK" && <FKFormula lengths={activeLengths} angles={planarAngles} unit={unit} end={end} />}
                   {mode === "IK" && <IKFormula lengths={activeLengths} target={target} angles={ik.angles} unit={unit} reachable={ik.reachable} />}
                   {mode === "DH" && <DHFormula frames={frames} dhRows={dhRows} step={dhStep} onStep={setDhStep} />}
                </div>
              </Section>

              <Section title="IK Step-by-Step" collapsible defaultOpen={mode === "IK"}>
                <div className="min-h-[400px]">
                  {mode === "IK" ? (
                    <IKWalkthrough 
                      target={target} 
                      lengths={activeLengths} 
                      angles={ik.angles} 
                      unit={unit} 
                      elbowUp={elbowUp}
                      onStepSelect={setActiveWalkthroughStep}
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-center p-6 text-muted-foreground text-[10px] uppercase tracking-widest font-bold">
                      Switch to IK mode for walkthrough
                    </div>
                  )}

                </div>
              </Section>

              <Section title="Teach Pendant" collapsible defaultOpen={false}>
                <TeachPanel
                  waypoints={waypoints}
                  playing={playing}
                  activeIndex={activeIndex}
                  jointCount={linkCount}
                  onTeach={teach}
                  onDelete={(id) => setWaypoints((w) => w.filter((x) => x.id !== id))}
                  onSetMove={(id, m) => setWaypoints((w) => w.map((x) => (x.id === id ? { ...x, move: m } : x)))}
                  onSetSpeed={(id, s) => setWaypoints((w) => w.map((x) => (x.id === id ? { ...x, spd: s } : x)))}
                  onGoto={gotoWaypoint}
                  onPlay={() => setPlaying(true)}
                  onStop={() => setPlaying(false)}
                  onClear={() => setWaypoints([])}
                  onJogJoint={jogJoint}
                  onJogCart={jogCart}
                  onRunDemo={runDemo}
                />
              </Section>

              <Section title="Practice Quiz" collapsible defaultOpen={false}>
                <QuizPanel lengths={activeLengths} angles={planarAngles} onSetTarget={(t) => { setMode("IK"); setTarget(t); }} />
              </Section>

              <Section title="Interactive Learning" collapsible defaultOpen={true}>
                <LessonPanel state={lessonState} activeId={lessonId} onSelect={selectLesson} completed={completed} />
              </Section>

              <Section title="AI Tutor" collapsible defaultOpen={false}>
                <AIPanel state={{ mode, target, lengths: activeLengths, angles: planarAngles, reachable: ik.reachable, ikError: ik.error }} />
              </Section>

              <Section title="Industrial Progress" collapsible defaultOpen={false}>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Robotics Mastery</h4>
                  <Stat label="Completed" value={`${Object.keys(completed).length}/${LESSONS.length}`} />
                </div>
              </Section>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer removed per request */}
    </main>

  );
}

