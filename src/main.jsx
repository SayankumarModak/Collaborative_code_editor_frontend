import { StrictMode } from "react";
import React from "react"; // 👈 ADD THIS LINE
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
