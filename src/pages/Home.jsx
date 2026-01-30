import { useState } from "react";
import { useNavigate } from "react-router-dom";
import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const { token } = useAuth();
  const navigate = useNavigate();

  const createRoom = async () => {
    const res = await fetch("http://localhost:5000/api/rooms/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    navigate(`/editor/${data.roomId}`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) return;
    navigate(`/editor/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6">
      {/* Decorative Background Element */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <header className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          CodeSync
        </h1>
        <p className="text-gray-400 mt-3 text-lg">Real-time collaborative coding, simplified.</p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Create Room Section */}
        <div className="flex flex-col items-center p-8 bg-gray-800/40 border border-gray-700 rounded-2xl hover:border-blue-500/50 transition-colors group">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span className="text-3xl">➕</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">New Project</h2>
          <p className="text-gray-400 text-center text-sm mb-8">
            Start a fresh session and invite your teammates to collaborate.
          </p>
          <button 
            onClick={createRoom} 
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
          >
            Create New Room
          </button>
        </div>

        {/* Join Room Section */}
        <div className="flex flex-col items-center p-8 bg-gray-800/40 border border-gray-700 rounded-2xl hover:border-indigo-500/50 transition-colors group">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span className="text-3xl">🔑</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Join Session</h2>
          <p className="text-gray-400 text-center text-sm mb-6">
            Enter an existing Room ID to hop into a workspace.
          </p>
          <div className="w-full space-y-3">
            <input
              type="text"
              placeholder="Room ID (e.g. 8f2b-9a1c)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full px-4 py-3 bg-black/30 border border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono tracking-widest transition-all"
            />
            <button 
              onClick={joinRoom}
              disabled={!roomId.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20"
            >
              Join Room
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-gray-500 text-xs uppercase tracking-widest">
        Secure • Real-time • Persistent
      </footer>
    </div>
  );
}