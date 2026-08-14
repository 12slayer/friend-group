import axios from "axios";

// Dedicated axios instance for notes endpoints.
// withCredentials: true sends the "token" cookie set by /api/auth/login —
// without it, the backend's protect() middleware always sees no token.
const api = axios.create({
  baseURL: "http://localhost:5000/api/notes",
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

export const getNotes = () => unwrap(api.get("/"));

export const getNote = (id) => unwrap(api.get(`/${id}`));

export const createNote = (title, content) =>
  unwrap(api.post("/", { title, content }));

export const updateNote = (id, title, content) =>
  unwrap(api.put(`/${id}`, { title, content }));

export const deleteNote = (id) => unwrap(api.delete(`/${id}`));