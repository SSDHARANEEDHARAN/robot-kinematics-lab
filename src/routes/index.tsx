import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArmView2D } from "@/components/ArmView2D";
import { DHView3D } from "@/components/DHView3D";
import {
  GhostButton,
  NumberField,
  Section,
  SegButton,
  SliderRow,
  Stat,
} from "@/components/LabControls";
import { dhChain, fk2d, ik2d, originOf, type DHRow, type Mat4 } from "@/lib/kinematics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Robot Arm Simulator | Kinematics Lab" },
      {
        name: "description",
        content:
          "Interactive robot arm simulator for learning forward kinematics, analytic inverse kinematics and Denavit-Hartenberg chains in 2D and 3D.",
      },
      { property: "og:title", content: "Robot Arm Simulator | Kinematics Lab" },
      {
        property: "og:description",
        content:
          "Learn robot kinematics by simulation: FK sliders, analytic IK targeting and a live 6-joint DH chain in 3D.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KinematicsLab,
});

type Mode = "IK" | "FK" | "DH";

const DEFAULT_DH: DHRow[] = [
  { theta: 0, d: 80, a: 0, alpha: -90 },
  { theta: 0, d: 0, a: 120, alpha: 0 },
  { theta: 0, d: 0, a: 100, alpha: 0 },
  { theta: 0, d: 80, a: 0, alpha: -90 },
  { theta: 0, d: 0, a: 60, alpha: 90 },
  { theta: 0, d: 40, a: 0, alpha: 0 },
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

  const activeLengths = lengths.slice(0, linkCount);

  const ik = useMemo(
    () => ik2d(activeLengths, target, elbowUp, angles[2] ?? 0),
    [activeLengths.join(), target.x, target.y, elbowUp, angles[2]],
  );

  const planarAngles = mode === "IK" ? ik.angles : angles.slice(0, linkCount);
  const points = useMemo(
    () => fk2d(activeLengths, planarAngles),
    [activeLengths.join(), planarAngles.join()],
  );

  const dhRows = dh.slice(0, jointCount);
  const frames = useMemo(() => dhChain(dhRows), [JSON.stringify(dhRows)]);
  const dhEnd = originOf(frames[frames.length - 1] as Mat4);

  const end = points[points.length - 1] ?? { x: 0, y: 0 };
  const maxReach = activeLengths.reduce((a, b) => a + b, 0);
  const minReach = mode === "IK" ? Math.abs((activeLengths[0] ?? 0) - (activeLengths[1] ?? 0)) : 0;
  const dhReach = dhRows.reduce((s, r) => s + Math.abs(r.a) + Math.abs(r.d), 0);

  const outputAngles =
    mode === "DH" ? dhRows.map((r) => r.theta) : planarAngles.concat(linkCount < 3 ? [0] : []);

  const setLength = (i: number, v: number) =>
    setLengths((l) => l.map((x, k) => (k === i ? v : x)));
  const setAngle = (i: number, v: number) => setAngles((a) => a.map((x, k) => (k === i ? v : x)));
  const setDhCell = (i: number, key: keyof DHRow, v: number) =>
    setDh((rows) => rows.map((r, k) => (k === i ? { ...r, [key]: v } : r)));

  const headline =
    mode === "IK"
      ? { title: "Inverse Kinematics", sub: "Analytic 2-link" }
      : mode === "FK"
        ? { title: "Forward Kinematics", sub: "Joint angle solve" }
        : {
            title: "DH Forward Kinematics",
            sub: `${jointCount}-joint DH chain — Drag to rotate, scroll to zoom`,
          };

  const solverText =
    mode === "IK"
      ? "Analytic inverse kinematics"
      : mode === "FK"
        ? "Forward kinematics"
        : "Forward kinematics using DH convention (3D)";

  return (
    <main className="min-h-screen px-4 pb-16 pt-6 md:px-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-widest text-brand">
            Kinematics Lab
          </p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Robot Arm Simulator
          </h1>
        </div>
        <div className="lab-card flex items-center gap-2 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-link-3" />
          <span className="text-sm font-semibold text-foreground">
            {mode === "IK" && !ik.reachable ? "Out of reach" : "Ready"}
          </span>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_290px]">
        {/* ---------- Left: controls ---------- */}
        <aside className="lab-card h-fit">
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
                    <>
                      <span key={`n${i}`} className="self-center text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      {(["theta", "d", "a", "alpha"] as const).map((k) => (
                        <input
                          key={`${i}-${k}`}
                          type="number"
                          value={r[k]}
                          onChange={(e) => setDhCell(i, k, Number(e.target.value))}
                          className={`lab-input px-1 text-center text-sm ${k === "theta" ? "text-primary" : ""}`}
                        />
                      ))}
                    </>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  theta = joint variable. d, a, alpha = fixed constants.
                </p>
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
                  <GhostButton
                    onClick={() =>
                      setDh((rows) =>
                        rows.map((r, i) => ({ ...r, theta: [30, -40, 60, 0, -50, 20][i] ?? 0 })),
                      )
                    }
                  >
                    Reach
                  </GhostButton>
                  <GhostButton
                    onClick={() =>
                      setDh((rows) =>
                        rows.map((r, i) => ({ ...r, theta: [0, -90, 120, 0, -30, 0][i] ?? 0 })),
                      )
                    }
                  >
                    Fold
                  </GhostButton>
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
                    <NumberField
                      label="L3"
                      value={lengths[2] ?? 0}
                      onChange={(v) => setLength(2, v)}
                    />
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
                <Section
                  title="Target"
                  aside={
                    <button
                      className="font-semibold text-primary"
                      onClick={() => setTarget({ x: 0, y: 0 })}
                    >
                      Center
                    </button>
                  }
                >
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField label="X" value={target.x} onChange={(v) => setTarget((t) => ({ ...t, x: v }))} />
                    <NumberField label="Y" value={target.y} onChange={(v) => setTarget((t) => ({ ...t, y: v }))} />
                  </div>
                  <div className="mt-3">
                    <SegButton
                      options={[
                        { value: "down", label: "Elbow down" },
                        { value: "up", label: "Elbow up" },
                      ]}
                      value={elbowUp ? "up" : "down"}
                      onChange={(v) => setElbowUp(v === "up")}
                    />
                  </div>
                </Section>
              )}

              <Section title="Presets">
                <div className="grid grid-cols-2 gap-2">
                  <GhostButton
                    onClick={() => {
                      setAngles([20, 20, 10]);
                      setTarget({ x: 120, y: 90 });
                    }}
                  >
                    Inspect
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      setAngles([10, 5, 0]);
                      setTarget({ x: maxReach - 10, y: 0 });
                    }}
                  >
                    Reach
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      setAngles([90, 150, -120]);
                      setTarget({ x: 40, y: 40 });
                    }}
                  >
                    Fold
                  </GhostButton>
                  <GhostButton
                    onClick={() => {
                      setAngles([0, 0, 0]);
                      setTarget({ x: 100, y: 30 });
                      setLengths([120, 100, 80]);
                    }}
                  >
                    Reset
                  </GhostButton>
                </div>
              </Section>
            </>
          )}
        </aside>

        {/* ---------- Center: viewport ---------- */}
        <section className="lab-card overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-5 py-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                {headline.title}
              </h2>
              <p className="text-sm text-muted-foreground">{headline.sub}</p>
            </div>
            {mode !== "DH" && (
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={showZone}
                  onChange={(e) => setShowZone(e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Reach zone
              </label>
            )}
          </div>
          <div className="h-[560px] border-t border-border bg-panel">
            {mode === "DH" ? (
              <DHView3D frames={frames} />
            ) : (
              <ArmView2D
                points={points}
                lengths={activeLengths}
                showZone={showZone}
                target={mode === "IK" ? target : null}
                onTargetChange={mode === "IK" ? setTarget : undefined}
              />
            )}
          </div>
        </section>

        {/* ---------- Right: readouts ---------- */}
        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="End X" value={(mode === "DH" ? dhEnd.x : end.x).toFixed(1)} />
            <Stat label="End Y" value={(mode === "DH" ? dhEnd.y : end.y).toFixed(1)} />
            {mode === "DH" && <Stat label="End Z" value={dhEnd.z.toFixed(1)} />}
            <Stat label="Error" value={(mode === "IK" ? ik.error : 0).toFixed(1)} />
            <Stat
              label="Reach"
              value={mode === "DH" ? `0-${dhReach}` : `${Math.round(minReach)}-${Math.round(maxReach)}`}
            />
          </div>

          <div className="lab-card px-4 py-3">
            <h3 className="mb-2 text-base font-extrabold text-foreground">Joint Output</h3>
            <dl className="divide-y divide-border">
              {outputAngles.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <dt className="text-sm text-muted-foreground">theta {i + 1}</dt>
                  <dd className="text-sm font-bold text-foreground">{a.toFixed(1)} deg</dd>
                </div>
              ))}
            </dl>
          </div>

          {mode === "DH" && (
            <div className="lab-card px-4 py-3">
              <h3 className="mb-2 text-base font-extrabold text-foreground">
                End-Effector Transform
              </h3>
              <div className="overflow-x-auto rounded-md bg-secondary p-3 font-mono text-xs">
                {[0, 1, 2, 3].map((r) => (
                  <div key={r} className="flex gap-4 whitespace-nowrap py-0.5">
                    {[0, 1, 2, 3].map((c) => (
                      <span key={c} className="w-12 text-right text-secondary-foreground">
                        {((frames[frames.length - 1] as Mat4)[r * 4 + c] ?? 0).toFixed(2)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="lab-card px-4 py-3">
            <h3 className="mb-1 text-base font-extrabold text-foreground">Solver</h3>
            <p className="text-sm text-muted-foreground">{solverText}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
