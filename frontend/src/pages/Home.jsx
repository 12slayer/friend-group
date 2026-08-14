import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  getMedia,
  uploadMedia,
  deleteMedia,
  toggleLike,
  getLikers,
  getComments,
  addComment,
  deleteComment,
} from "../api/media";
import { getPublicProfile } from "../api/profile";

const API_ORIGIN = "http://localhost:5000"; // backend serves /uploads statically from here

function VideoPlayer({ item }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
    }
  }, []);

  return (
    <video
      ref={videoRef}
      src={`${API_ORIGIN}${item.url}`}
      controls
      muted={false}
      preload="metadata"
      className="w-full h-48 object-cover bg-black"
    />
  );
}

function UserHoverAvatar({ userId, name, image }) {
  const [hovering, setHovering] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  function handleEnter() {
    setHovering(true);
    if (profile || loading) return; // already have it, or already fetching

    setLoading(true);
    setLoadError("");
    getPublicProfile(userId)
      .then((data) => setProfile(data))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <div
      className="relative inline-block flex-shrink-0 p-0.5"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setHovering(false)}
    >
      {image ? (
        <img
          src={`${API_ORIGIN}${image}`}
          alt={name}
          className="w-7 h-7 rounded-full object-cover cursor-pointer"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 cursor-pointer">
          {name?.[0]?.toUpperCase() || "?"}
        </div>
      )}

      {hovering && (
        <div className="absolute z-50 top-8 left-0 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-left">
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
              {profile?.phone && (
                <p className="text-[11px] text-gray-500">📞 {profile.phone}</p>
              )}
              {profile?.address && (
                <p className="text-[11px] text-gray-500">📍 {profile.address}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MediaCard({ item, currentUser, isAdmin, onDeleteMedia }) {
  const [likeCount, setLikeCount] = useState(item.like_count);
  const [likedByMe, setLikedByMe] = useState(item.liked_by_me);
  const [liking, setLiking] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [likers, setLikers] = useState([]);
  const [likersLoaded, setLikersLoaded] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  async function handleLike() {
    if (!currentUser) {
      setError("Log in to like this.");
      return;
    }
    try {
      setLiking(true);
      setError("");
      const result = await toggleLike(item.id);
      setLikedByMe(result.liked);
      setLikeCount(result.count);
      setLikersLoaded(false); // invalidate cache so the list re-fetches next time it's opened
    } catch (err) {
      setError(err.message);
    } finally {
      setLiking(false);
    }
  }

  function toggleLikers() {
    const next = !likersOpen;
    setLikersOpen(next);
    setCommentsOpen(false); // keep only one panel open at a time
    if (next && !likersLoaded) {
      getLikers(item.id)
        .then((data) => {
          setLikers(data);
          setLikersLoaded(true);
        })
        .catch((err) => setError(err.message));
    }
  }

  async function loadComments() {
    try {
      setError("");
      const data = await getComments(item.id);
      setComments(data);
      setCommentsLoaded(true);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleComments() {
    const next = !commentsOpen;
    setCommentsOpen(next);
    setLikersOpen(false); // keep only one panel open at a time
    if (next && !commentsLoaded) {
      loadComments();
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!currentUser) {
      setError("Log in to comment.");
      return;
    }

    try {
      setPosting(true);
      setError("");
      await addComment(item.id, commentText.trim());
      setCommentText("");
      await loadComments(); // refresh so avatar/name are consistent for everyone
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      setError("");
      await deleteComment(item.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl flex flex-col">
      <div className="rounded-t-xl overflow-hidden">
        {item.type === "video" ? (
          <VideoPlayer item={item} />
        ) : (
          <img
            src={`${API_ORIGIN}${item.url}`}
            alt={item.title || "Uploaded media"}
            className="w-full h-48 object-cover"
          />
        )}
      </div>

      <div className="p-3 flex flex-col gap-2">
        {item.title && (
          <span className="text-sm font-medium text-gray-900">{item.title}</span>
        )}
        <span className="text-xs text-gray-400">
          {new Date(item.created_at).toLocaleString()}
        </span>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center gap-3 mt-1">
          <div
            className={`flex items-center rounded-lg border overflow-hidden ${
              likedByMe ? "border-pink-300" : "border-gray-300"
            }`}
          >
            <button
              onClick={handleLike}
              disabled={liking}
              className={`text-sm px-2.5 py-1 transition ${
                likedByMe
                  ? "bg-pink-50 text-pink-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {likedByMe ? "❤️" : "🤍"}
            </button>
            <button
              onClick={toggleLikers}
              disabled={likeCount === 0}
              className={`text-sm px-2 py-1 border-l transition ${
                likedByMe ? "border-pink-200" : "border-gray-200"
              } ${
                likeCount === 0
                  ? "text-gray-400 cursor-default"
                  : "text-gray-600 hover:bg-gray-50 hover:underline"
              }`}
            >
              {likeCount}
            </button>
          </div>
          <button
            onClick={toggleComments}
            className="text-sm px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            💬 {commentsOpen ? "Hide" : "Comments"} ({item.comment_count})
          </button>
          {isAdmin && (
            <button
              onClick={() => onDeleteMedia(item.id)}
              className="ml-auto text-xs px-3 py-1 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
            >
              Delete
            </button>
          )}
        </div>

        {likersOpen && (
          <div className="mt-1 flex flex-col gap-1.5 border-t border-gray-100 pt-2">
            <p className="text-xs font-medium text-gray-500">Liked by</p>
            {likers.length === 0 ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : (
              <ul className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {likers.map((liker) => (
                  <li key={liker.user_id} className="flex items-center gap-2">
                    <UserHoverAvatar
                      userId={liker.user_id}
                      name={liker.name}
                      image={liker.image}
                    />
                    <span className="text-xs text-gray-800">{liker.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {commentsOpen && (
          <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-2">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400">No comments yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {comments.map((c) => (
                  <li key={c.id} className="flex items-start gap-2">
                    <UserHoverAvatar
                      userId={c.user_id}
                      name={c.user_name}
                      image={c.user_image}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-medium text-gray-900">{c.user_name}</span>{" "}
                        <span className="text-gray-700 break-words">{c.content}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                        {(currentUser?.id === c.user_id || isAdmin) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-[10px] text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {currentUser ? (
              <form onSubmit={handleAddComment} className="flex gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  type="submit"
                  disabled={posting || !commentText.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                >
                  {posting ? "..." : "Post"}
                </button>
              </form>
            ) : (
              <p className="text-xs text-gray-400">Log in to comment.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home({ user, error: authError }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("all"); // all | image | video

  // upload form state (admin only)
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const isAdmin = user?.role === "admin";

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getMedia();
      setMedia(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);
      setError("");
      const newItem = await uploadMedia(file, title.trim());
      setMedia((prev) => [newItem, ...prev]);
      setFile(null);
      setTitle("");
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMedia(id) {
    const confirmed = window.confirm("Delete this media item? This can't be undone.");
    if (!confirmed) return;

    try {
      setError("");
      await deleteMedia(id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const counts = useMemo(
    () => ({
      all: media.length,
      image: media.filter((m) => m.type === "image").length,
      video: media.filter((m) => m.type === "video").length,
    }),
    [media]
  );

  const filteredMedia = useMemo(
    () => (category === "all" ? media : media.filter((m) => m.type === category)),
    [media, category]
  );

  const tabs = [
    { key: "all", label: "All" },
    { key: "photo", label: "Photos", match: "image" },
    { key: "video", label: "Videos", match: "video" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-16">
      <h1 className="text-2xl font-semibold mb-5 text-gray-900">Welcome</h1>

      {(error || authError) && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-lg mb-4 text-sm">
          {error || authError}
        </div>
      )}

      {isAdmin && (
        <form
          onSubmit={handleUpload}
          className="flex flex-col gap-2.5 mb-8 bg-gray-50 border border-gray-200 rounded-xl p-4"
        >
          <p className="text-sm font-medium text-gray-700">Upload image or video</p>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={uploading || !file}
            className="self-start text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {tabs.map((tab) => {
          const tabKey = tab.match || tab.key;
          const active = category === tabKey;
          return (
            <button
              key={tab.key}
              onClick={() => setCategory(tabKey)}
              className={`text-sm px-3.5 py-2 -mb-px border-b-2 transition ${
                active
                  ? "border-indigo-600 text-indigo-700 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label} ({counts[tab.key === "photo" ? "image" : tab.key]})
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading gallery...</p>
      ) : filteredMedia.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {category === "all" ? "Nothing uploaded yet." : `No ${category === "image" ? "photos" : "videos"} yet.`}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              currentUser={user}
              isAdmin={isAdmin}
              onDeleteMedia={handleDeleteMedia}
            />
          ))}
        </div>
      )}
    </div>
  );
}