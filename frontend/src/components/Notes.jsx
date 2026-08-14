import { useEffect, useState, useCallback } from "react";
import { getNotes, createNote, updateNote, deleteNote } from "../api/note";

export default function Note() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form state for creating a new note
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [creating, setCreating] = useState(false);

  // track which note is being edited, and its draft values
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getNotes();
      setNotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      setError("");
      const newNote = await createNote(title.trim(), content.trim());
      setNotes((prev) => [newNote, ...prev]);
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  }

  async function handleUpdate(id) {
    if (!editTitle.trim()) return;

    try {
      setSavingId(id);
      setError("");
      const updated = await updateNote(id, editTitle.trim(), editContent.trim());
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      cancelEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("Delete this note? This can't be undone.");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
      <h1 className="text-2xl font-semibold mb-5 text-gray-900">My Notes</h1>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-2.5 mb-8 bg-gray-50 border border-gray-200 rounded-xl p-4"
      >
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <textarea
          placeholder="Write something..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="text-sm px-3 py-2 rounded-lg border border-gray-300 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="self-start text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
        >
          {creating ? "Adding..." : "Add Note"}
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-gray-500 text-sm">No notes yet. Add your first one above.</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2"
            >
              {editingId === note.id ? (
                <>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="text-sm px-3 py-2 rounded-lg border border-gray-300 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleUpdate(note.id)}
                      disabled={savingId === note.id || !editTitle.trim()}
                      className="text-sm px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
                    >
                      {savingId === note.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-sm px-3.5 py-1.5 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-gray-900">{note.title}</h3>
                  {note.content && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  )}
                  <span className="text-xs text-gray-400">
                    Updated {new Date(note.updated_at).toLocaleString()}
                  </span>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => startEdit(note)}
                      className="text-sm px-3.5 py-1.5 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={deletingId === note.id}
                      className="text-sm px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition"
                    >
                      {deletingId === note.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
