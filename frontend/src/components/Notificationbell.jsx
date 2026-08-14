import { useEffect, useState, useCallback } from "react";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notificationsApi";
import { socket } from "../socket";
import UserHoverAvatar from "./UserHoverAvatar";

const API_ORIGIN = "http://localhost:5000";

const TYPE_ICON = { like: "❤️", comment: "💬", message: "✉️" };

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.count);
    } catch {
      // silently ignore — badge just won't update this cycle
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshCount();
  }, [user, refreshCount]);

  // live push: bump the badge and prepend to the list the moment something happens
  useEffect(() => {
    if (!user) return;

    function handleNew(notification) {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [notification, ...prev]);
    }

    socket.on("new_notification", handleNew);
    return () => socket.off("new_notification", handleNew);
  }, [user]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      try {
        const data = await getNotifications();
        setNotifications(data);
        setLoaded(true);
      } catch {
        // ignore
      }
    }
  }

  async function handleMarkAllRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // ignore — worst case badge is slightly stale until next refresh
    }
  }

  async function handleClickOne(n) {
    if (!n.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
      try {
        await markNotificationRead(n.id);
      } catch {
        // ignore
      }
    }
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={toggleOpen} className="relative px-1.5 py-1 text-lg" aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-72 max-h-96 overflow-y-auto bg-white text-gray-900 border border-gray-200 rounded-xl shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-gray-400 p-3">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickOne(n)}
                className={`w-full text-left flex items-start gap-2 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition ${
                  n.is_read ? "" : "bg-indigo-50/50"
                }`}
              >
                <UserHoverAvatar
                  userId={n.actor_id}
                  name={n.actor_name}
                  image={n.actor_image}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-800">
                    {TYPE_ICON[n.type]} {n.content}
                  </p>
                  <span className="text-[10px] text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}