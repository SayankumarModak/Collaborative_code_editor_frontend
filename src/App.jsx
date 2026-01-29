import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditorPage from "./pages/EditorPage";
import Home from "./pages/Home";
import React from "react"; // 👈 ADD THIS LINE

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/editor/:roomId" element={<EditorPage />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
