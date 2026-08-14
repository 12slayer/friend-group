import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api/notifications",
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

export const getNotifications = () => unwrap(api.get("/"));
export const getUnreadCount = () => unwrap(api.get("/unread-count"));
export const markNotificationRead = (id) => unwrap(api.post(`/${id}/read`));
export const markAllNotificationsRead = () => unwrap(api.post("/read-all"));