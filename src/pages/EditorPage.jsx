import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { socket } from "../services/socket";
import { useParams, useSearchParams } from "react-router-dom";
import React from "react";

export default function EditorPage() {
  let typingTimeout;

  const { roomId } = useParams();
  const [code, setCode] = useState("// Start typing...");
  const [users, setUsers] = useState([]);
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");
  const [versions, setVersions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const loadVersions = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/rooms/${roomId}/versions`,
      );
      const data = await res.json();
      setVersions(data);
    } catch (error) {
      console.error("Error loading versions:", error);
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput("⏳ Running code...\n");

    try {
      const response = await fetch("http://localhost:5000/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          code,
        }),
      });

      const data = await response.json();
      console.log(data, "data");
      setOutput(data.output || "✅ Code executed successfully (no output)");
    } catch (error) {
      setOutput(`❌ Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleChange = (value) => {
    setCode(value);

    socket.emit("code-change", {
      roomId,
      code: value,
    });

    socket.emit("typing-start", {
      roomId,
      username,
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("typing-stop", {
        roomId,
        username,
      });
    }, 1200);
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;

    socket.emit("chat-message", {
      roomId,
      message: chatInput,
      user: {
        name: username,
        color: users.find((u) => u.name === username)?.color || "#3b82f6",
      },
    });

    setChatInput("");
  };

  // Socket listeners
  useEffect(() => {
    socket.on("chat-message", (data) => {
      setMessages((prev) => [
        ...prev,
        {
          user: {
            name: data.username,
            color: data.color,
          },
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

  // Initial data loading
  useEffect(() => {
    if (!roomId) return;

    const loadChat = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chat/${roomId}`);
        const data = await res.json();

        setMessages(
          data.map((msg) => ({
            user: {
              name: msg.username,
              color: msg.color,
            },
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

    socket.emit("join-room", {
      roomId,
      username,
    });
  }, [roomId, username]);

  useEffect(() => {
    if (!roomId) return;

    const loadRoom = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/rooms/${roomId}`);
        const data = await res.json();

        setCode(data.code || "// Start typing...");
        setLanguage(data.language || "javascript");
      } catch (error) {
        console.error("Error loading room:", error);
      }
    };

    loadRoom();
  }, [roomId]);

  // Auto-save
  useEffect(() => {
    if (!roomId) return;

    const timer = setTimeout(async () => {
      try {
        await fetch("http://localhost:5000/api/rooms/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId,
            code,
            language,
          }),
        });
      } catch (error) {
        console.error("Error saving:", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [code, language, roomId]);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 flex flex-col shadow-2xl">
        {/* Header */}
        <header className="p-5 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                CodeCollab
              </h1>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Real-time collaboration
              </p>
            </div>
            <div className="text-xs bg-gray-700/50 px-3 py-1 rounded-full text-gray-300">
              Room: {roomId?.slice(0, 6)}...
            </div>
          </div>
        </header>

        {/* Active Users */}
        <section className="p-5 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              Active Users
            </span>
            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
              {users.length}
            </span>
          </h2>
          <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {users.length === 0 ? (
              <li className="text-xs text-gray-500 text-center py-2 italic">
                No users connected
              </li>
            ) : (
              users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center gap-2 text-sm bg-gray-700/30 p-2 rounded-lg hover:bg-gray-700/50 transition-all"
                >
                  <span
                    className="w-3 h-3 rounded-full ring-2 ring-gray-600 flex-shrink-0"
                    style={{ backgroundColor: user.color }}
                  ></span>
                  <span className="text-gray-200 truncate">{user.name}</span>
                  {user.name === username && (
                    <span className="ml-auto text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Version History */}
        <section className="p-5 flex-1 overflow-hidden flex flex-col border-b border-gray-700">
          <button
            onClick={() => {
              loadVersions();
              setShowHistory(!showHistory);
            }}
            className="w-full bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
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
            <div className="mt-3 bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden flex-1 flex flex-col shadow-inner">
              <div className="p-3 bg-gray-800/70 border-b border-gray-700">
                <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Previous Versions
                </h3>
              </div>
              <ul className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
                {versions.length === 0 ? (
                  <li className="text-xs text-gray-500 text-center py-8 italic">
                    No versions saved yet
                  </li>
                ) : (
                  versions.map((v, index) => (
                    <li
                      key={index}
                      onClick={() => {
                        setCode(v.code);
                        setLanguage(v.language);
                        setShowHistory(false);
                      }}
                      className="text-xs p-3 bg-gray-800/50 hover:bg-gray-700/70 rounded-lg cursor-pointer transition-all border border-gray-700/50 hover:border-blue-500/50 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-300 group-hover:text-blue-400">
                          Version {versions.length - index}
                        </span>
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">
                          {v.language}
                        </span>
                      </div>
                      <div className="text-gray-500 flex items-center gap-2">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {new Date(v.createdAt).toLocaleDateString()}
                        <span className="mx-1">•</span>
                        {new Date(v.createdAt).toLocaleTimeString()}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </section>

        {/* Chat Section */}
        <section className="flex-1 min-h-0 flex flex-col bg-gray-900/30">
          <div className="p-4 border-b border-gray-700 bg-gray-800/50">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-purple-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                  clipRule="evenodd"
                />
              </svg>
              Team Chat
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="w-12 h-12 mx-auto text-gray-700 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-xs text-gray-500 italic">No messages yet</p>
                <p className="text-xs text-gray-600 mt-1">
                  Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`text-sm p-3 rounded-lg ${
                    msg.user.name === username
                      ? "bg-blue-500/10 border border-blue-500/20 ml-4"
                      : "bg-gray-800/50 border border-gray-700/50 mr-4"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="font-semibold text-sm flex items-center gap-1"
                      style={{ color: msg.user.color }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: msg.user.color }}
                      ></span>
                      {msg.user.name}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date(msg.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-700 bg-gray-800/50">
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                disabled={!chatInput.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-all shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-600 transition-colors"
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

            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-700/50 px-3 py-1.5 rounded-full animate-pulse">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path
                    fillRule="evenodd"
                    d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                    clipRule="evenodd"
                  />
                </svg>
                {typingUsers.join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
              </div>
            )}
          </div>

          <button
            onClick={runCode}
            disabled={isRunning}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-600 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Run Code
              </>
            )}
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={handleChange}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
              lineNumbers: "on",
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: true,
              smoothScrolling: true,
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>

        {/* Output Console */}
        <div className="h-56 bg-black border-t-2 border-gray-700 flex flex-col shadow-2xl">
          <div className="bg-gradient-to-r from-gray-900 to-black px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
              Console Output
            </h3>
            <button
              onClick={() => setOutput("")}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-3 py-1 hover:bg-gray-800 rounded flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
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
          <div className="flex-1 overflow-auto p-4 font-mono text-sm custom-scrollbar">
            {output ? (
              <pre className="text-green-400 whitespace-pre-wrap leading-relaxed">
                {output}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <svg
                  className="w-16 h-16 mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
                <p className="text-sm italic">No output yet</p>
                <p className="text-xs mt-1">Run your code to see results</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(75, 85, 99, 0.7);
        }
      `}</style>
    </div>
  );
}
