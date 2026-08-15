import { useEffect, useState } from "react";

export function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"welcome" | "uiverse">("welcome");

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("uiverse");
    }, 3000); // 3 seconds for welcome

    const t2 = setTimeout(() => {
      onComplete();
    }, 8000); // 3s welcome + 5s uiverse loader

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  if (phase === "welcome") {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white text-black">
        {/* Loader Before 8 from Uiverse */}
        <div className="loader-before8 mb-8"></div>
        
        <h1 className="text-4xl font-black uppercase tracking-tighter animate-in fade-in zoom-in duration-700">
          Welcome to
        </h1>
        <h2 className="text-6xl font-black uppercase tracking-widest text-primary animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          Kinematics.SelfStudy
        </h2>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.5em] text-muted-foreground animate-pulse">
          Source are loading...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="main-container">
        <div className="loader-vosoone">
          <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="chipGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2d2d2d"></stop>
                <stop offset="100%" stopColor="#0f0f0f"></stop>
              </linearGradient>
              <linearGradient id="textGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#eeeeee"></stop>
                <stop offset="100%" stopColor="#888888"></stop>
              </linearGradient>
              <linearGradient id="pinGradient" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="#bbbbbb"></stop>
                <stop offset="50%" stopColor="#888888"></stop>
                <stop offset="100%" stopColor="#555555"></stop>
              </linearGradient>
            </defs>
            <g id="traces">
              <path d="M100 100 H200 V210 H326" className="trace-bg"></path>
              <path d="M100 100 H200 V210 H326" className="trace-flow purple"></path>
              <path d="M80 180 H180 V230 H326" className="trace-bg"></path>
              <path d="M80 180 H180 V230 H326" className="trace-flow blue"></path>
              <path d="M60 260 H150 V250 H326" className="trace-bg"></path>
              <path d="M60 260 H150 V250 H326" className="trace-flow yellow"></path>
              <path d="M100 350 H200 V270 H326" className="trace-bg"></path>
              <path d="M100 350 H200 V270 H326" className="trace-flow green"></path>
              <path d="M700 90 H560 V210 H474" className="trace-bg"></path>
              <path d="M700 90 H560 V210 H474" className="trace-flow blue"></path>
              <path d="M740 160 H580 V230 H474" className="trace-bg"></path>
              <path d="M740 160 H580 V230 H474" className="trace-flow green"></path>
              <path d="M720 250 H590 V250 H474" className="trace-bg"></path>
              <path d="M720 250 H590 V250 H474" className="trace-flow red"></path>
              <path d="M680 340 H570 V270 H474" className="trace-bg"></path>
              <path d="M680 340 H570 V270 H474" className="trace-flow yellow"></path>
            </g>
            <rect
              x="330"
              y="190"
              width="140"
              height="100"
              rx="20"
              ry="20"
              fill="url(#chipGradient)"
              stroke="#222"
              strokeWidth="3"
            ></rect>
            <g>
              <rect x="322" y="205" width="8" height="10" fill="url(#pinGradient)" rx="2"></rect>
              <rect x="322" y="225" width="8" height="10" fill="url(#pinGradient)" rx="2"></rect>
              <rect x="322" y="245" width="8" height="10" fill="url(#pinGradient)" rx="2"></rect>
              <rect x="322" y="265" width="8" height="10" fill="url(#pinGradient)" rx="2"></rect>
            </g>
            <g>
              <rect x="470" y="205" width="8" height="10" fill="url(#pinGradient)" rx="2"></rect>
              <rect x="470" y="225" width="8" height="10" fill="url(#pinGradient)" rx="2"></rect>
              <rect x="470" y="245" width="8" height="10" fill="url(#pinGradient)" rx="2"></rect>
              <rect x="470" y="265" width="8" height="10" fill="url(#pinGradient)" rx="2"></rect>
            </g>
            <text
              x="400"
              y="245"
              fontFamily="Arial, sans-serif"
              fontSize="22"
              fill="url(#textGradient)"
              textAnchor="middle"
              dominantBaseline="middle"
              className="chip-text"
            >
              Loading
            </text>
            <circle cx="100" cy="100" r="5" fill="black"></circle>
            <circle cx="80" cy="180" r="5" fill="black"></circle>
            <circle cx="60" cy="260" r="5" fill="black"></circle>
            <circle cx="100" cy="350" r="5" fill="black"></circle>
            <circle cx="700" cy="90" r="5" fill="black"></circle>
            <circle cx="740" cy="160" r="5" fill="black"></circle>
            <circle cx="720" cy="250" r="5" fill="black"></circle>
            <circle cx="680" cy="340" r="5" fill="black"></circle>
          </svg>
        </div>
      </div>
    </div>
  );
}
