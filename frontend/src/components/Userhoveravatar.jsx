import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPublicProfile } from "../api/profile";

const API_ORIGIN = "http://localhost:5000";

// Renders an avatar (image or initial-circle fallback). On hover, fetches
// that user's public profile and shows a popover via a portal to
// document.body — so it's positioned with `fixed` coords and can never be
// clipped by an ancestor's overflow-hidden, no matter where this is used
// (comment lists, likers lists, chat, notifications, etc).
export default function UserHoverAvatar({ userId, name, image, size = 24 }) {
  const anchorRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  function handleEnter() {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left });
    }
    setHovering(true);

    if (!userId) {
      // eslint-disable-next-line no-console
      console.error("UserHoverAvatar rendered without a valid userId. name:", name);
      setLoadError("Profile unavailable.");
      return;
    }

    if (profile || loading) return; // already have it, or already fetching

    setLoading(true);
    setLoadError("");
    getPublicProfile(userId)
      .then((data) => setProfile(data))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }

  const popover = hovering && (
    <div
      className="fixed z-[9999] w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-left"
      style={{ top: coords.top, left: coords.left }}
    >
      {loading ? (
        <p className="text-xs text-gray-400">Loading...</p>
      ) : loadError ? (
        <p className="text-xs text-red-500">{loadError}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {profile?.image ? (
              <img
                src={`${API_ORIGIN}${profile.image}`}
                alt={profile.name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                {(profile?.full_name || profile?.name)?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {profile?.full_name || profile?.name}
              </p>
              {profile?.full_name && profile?.name && (
                <p className="text-[10px] text-gray-400 truncate">{profile.name}</p>
              )}
            </div>
          </div>
          {profile?.bio && (
            <p className="text-[11px] text-gray-600 mt-1 whitespace-pre-wrap">{profile.bio}</p>
          )}
          {profile?.phone && <p className="text-[11px] text-gray-500">📞 {profile.phone}</p>}
          {profile?.address && <p className="text-[11px] text-gray-500">📍 {profile.address}</p>}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={anchorRef}
      className="relative inline-block flex-shrink-0"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovering(false)}
    >
      {image ? (
        <img
          src={`${API_ORIGIN}${image}`}
          alt={name}
          style={{ width: size, height: size }}
          className="rounded-full object-cover cursor-pointer"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 cursor-pointer"
        >
          {name?.[0]?.toUpperCase() || "?"}
        </div>
      )}

      {hovering && createPortal(popover, document.body)}
    </div>
  );
}