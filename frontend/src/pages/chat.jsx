import { useEffect, useState, useCallback, useRef } from "react";
import {
  getConversations,
  getAllUsers,
  getMessages,
  sendMessage,
} from "../api/Messageapi";
import { socket } from "../socket";
import UserHoverAvatar from "../components/UserHoverAvatar";

const API_ORIGIN = "http://localhost:5000";

export default function Chat({ user }) {
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [activeUser, setActiveUser] = useState(null); // { id, name, image }
  const [thread, setThread] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // connect the shared socket once we know who's logged in
  useEffect(() => {
    if (!user) return;
    socket.connect();
    return () => socket.disconnect();
  }, [user]);

  // listen for live incoming messages
  useEffect(() => {
    function handleIncoming(message) {
      const otherId =
        message.sender_id === user.id ? message.receiver_id : message.sender_id;

      // update the open thread if it's the active conversation
      setActiveUser((current) => {
        if (current && String(current.id) === String(otherId)) {
          setThread((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message]
          );
        }
        return current;
      });

      // refresh the conversation list so last-message/unread counts update
      loadConversations();
    }

    socket.on("receive_message", handleIncoming);
    return () => socket.off("receive_message", handleIncoming);
  }, [user, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  async function openConversation(otherUser) {
    if (!otherUser?.id) {
      console.error("openConversation called without a valid id:", otherUser);
      setError("Couldn't open that conversation (missing user id).");
      return;
    }
    setActiveUser(otherUser);
    setShowNewChat(false);
    try {
      setError("");
      const data = await getMessages(otherUser.id);
      setThread(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openNewChatPicker() {
    setShowNewChat(true);
    if (allUsers.length === 0) {
      try {
        const data = await getAllUsers();
        setAllUsers(data);
      } catch (err) {
        setError(err.message);
      }
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || !activeUser) return;

    try {
      setError("");
      // Don't append the message here — the backend echoes it back to us
      // over the socket (emitToUser(senderId, ...)), and the dedupe-by-id
      // guard in handleIncoming will add it exactly once. Appending it
      // here too was causing duplicate bubbles.
      await sendMessage(activeUser.id, text.trim());
      setText("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-16">
      <h1 className="text-2xl font-semibold mb-5 text-gray-900">Chat</h1>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="flex border border-gray-200 rounded-xl overflow-hidden" style={{ height: "60vh" }}>
        {/* conversation list */}
        <div className="w-64 border-r border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <button
              onClick={openNewChatPicker}
              className="w-full text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
            >
              + New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-gray-400 p-3">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-gray-400 p-3">No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() =>
                    openConversation({ id: c.user_id, name: c.name, image: c.image })
                  }
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition ${
                    activeUser?.id === c.user_id ? "bg-indigo-50" : ""
                  }`}
                >
                  <UserHoverAvatar userId={c.user_id} name={c.name} image={c.image} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                      {c.unread_count > 0 && (
                        <span className="text-[10px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{c.last_message}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* thread / new-chat picker */}
        <div className="flex-1 flex flex-col">
          {showNewChat ? (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Start a chat with...</p>
              {allUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => openConversation(u)}
                  className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <UserHoverAvatar userId={u.id} name={u.name} image={u.image} size={28} />
                  <span className="text-sm text-gray-800">{u.name}</span>
                </button>
              ))}
            </div>
          ) : !activeUser ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Pick a conversation or start a new one.
            </div>
          ) : (
            <>
              <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
                <UserHoverAvatar
                  userId={activeUser.id}
                  name={activeUser.name}
                  image={activeUser.image}
                  size={28}
                />
                <span className="text-sm font-medium text-gray-900">{activeUser.name}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {thread.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                        mine
                          ? "self-end bg-indigo-600 text-white rounded-br-sm"
                          : "self-start bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-gray-200 flex gap-2">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}