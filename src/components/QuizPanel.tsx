import { useState } from "react";
import { fk2d, type Vec2 } from "@/lib/kinematics";

type Challenge = { target: Vec2; startedAt: number };

function randomTarget(lengths: number[]): Vec2 {
  const max = lengths.reduce((a, b) => a + b, 0);
  const min = Math.abs((lengths[0] ?? 0) - (lengths[1] ?? 0));
  const r = min + Math.random() * (max - min) * 0.9;
  const a = (Math.random() * 2 - 1) * Math.PI;
  return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
}

export function QuizPanel({
  lengths,
  angles,
  onSetTarget,
}: {
  lengths: number[];
  angles: number[];
  onSetTarget: (t: Vec2) => void;
}) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [result, setResult] = useState<{ error: number; secs: number; score: number } | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [predict, setPredict] = useState({ x: "", y: "" });
  const [predictResult, setPredictResult] = useState<string | null>(null);

  const start = () => {
    const target = randomTarget(lengths);
    setChallenge({ target, startedAt: Date.now() });
    setResult(null);
  };

  const submit = () => {
    if (!challenge) return;
    const pts = fk2d(lengths, angles);
    const tip = pts[pts.length - 1] ?? { x: 0, y: 0 };
    const error = Math.hypot(tip.x - challenge.target.x, tip.y - challenge.target.y);
    const secs = (Date.now() - challenge.startedAt) / 1000;
    const max = lengths.reduce((a, b) => a + b, 0);
    const acc = Math.max(0, 1 - error / (max * 0.25));
    const score = Math.round(acc * 100 * Math.max(0.4, 1 - secs / 120));
    setResult({ error, secs, score });
    setHistory((h) => [...h, score]);
  };

  const fkTip = (() => {
    const pts = fk2d(lengths, angles);
    return pts[pts.length - 1] ?? { x: 0, y: 0 };
  })();

  const checkPredict = () => {
    const dx = Number(predict.x) - fkTip.x;
    const dy = Number(predict.y) - fkTip.y;
    const err = Math.hypot(dx, dy);
    setPredictResult(
      `Actual: (${fkTip.x.toFixed(1)}, ${fkTip.y.toFixed(1)}) — error ${err.toFixed(2)} px · accuracy ${(
        Math.max(0, 1 - err / 50) * 100
      ).toFixed(1)}%`,
    );
  };

  const avg = history.length ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="lab-label">Target challenge</h4>
        {challenge ? (
          <>
            <p className="font-mono text-xs text-secondary-foreground">
              Reach ({challenge.target.x}, {challenge.target.y}) — set joint angles by hand, then submit.
            </p>
            <div className="flex gap-2">
              <button
                className="border-2 border-foreground bg-foreground px-3 py-2 text-sm font-black uppercase tracking-widest text-background shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                onClick={submit}
              >
                Submit
              </button>
              <button
                className="border-2 border-foreground bg-background px-3 py-2 text-sm font-black uppercase tracking-widest text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                onClick={() => onSetTarget(challenge.target)}
              >
                Show target
              </button>
              <button className="border-2 border-foreground bg-background px-3 py-2 text-sm font-black uppercase tracking-widest text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]" onClick={start}>
                New
              </button>
            </div>
          </>
        ) : (
          <button
            className="border-2 border-foreground bg-foreground px-3 py-2 text-sm font-black uppercase tracking-widest text-background shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            onClick={start}
          >
            Start challenge
          </button>
        )}
        {result && (
          <div className="rounded-lg border border-border p-2 font-mono text-xs">
            <div>error: {result.error.toFixed(2)} px</div>
            <div>time: {result.secs.toFixed(1)} s</div>
            <div className="font-bold text-primary">score: {result.score}/100</div>
          </div>
        )}
        {history.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {history.length} attempts · average score {avg}
          </p>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <h4 className="lab-label">Predict the FK result</h4>
        <p className="font-mono text-[11px] text-muted-foreground">
          L = [{lengths.map((l) => l.toFixed(0)).join(", ")}] · θ = [
          {angles.map((a) => a.toFixed(0)).join(", ")}]
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="lab-input"
            placeholder="X"
            value={predict.x}
            onChange={(e) => setPredict((p) => ({ ...p, x: e.target.value }))}
          />
          <input
            className="lab-input"
            placeholder="Y"
            value={predict.y}
            onChange={(e) => setPredict((p) => ({ ...p, y: e.target.value }))}
          />
        </div>
        <button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold" onClick={checkPredict}>
          Check my answer
        </button>
        {predictResult && <p className="font-mono text-xs text-primary">{predictResult}</p>}
      </div>
    </div>
  );
}
