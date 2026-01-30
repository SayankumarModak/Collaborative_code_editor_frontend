// import { Navigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
// import React from "react";
// import Home from "../pages/Home";
// export default function ProtectedRoute({ children }) {
//   const { user, loading } = useAuth();

//   if (loading) return <div>Loading...</div>;

//   // If NOT logged in, kick them to login
//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   // If logged in, show the page
//   return children;
// }

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import React from "react";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
