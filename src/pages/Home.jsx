import { useState } from "react";
import { useNavigate } from "react-router-dom";
import React from "react"; // 👈 ADD THIS LINE
export default function Home() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  const createRoom = () => {
    if (!username.trim()) return alert("Enter username");

    const newRoomId = Math.random().toString(36).substring(2, 8);
    navigate(`/editor/${newRoomId}?username=${username}`);
  };

  const joinRoom = () => {
    if (!roomId.trim() || !username.trim()) return;
    navigate(`/editor/${roomId}?username=${username}`);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "15px",
      }}
    >
      <h1>Collaborative Code Editor</h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <button onClick={createRoom}>➕ Create New Room</button>

      <div>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={joinRoom} style={{ marginLeft: "10px" }}>
          🔑 Join Room
        </button>
      </div>
    </div>
  );
}
