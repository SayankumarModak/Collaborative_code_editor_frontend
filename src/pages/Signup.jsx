import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import React from "react";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
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
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a] px-4 relative overflow-hidden">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -ml-48 -mb-48"></div>

      <div className="w-full max-w-md z-10">
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900/50 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-2xl space-y-6"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white tracking-tight">Get Started</h2>
            <p className="text-gray-400 mt-2">Create your account to start collaborating.</p>
          </div>

          <div className="space-y-4">
            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-400 ml-1">Full Name</label>
              <input
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white/10 outline-none transition-all text-white placeholder-gray-600"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-400 ml-1">Email Address</label>
              <input
                required
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white/10 outline-none transition-all text-white placeholder-gray-600"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-400 ml-1">Password</label>
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white/10 outline-none transition-all text-white placeholder-gray-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transform transition active:scale-[0.98]"
          >
            Create Free Account
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-xs uppercase tracking-widest">Already have an account?</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full py-3 bg-transparent border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}