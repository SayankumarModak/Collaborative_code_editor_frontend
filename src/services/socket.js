import { io } from "socket.io-client";

const token = localStorage.getItem("token"); // or wherever you store JWT

export const socket = io("http://localhost:5000", {
  auth: {
    token,
  },
});
