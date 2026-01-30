import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import React from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message);
      return;
    }

    login(data.token, data.user);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800 px-4">
      {/* Glow Effect Background */}
      <div className="absolute w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -top-10 -left-10"></div>
      <div className="absolute w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -bottom-10 -right-10"></div>

      <div className="w-full max-w-md z-10">
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900/40 backdrop-blur-xl border border-gray-700/50 p-8 rounded-2xl shadow-2xl space-y-6"
        >
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome Back</h2>
            <p className="text-gray-400 mt-2">Enter your details to access your account</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-gray-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg transform transition active:scale-95 duration-200"
          >
            Sign In
          </button>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <a href="/signup" className="text-blue-400 hover:underline">Create one</a>
          </p>
        </form>
      </div>
    </div>
  );
}