// client/src/components/Editor/CodeEditor.jsx
import Editor from "@monaco-editor/react";

export default function CodeEditor({ code, setCode }) {
  const handleCodeChange = (value) => {
    setCode(value);

    socket.emit("code-change", {
      roomId,
      code: value,
    });
  };

  return (
    <Editor
      height="90vh"
      language="javascript"
      theme="vs-dark"
      value={code}
      onChange={handleCodeChange}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        automaticLayout: true,
      }}
    />
  );
}
