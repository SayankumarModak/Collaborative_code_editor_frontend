import { useEffect, useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "../services/socket";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import React from "react";

export default function EditorPage() {
  const typingTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);
  const { roomId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("// Start typing...");
  const [users, setUsers] = useState([]);
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [versions, setVersions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Get current user's role
  const myRole = users.find((u) => u.userId === user?.id)?.role;
  const isOwner = myRole === "OWNER";

  // Auth headers for all API calls
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const promoteUser = async (targetUserId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/rooms/${roomId}/promote`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ targetUserId }),
        },
      );
      if (response.ok) {
        socket.emit("refresh-users", { roomId });
      } else {
        const error = await response.json();
        console.error("Error promoting user:", error);
        setOutput(`❌ Error: ${error.message || "Failed to promote user"}`);
      }
    } catch (error) {
      console.error("Error promoting user:", error);
      setOutput(`❌ Error: ${error.message}`);
    }
  };

  const loadVersions = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/rooms/${roomId}/versions`,
        { headers: authHeaders },
      );
      const data = await res.json();
      setVersions(data);
    } catch (error) {
      console.error("Error loading versions:", error);
    }
  };

  const runCode = async () => {
    if (myRole !== "OWNER") {
      setOutput("❌ Error: Only owners can run code");
      return;
    }
    setIsRunning(true);
    setOutput("⏳ Running code...\n");
    try {
      const response = await fetch("http://localhost:5000/api/run", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ roomId, language, code }),
      });
      const data = await response.json();
      setOutput(data.output || "✅ Code executed successfully (no output)");
    } catch (error) {
      setOutput(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleChange = (value) => {
    if (myRole === "VIEWER") return;
    setCode(value);
    socket.emit("code-change", { roomId, code: value });
    socket.emit("typing-start", { roomId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing-stop", { roomId });
    }, 1200);
  };

  const kickUser = async (targetUserId) => {
    await fetch(`http://localhost:5000/api/rooms/${roomId}/kick`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ targetUserId }),
    });
    socket.emit("kick-user", { roomId, targetUserId });
  };

  const sendMessage = () => {
    if (!chatInput.trim() || myRole === "VIEWER") return;
    socket.emit("chat-message", { roomId, message: chatInput });
    setChatInput("");
  };

  // Socket listeners
  useEffect(() => {
    socket.on("kicked", () => {
      alert("You were kicked from the room");
      navigate("/");
    });
    return () => socket.off("kicked");
  }, []);

  useEffect(() => {
    socket.on("chat-message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          user: { name: data.username, color: data.color },
          message: data.message,
          time: data.createdAt,
        },
      ]);
    });
    return () => socket.off("chat-message");
  }, []);

  useEffect(() => {
    socket.on("user-typing", ({ username, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(username) ? prev : [...prev, username];
        } else {
          return prev.filter((u) => u !== username);
        }
      });
    });
    return () => socket.off("user-typing");
  }, []);

  useEffect(() => {
    socket.on("code-update", (newCode) => {
      setCode(newCode);
    });
    return () => socket.off("code-update");
  }, []);

  useEffect(() => {
    socket.on("room-users", (users) => {
      setUsers(users);
    });
    return () => socket.off("room-users");
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const loadChat = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chat/${roomId}`, {
          headers: authHeaders,
        });
        const data = await res.json();
        setMessages(
          data.map((msg) => ({
            user: { name: msg.username, color: msg.color },
            message: msg.message,
            time: msg.createdAt,
          })),
        );
      } catch (error) {
        console.error("Error loading chat:", error);
      }
    };
    loadChat();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    socket.emit("join-room", { roomId });
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const loadRoom = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/rooms/${roomId}`, {
          headers: authHeaders,
        });
        const data = await res.json();
        setCode(data.code || "// Start typing...");
        setLanguage(data.language || "javascript");
      } catch (error) {
        console.error("Error loading room:", error);
      }
    };
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || myRole === "VIEWER") return;
    const timer = setTimeout(async () => {
      try {
        await fetch("http://localhost:5000/api/rooms/save", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ roomId, code, language }),
        });
      } catch (error) {
        console.error("Error saving:", error);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [code, language, roomId, myRole]);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "OWNER":
        return "bg-gradient-to-r from-yellow-500 to-orange-500";
      case "EDITOR":
        return "bg-gradient-to-r from-blue-500 to-cyan-500";
      case "VIEWER":
        return "bg-gradient-to-r from-gray-500 to-gray-600";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100 flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-800/80 backdrop-blur-md border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              CodeCollab
            </h1>
            <p className="text-xs text-gray-400">Room Id: {roomId?.slice(0, 8)}</p>
          </div>
        </div>
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="relative p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
          )}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Responsive */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-50
            w-80 bg-gray-800/95 backdrop-blur-xl border-r border-gray-700/50
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            flex flex-col overflow-hidden
          `}
        >
          {/* Sidebar Header */}
          <div className="hidden lg:block bg-gradient-to-r from-blue-600 to-purple-600 p-6 shadow-xl">
            <h1 className="text-2xl font-bold text-white mb-1">CodeCollab</h1>
            <p className="text-blue-100 text-sm">Real-time collaboration</p>
            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-xs text-blue-100 font-medium">Room ID</p>
              <p className="text-sm text-white font-mono truncate">
                {roomId?.slice(0, 12)}
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-lg transition-colors z-10"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Active Users */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-sm font-semibold text-gray-200">
                  Active Users ({users.length})
                </h3>
              </div>
              <div className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No users connected
                  </p>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.userId}
                      className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30 hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                            style={{ backgroundColor: u.color || "#6366f1" }}
                          >
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-100 truncate">
                              {u.name}
                              {u.userId === user?.id && (
                                <span className="ml-2 text-xs text-blue-400">
                                  (You)
                                </span>
                              )}
                            </p>
                            <span
                              className={`inline-block text-xs px-2 py-0.5 rounded-full text-white font-medium ${getRoleBadgeColor(
                                u.role,
                              )}`}
                            >
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isOwner && u.userId !== user?.id && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => kickUser(u.userId)}
                            className="flex-1 text-xs bg-red-600/80 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-all font-medium"
                          >
                            Kick
                          </button>
                          {u.role === "VIEWER" && (
                            <button
                              onClick={() => promoteUser(u.userId)}
                              className="flex-1 text-xs bg-blue-600/80 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-all font-medium"
                              title={`Promote ${u.name} to Editor`}
                            >
                              Promote
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Version History */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50 shadow-lg">
              <button
                onClick={() => {
                  loadVersions();
                  setShowHistory(!showHistory);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {showHistory ? "Hide History" : "Version History"}
              </button>
              {showHistory && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Previous Versions
                  </h4>
                  {versions.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No versions saved yet
                    </p>
                  ) : (
                    versions.map((v, index) => (
                      <div
                        key={v.id}
                        onClick={() => {
                          if (myRole === "VIEWER") return;
                          setCode(v.code);
                          setLanguage(v.language);
                          setShowHistory(false);
                        }}
                        className={`text-xs p-3 rounded-lg transition-all border ${
                          myRole === "VIEWER"
                            ? "bg-gray-800/30 cursor-not-allowed opacity-50 border-gray-700/50"
                            : "bg-gray-800/50 hover:bg-gray-700 cursor-pointer border-gray-700/50 hover:border-blue-500/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-blue-400">
                            Version {versions.length - index}
                          </span>
                          <span className="bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                            {v.language}
                          </span>
                        </div>
                        <p className="text-gray-400">
                          {new Date(v.createdAt).toLocaleDateString()} •{" "}
                          {new Date(v.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="bg-gray-800/90 backdrop-blur-md border-b border-gray-700/50 px-4 lg:px-6 py-3 lg:py-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-300">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={myRole === "VIEWER"}
                    className="bg-gray-700/80 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="typescript">TypeScript</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="rust">Rust</option>
                    <option value="go">Go</option>
                  </select>
                </div>

                {myRole && (
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${getRoleBadgeColor(myRole)} shadow-lg`}
                  >
                    {myRole}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5">
                    <div className="flex gap-1">
                      <div
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <span className="text-xs text-blue-300">
                      {typingUsers.join(", ")}{" "}
                      {typingUsers.length === 1 ? "is" : "are"} typing...
                    </span>
                  </div>
                )}

                <button
                  onClick={() => {
                    socket.emit("leave-room", { roomId });
                    navigate("/");
                  }}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="hidden sm:inline">Leave</span>
                </button>

                <button
                  onClick={runCode}
                  disabled={isRunning || myRole !== "OWNER"}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Run Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Editor and Output */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor Section */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {myRole === "VIEWER" && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-600/90 backdrop-blur-sm text-white px-4 py-2 text-sm font-medium z-10 flex items-center gap-2 shadow-lg">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Read-only mode (Viewer)
                </div>
              )}
              <div className={`flex-1 ${myRole === "VIEWER" ? "pt-10" : ""}`}>
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={handleChange}
                  theme="vs-dark"
                  options={{
                    readOnly: myRole === "VIEWER",
                    minimap: { enabled: window.innerWidth > 1024 },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    padding: { top: 16, bottom: 16 },
                  }}
                />
              </div>
            </div>

            {/* Output Console - Below Editor */}
            <div className="w-full bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 flex flex-col h-48">
              <div className="bg-gray-800/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-200">
                    Console Output
                  </h3>
                </div>
                <button
                  onClick={() => setOutput("")}
                  className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-3 py-1 hover:bg-gray-700 rounded-lg flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {output ? (
                  <pre className="text-sm font-mono text-gray-300 whitespace-pre-wrap break-words">
                    {output}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <svg
                      className="w-16 h-16 mb-3 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm">No output yet</p>
                    <p className="text-xs mt-1">Run your code to see results</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Chat Panel - Mobile Slide-over */}
        <aside
          className={`
            fixed lg:relative inset-y-0 right-0 z-50
            w-80 bg-gray-800/95 backdrop-blur-xl border-l border-gray-700/50
            transform transition-transform duration-300 ease-in-out
            ${isChatOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
            flex flex-col overflow-hidden
          `}
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-white">Team Chat</h3>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="lg:hidden p-1 hover:bg-white/10 rounded transition-colors"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <svg
                  className="w-16 h-16 mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: msg.user.color || "#6366f1" }}
                      >
                        {msg.user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-200">
                        {msg.user.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 break-words">
                    {msg.message}
                  </p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-gray-800/80 backdrop-blur-md border-t border-gray-700/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  myRole === "VIEWER"
                    ? "Viewers cannot send messages"
                    : "Type a message..."
                }
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={myRole === "VIEWER"}
                className="flex-1 bg-gray-700/80 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={myRole === "VIEWER" || !chatInput.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed px-4 py-2.5 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile chat */}
        {isChatOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsChatOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
