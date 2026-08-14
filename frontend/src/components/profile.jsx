import { useEffect, useState, useCallback } from "react";
import {
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../api/profile";

const API_ORIGIN = "http://localhost:5000"; // backend serves /uploads statically from here

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form state (used for both "create" when no profile exists, and "edit")
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState(null); // File object from <input type="file">
  const [previewUrl, setPreviewUrl] = useState(null); // local preview before upload

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      // 404 just means no profile yet — not a real error for this screen
      if (err.message === "Profile not found") {
        setProfile(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // build a local preview whenever a new image file is picked
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function startEdit() {
    setFullName(profile?.full_name || "");
    setBio(profile?.bio || "");
    setPhone(profile?.phone || "");
    setAddress(profile?.address || "");
    setImageFile(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setImageFile(null);
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = { full_name: fullName.trim(), bio: bio.trim(), phone: phone.trim(), address: address.trim(), image: imageFile };

      const saved = profile
        ? await updateProfile(profile.id, payload)
        : await createProfile(payload);

      setProfile(saved);
      setIsEditing(false);
      setImageFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!profile) return;
    const confirmed = window.confirm("Delete your profile? This can't be undone.");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");
      await deleteProfile(profile.id);
      setProfile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const displayImage = previewUrl || (profile?.image ? `${API_ORIGIN}${profile.image}` : null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
      <h1 className="text-2xl font-semibold mb-5 text-gray-900">My Profile</h1>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading profile...</p>
      ) : isEditing || !profile ? (
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-2.5 bg-gray-50 border border-gray-200 rounded-xl p-4"
        >
          {displayImage && (
            <img
              src={displayImage}
              alt="Profile preview"
              className="w-24 h-24 rounded-full object-cover border border-gray-300 mb-1"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <textarea
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition"
            >
              {saving ? "Saving..." : profile ? "Save Changes" : "Create Profile"}
            </button>
            {profile && (
              <button
                type="button"
                onClick={cancelEdit}
                className="text-sm px-3.5 py-1.5 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
          {displayImage ? (
            <img
              src={displayImage}
              alt={profile.full_name || "Profile"}
              className="w-24 h-24 rounded-full object-cover border border-gray-300"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
              No image
            </div>
          )}
          <h3 className="text-base font-semibold text-gray-900">
            {profile.full_name || "Unnamed"}
          </h3>
          {profile.bio && <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</p>}
          {profile.phone && <p className="text-sm text-gray-600">📞 {profile.phone}</p>}
          {profile.address && <p className="text-sm text-gray-600">📍 {profile.address}</p>}
          <span className="text-xs text-gray-400">
            Updated {new Date(profile.updated_at).toLocaleString()}
          </span>
          <div className="flex gap-2 mt-1">
            <button
              onClick={startEdit}
              className="text-sm px-3.5 py-1.5 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
