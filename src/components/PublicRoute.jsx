import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import React from "react";

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // Or a spinner

  // If user is already logged in, don't let them see Login/Signup
  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
