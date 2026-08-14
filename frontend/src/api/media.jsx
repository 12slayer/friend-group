import axios from "axios";

// Dedicated axios instance for media endpoints.
// withCredentials: true sends the "token" cookie set by /api/auth/login —
// needed for admin upload/delete and for liking/commenting (GET routes are public).
const api = axios.create({
  baseURL: "http://localhost:5000/api/media",
  withCredentials: true,
});

function unwrap(promise) {
  return promise
    .then((res) => res.data)
    .catch((err) => {
      const message =
        err.response?.data?.message || err.message || "Request failed";
      throw new Error(message);
    });
}

export const getMedia = () => unwrap(api.get("/"));

export const uploadMedia = (file, title) => {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);

  return unwrap(
    api.post("/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  );
};

export const deleteMedia = (id) => unwrap(api.delete(`/${id}`));

// likes
export const toggleLike = (mediaId) => unwrap(api.post(`/${mediaId}/like`));
export const getLikers = (mediaId) => unwrap(api.get(`/${mediaId}/likes`));

// comments
export const getComments = (mediaId) => unwrap(api.get(`/${mediaId}/comments`));

export const addComment = (mediaId, content) =>
  unwrap(api.post(`/${mediaId}/comments`, { content }));

export const deleteComment = (mediaId, commentId) =>
  unwrap(api.delete(`/${mediaId}/comments/${commentId}`));