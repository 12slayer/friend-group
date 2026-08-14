import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/messages",
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

export const getConversations = () => unwrap(api.get("/conversations"));
export const getAllUsers = () => unwrap(api.get("/users"));
export const getMessages = (userId) => unwrap(api.get(`/${userId}`));
export const sendMessage = (userId, content) =>
  unwrap(api.post(`/${userId}`, { content }));