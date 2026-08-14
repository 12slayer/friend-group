import React, { useMemo } from "react";

// Deterministic-ish random star field: generated once per mount via useMemo,
// so stars don't jump around on re-render.
function useStars(count) {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 1.6 + 0.8,
      delay: Math.random() * 4,
      duration: Math.random() * 2 + 2,
    }));
  }, [count]);
}

// orbit radius (px), planet size (px), color, orbit duration (s)
const PLANETS = [
  { name: "Mercury", radius: 34, size: 6, color: "#B7B0A8", duration: 6 },
  { name: "Venus", radius: 50, size: 9, color: "#E8C27A", duration: 10 },
  { name: "Earth", radius: 68, size: 10, color: "#4FA3E3", duration: 15 },
  { name: "Mars", radius: 86, size: 8, color: "#E1633D", duration: 20 },
  { name: "Jupiter", radius: 108, size: 16, color: "#E0A667", duration: 28 },
  { name: "Saturn", radius: 132, size: 14, color: "#E7D3A1", duration: 36, ring: true },
  { name: "Uranus", radius: 152, size: 11, color: "#7FDBD4", duration: 44 },
  { name: "Neptune", radius: 170, size: 11, color: "#5B6EE1", duration: 52 },
];

const Footer = () => {
  const stars = useStars(50);

  return (
    <footer className="relative bg-[#0B0F2B] text-gray-300 overflow-hidden">
      <div className="star-field">
        {stars.map((s) => (
          <span
            key={s.id}
            className="star"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-6 flex flex-col items-center gap-6">
        <div className="solar-system" aria-hidden="true">
          <div className="sun" />
          {PLANETS.map((p) => (
            <div
              key={p.name}
              className="orbit"
              style={{
                width: `${p.radius * 2}px`,
                height: `${p.radius * 2}px`,
                animationDuration: `${p.duration}s`,
              }}
            >
              <div
                className={`planet ${p.ring ? "planet--ring" : ""}`}
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  background: p.color,
                  boxShadow: `0 0 6px 1px ${p.color}88`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <span className="font-bold text-white tracking-wide">PERN Auth</span>
          <p className="text-sm text-gray-400">
            Built with Postgres, Express, React &amp; Node.
          </p>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} PERN Auth. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        .star-field {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .star {
          position: absolute;
          border-radius: 9999px;
          background: #ffffff;
          opacity: 0.5;
          animation-name: twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.85); }
          50% { opacity: 0.95; transform: scale(1.15); }
        }

        .solar-system {
          position: relative;
          width: 360px;
          height: 360px;
          max-width: 90vw;
          max-height: 90vw;
        }
        .sun {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: radial-gradient(circle at 35% 35%, #FFF3B0, #FFB347 55%, #FF7A1A 100%);
          box-shadow: 0 0 16px 5px rgba(255, 179, 71, 0.7), 0 0 40px 14px rgba(255, 122, 26, 0.35);
          transform: translate(-50%, -50%);
          animation: sun-pulse 3s ease-in-out infinite;
        }
        @keyframes sun-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.15); }
        }

        .orbit {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 1px dashed rgba(255, 255, 255, 0.12);
          border-radius: 9999px;
          transform: translate(-50%, -50%) rotate(0deg);
          animation-name: orbit-spin;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes orbit-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .planet {
          position: absolute;
          top: 0;
          left: 50%;
          border-radius: 9999px;
          transform: translate(-50%, -50%);
        }
        .planet--ring::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 220%;
          height: 220%;
          border: 1.5px solid rgba(231, 211, 161, 0.75);
          border-radius: 9999px;
          transform: translate(-50%, -50%) rotate(-20deg) scaleY(0.35);
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .star, .sun, .orbit { animation: none; opacity: 0.6; }
        }
      `}</style>
    </footer>
  );
};

export default Footer;