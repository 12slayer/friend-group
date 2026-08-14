import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { getProfile } from "../api/profile";
import NotificationBell from "./NotificationBell";

const API_ORIGIN = "http://localhost:5000"; // backend serves /uploads statically from here

// small star field for the galaxy backdrop
function useStars(count) {
  return useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 1.6 + 0.7,
      delay: Math.random() * 4,
      duration: Math.random() * 2 + 2,
    }));
  }, [count]);
}

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(null);
  const stars = useStars(45);

  useEffect(() => {
    if (!user) {
      setAvatar(null);
      return;
    }

    // fetch the profile just to grab the image; ignore 404 (no profile yet)
    getProfile()
      .then((data) => setAvatar(data?.image ? `${API_ORIGIN}${data.image}` : null))
      .catch(() => setAvatar(null));
  }, [user]);

  const handleLogout = async () => {
    await axios.post("/api/auth/logout");
    setUser(null);
    navigate("/");
  };

  return (
    <nav className="relative text-white galaxy-nav">
      <div className="galaxy-bg" aria-hidden="true">
        <div className="galaxy-swirl" />
        {stars.map((s) => (
          <span
            key={s.id}
            className="galaxy-star"
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

      <div className="relative max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <Link to="/" className="font-bold text-xl flex items-center gap-3">
          <span className="moon-wrap">
            <svg
              className="moon-glow"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 1 0 11 11Z"
                fill="#F4E9C1"
              />
            </svg>
          </span>
          Friend Group
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/notes" className="mx-2">
                Notes
              </Link>
              <Link to="/profile" className="mx-2">
                Profile
              </Link>
              <Link to="/chat" className="mx-2">
                Chat
              </Link>
              <NotificationBell user={user} />
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border border-gray-400"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-xs">
                  {user.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <span className="text-gray-300 text-sm">Hi, {user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-gray-700/80 hover:bg-gray-600 px-3 py-1.5 rounded transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mx-2">
                Login
              </Link>
              <Link to="/register" className="mx-2">
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        .galaxy-nav {
          background: radial-gradient(ellipse at 20% 30%, rgba(123, 74, 226, 0.55), transparent 55%),
                      radial-gradient(ellipse at 80% 70%, rgba(64, 145, 226, 0.45), transparent 55%),
                      radial-gradient(ellipse at 50% 50%, rgba(226, 74, 158, 0.25), transparent 60%),
                      #0B0F2B;
        }
        .galaxy-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .galaxy-swirl {
          position: absolute;
          top: -60%;
          left: -20%;
          width: 140%;
          height: 220%;
          background: conic-gradient(from 180deg at 50% 50%,
            rgba(123, 74, 226, 0.35),
            rgba(64, 145, 226, 0.2),
            rgba(226, 74, 158, 0.3),
            rgba(123, 74, 226, 0.35));
          filter: blur(30px);
          opacity: 0.55;
          animation: swirl-rotate 30s linear infinite;
        }
        @keyframes swirl-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .galaxy-star {
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

        .moon-wrap {
          display: inline-flex;
          animation: moon-float 4s ease-in-out infinite;
        }
        .moon-glow {
          filter: drop-shadow(0 0 4px rgba(244, 233, 193, 0.7))
                  drop-shadow(0 0 8px rgba(244, 233, 193, 0.35));
          animation: moon-pulse 3s ease-in-out infinite;
        }
        @keyframes moon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes moon-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 4px rgba(244, 233, 193, 0.7))
                    drop-shadow(0 0 8px rgba(244, 233, 193, 0.35));
          }
          50% {
            filter: drop-shadow(0 0 6px rgba(244, 233, 193, 0.9))
                    drop-shadow(0 0 14px rgba(244, 233, 193, 0.5));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .moon-wrap, .moon-glow, .galaxy-swirl, .galaxy-star { animation: none; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;