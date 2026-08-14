import axios from "axios";

// Dedicated axios instance for profile endpoints.
// withCredentials: true sends the "token" cookie set by /api/auth/login —
// without it, the backend's protect() middleware always sees no token.
const api = axios.create({
  baseURL: "http://localhost:5000/api/profiles",
  withCredentials: true,
});

// Small helper so every function below can just do try/catch and
// read err.message, same pattern as before.
function unwrap(promise) {
  return promise
    .then((res) => res.data)
    .catch((err) => {
      const message =
        err.response?.data?.message || err.message || "Request failed";
      throw new Error(message);
    });
}

// Builds a multipart/form-data body since profile create/update
// can include an image file (matches the multer .single("image") route).
function buildFormData({ full_name, bio, phone, address, image }) {
  const formData = new FormData();
  if (full_name !== undefined) formData.append("full_name", full_name);
  if (bio !== undefined) formData.append("bio", bio);
  if (phone !== undefined) formData.append("phone", phone);
  if (address !== undefined) formData.append("address", address);
  if (image) formData.append("image", image); // File object from <input type="file">
  return formData;
}

export const getProfile = () => unwrap(api.get("/"));

export const getProfileById = (id) => unwrap(api.get(`/${id}`));

export const createProfile = ({ full_name, bio, phone, address, image }) =>
  unwrap(
    api.post("/", buildFormData({ full_name, bio, phone, address, image }), {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );

export const updateProfile = (
  id,
  { full_name, bio, phone, address, image }
) =>
  unwrap(
    api.put(
      `/${id}`,
      buildFormData({ full_name, bio, phone, address, image }),
      { headers: { "Content-Type": "multipart/form-data" } }
    )
  );

export const deleteProfile = (id) => unwrap(api.delete(`/${id}`));

// public — no login required, used for the comment-avatar hover card
export const getPublicProfile = (userId) => unwrap(api.get(`/user/${userId}`));