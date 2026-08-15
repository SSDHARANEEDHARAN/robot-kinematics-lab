import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
import { LESSONS, LessonPanel, type Lesson } from "@/components/LessonPanel";
import { QuizPanel } from "@/components/QuizPanel";
import { TeachPanel } from "@/components/TeachPanel";
import {
  det2x2,
  dhChain,
  fk2d,
  ik2d,
  jacobian2d,
  originOf,
  workspaceSweep,
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
} from "@/lib/lab";

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
type Tab = "math" | "teach" | "quiz" | "lessons" | "ai" | "industrial" | "progress";

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
  { value: "teach", label: "Teach" },
  { value: "quiz", label: "Quiz" },
  { value: "ai", label: "AI Tutor" },
  { value: "lessons", label: "Lessons" },
  { value: "industrial", label: "Industrial" },
  { value: "progress", label: "Stats" },
];

function KinematicsLab() {
  const [mode, setMode] = useState<Mode>("IK");
  const [linkCount, setLinkCount] = useState(2);
  const [lengths, setLengths] = useState([120, 100, 80]);
  const [angles, setAngles] = useState([20, 20, 10]);
  const [target, setTarget] = useState({ x: 100, y: 30 });
  const [elbowUp, setElbowUp] = useState(false);
  const [showZone, setShowZone] = useState(true);
  const [dh, setDh] = useState<DHRow[]>(DEFAULT_DH);
  const [jointCount, setJointCount] = useState(6);

  const [unit, setUnit] = useState<"deg" | "rad">("deg");
  const [tab, setTab] = useState<Tab>("math");
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
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showVelocity, setShowVelocity] = useState(false);

  const activeLengths = lengths.slice(0, linkCount);

  /* ---------- shared preset link ---------- */
  useEffect(() => {
    const p = readPresetFromLocation();
    if (!p) return;
    if (p.mode) setMode(p.mode as Mode);
    if (p.linkCount) setLinkCount(p.linkCount);
    if (p.lengths) setLengths(p.lengths);
    if (p.angles) setAngles(p.angles);
    if (p.target) setTarget(p.target);
    if (typeof p.elbowUp === "boolean") setElbowUp(p.elbowUp);
    if (p.dh) setDh(p.dh);
    if (p.jointCount) setJointCount(p.jointCount);
    if (p.waypoints) setWaypoints(p.waypoints);
  }, []);

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
      setShareMsg("Link copied");
    } catch {
      setShareMsg("Link in address bar");
    }
    setTimeout(() => setShareMsg(""), 2500);
  };

  /* ---------- kinematics ---------- */
  const ik = useMemo(
    () => ik2d(activeLengths, target, elbowUp, angles[2] ?? 0),
    [activeLengths.join(), target.x, target.y, elbowUp, angles[2]],
  );
  const ikGhost = useMemo(
    () => ik2d(activeLengths, target, !elbowUp, angles[2] ?? 0),
    [activeLengths.join(), target.x, target.y, elbowUp, angles[2]],
  );

  const planarAngles = mode === "IK" ? ik.angles : angles.slice(0, linkCount);
  const points = useMemo(
    () => fk2d(activeLengths, planarAngles),
    [activeLengths.join(), planarAngles.join()],
  );
  const ghostPoints = useMemo(
    () => fk2d(activeLengths, ikGhost.angles),
    [activeLengths.join(), ikGhost.angles.join()],
  );

  const dhRows = dh.slice(0, jointCount);
  const frames = useMemo(() => dhChain(dhRows), [JSON.stringify(dhRows)]);
  const dhEnd = originOf(frames[frames.length - 1] as Mat4);

  const jacobian = useMemo(
    () => jacobian2d(activeLengths, planarAngles),
    [activeLengths.join(), planarAngles.join()],
  );
  const manipulability = Math.abs(det2x2(jacobian));
  const isSingular = manipulability < 5000;

  const workspace = useMemo(
    () => (showWorkspace ? workspaceSweep(activeLengths) : []),
    [activeLengths.join(), showWorkspace],
  );

  const velocity = useMemo(() => {
    if (!showVelocity || mode === "DH") return undefined;
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
    setAngles((a) => a.map((v, k) => (k === i ? Math.max(-180, Math.min(180, v + delta)) : v)));
  };
  const jogCart = (axis: "x" | "y", delta: number) => {
    if (mode === "FK") {
      setMode("IK");
      setTarget({ x: end.x + (axis === "x" ? delta : 0), y: end.y + (axis === "y" ? delta : 0) });
      return;
    }
    setTarget((t) => ({ ...t, [axis]: Math.round((t[axis] + delta) * 10) / 10 }));
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
    if (l.setup?.mode) setMode(l.setup.mode as Mode);
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

  return (
    <main className="min-h-screen px-4 pb-16 pt-6 md:px-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold uppercase tracking-widest text-brand">
              Kinematics Lab
            </p>
            <span className="text-[10px] font-bold text-muted-foreground opacity-60">
              PRESENT BY THARANEETHARAN SS
            </span>
          </div>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Robot Kinematics Virtual Lab
          </h1>
          <div className="mt-2 group relative">
            <span className="cursor-help text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              [System Info]
            </span>
            <div className="absolute left-0 top-full z-50 mt-2 hidden w-80 rounded-lg border border-border bg-card p-4 text-[10px] leading-relaxed text-muted-foreground shadow-xl group-hover:block">
              '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
              {"\n\n"}
              MODE PERAMETRAS ALL ARE POPUP TYPE IF I POINT IT WILL POPUP AND LIST THE SETTING I CAN SCRROL INSIDE OF POP UP 3D SIMULATION PLACE IS FIXED DONT SCROOL OTHER SIDE IT WILL SHOW ALWASY INSIDE OF THAT IT WILL SCROOLLABLE AND ALSO DOWN OF PRESENT BY THARANEETHARAN SS DOWN OF AND ALSO 6 OR 5 OR 4 OR 3 OR 3 OR 1 THE JI POINT IS FIXXED POSIITION ONLY THER IS NO CHNAGES IN IT AND ALSO SIMULATION PLACE MAKE A RELASTIC ROBOT NOW THIS IS JUST A SKETCH BUT I NEED REALSITC ROBOT BASED DESING
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegButton
            options={[
              { value: "deg", label: "deg" },
              { value: "rad", label: "rad" },
            ]}
            value={unit}
            onChange={(v) => setUnit(v as "deg" | "rad")}
          />
          <button
            onClick={share}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            {shareMsg || "Share preset"}
          </button>
          <div className="lab-card flex items-center gap-2 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-link-3" />
            <span className="text-sm font-semibold text-foreground">
              {mode === "IK" && !ik.reachable ? "Out of reach" : playing ? "Running" : "Ready"}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[200px_minmax(0,1fr)_340px]">
        {/* ---------- Left: popups ---------- */}
        <aside className="space-y-3">
          <div className="group relative">
            <button className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold transition-all hover:border-brand hover:text-brand">
              <span>Robot Settings</span>
              <span className="text-xs opacity-50">▼</span>
            </button>
            <div className="absolute left-full top-0 z-50 ml-2 hidden w-72 max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl group-hover:block">
              <div className="lab-card border-none shadow-none">
                <Section title="Mode">
                  <SegButton
                    options={[
                      { value: "IK", label: "IK" },
                      { value: "FK", label: "FK" },
                      { value: "DH", label: "DH" },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as Mode)}
                  />
                </Section>
                {mode === "DH" ? (
                  <>
                    <Section title="Joints">
                      <div className="flex items-center justify-center gap-0 rounded-lg border border-border">
                        <button
                          className="px-4 py-2 text-lg font-bold text-primary"
                          onClick={() => setJointCount((c) => Math.max(2, c - 1))}
                        >
                          -
                        </button>
                        <span className="min-w-12 border-x border-border px-4 py-2 text-center text-lg font-extrabold">
                          {jointCount}
                        </span>
                        <button
                          className="px-4 py-2 text-lg font-bold text-primary"
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
                            <span className="self-center text-xs font-bold text-primary">{i + 1}</span>
                            {(["theta", "d", "a", "alpha"] as const).map((k) => (
                              <input
                                key={`${i}-${k}`}
                                type="number"
                                value={r[k]}
                                onChange={(e) => setDhCell(i, k, Number(e.target.value))}
                                className={`lab-input px-1 text-center text-sm ${k === "theta" ? "text-primary" : ""}`}
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
                    <Section title="Links">
                      <SegButton
                        stacked
                        options={[
                          { value: "2", label: "2 Links" },
                          { value: "3", label: "3 Links" },
                        ]}
                        value={String(linkCount)}
                        onChange={(v) => setLinkCount(Number(v))}
                      />
                    </Section>
                    <Section title="Link Lengths" aside="px">
                      <div className="grid grid-cols-2 gap-3">
                        <NumberField label="L1" value={lengths[0] ?? 0} onChange={(v) => setLength(0, v)} />
                        <NumberField label="L2" value={lengths[1] ?? 0} onChange={(v) => setLength(1, v)} />
                        {linkCount > 2 && (
                          <NumberField label="L3" value={lengths[2] ?? 0} onChange={(v) => setLength(2, v)} />
                        )}
                      </div>
                    </Section>
                    {mode === "FK" ? (
                      <Section title="Joint Angles">
                        <div className="space-y-2.5">
                          {Array.from({ length: linkCount }).map((_, i) => (
                            <SliderRow
                              key={i}
                              label={`theta ${i + 1}`}
                              min={-180}
                              max={180}
                              value={angles[i] ?? 0}
                              onChange={(v) => setAngle(i, v)}
                            />
                          ))}
                        </div>
                      </Section>
                    ) : (
                      <Section title="Target">
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
                    <Section title="Presets">
                      <div className="grid grid-cols-2 gap-2">
                        <GhostButton onClick={() => setAngles([0,0,0])}>Reset</GhostButton>
                      </div>
                    </Section>
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- Center: viewport ---------- */}
        <section className="lab-card overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                {headline.title}
              </h2>
              <p className="text-sm text-muted-foreground">{headline.sub}</p>
            </div>
          </div>
          <div className="h-[560px] border-t border-border bg-panel overflow-hidden relative">
             {/* Realistic fixed simulation area */}
            {mode === "DH" ? (
              <DHView3D frames={frames} />
            ) : (
              <ArmView2D
                points={points}
                lengths={activeLengths}
                showZone={showZone}
                target={mode === "IK" ? target : null}
                onTargetChange={mode === "IK" && !pathMode && !playing ? setTarget : undefined}
                ghostPoints={mode === "IK" && showGhost ? ghostPoints : undefined}
                trace={showTrace ? trace : undefined}
                path={waypoints.map((w) => w.target)}
                workspace={workspace}
                velocity={velocity}
              />
            )}
          </div>
        </section>

        {/* ---------- Right: readouts + tools ---------- */}
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="End X" value={(mode === "DH" ? dhEnd.x : end.x).toFixed(1)} />
            <Stat label="End Y" value={(mode === "DH" ? dhEnd.y : end.y).toFixed(1)} />
            {mode === "DH" && <Stat label="End Z" value={dhEnd.z.toFixed(1)} />}
            <Stat label="Error" value={(mode === "IK" ? ik.error : 0).toFixed(1)} />
          </div>

          <div className="lab-card overflow-hidden">
            <div className="border-b border-border px-3 py-3">
              <SegButton
                options={TABS.map((t) => ({ value: t.value, label: t.label }))}
                value={tab}
                onChange={(v) => setTab(v as Tab)}
              />
            </div>
            <div className="px-4 py-4 max-h-[500px] overflow-y-auto">
              {tab === "math" && (
                <div className="space-y-3">
                   {mode === "FK" && <FKFormula lengths={activeLengths} angles={planarAngles} unit={unit} end={end} />}
                   {mode === "IK" && <IKFormula lengths={activeLengths} target={target} angles={ik.angles} unit={unit} reachable={ik.reachable} />}
                   {mode === "DH" && <DHFormula frames={frames} step={dhStep} onStep={setDhStep} />}
                </div>
              )}
              {tab === "teach" && (
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
                />
              )}
              {tab === "quiz" && <QuizPanel lengths={activeLengths} angles={planarAngles} onSetTarget={(t) => { setMode("IK"); setTarget(t); }} />}
              {tab === "lessons" && <LessonPanel state={lessonState} activeId={lessonId} onSelect={selectLesson} completed={completed} />}
              {tab === "ai" && <div className="h-[400px]"><AIPanel state={{ mode, target, lengths: activeLengths, angles: planarAngles, reachable: ik.reachable, ikError: ik.error }} /></div>}
              {tab === "progress" && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-brand">Robotics Mastery</h4>
                  <Stat label="Completed" value={`${Object.keys(completed).length}/${LESSONS.length}`} />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
