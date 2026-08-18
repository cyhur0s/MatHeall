import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminShell from "./admin/admin/AdminShell";
import HomePage from "./User/HomePage";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import RegisterAdmin from "./RegisterAdmin";
import AskMatheal from "./User/AskMatheal";
import MateriPage from "./User/materi";
import ProfilePage from "./User/ProfilePage";
import QuizPage from "./User/QuizPage";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
  const configuredBase = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const basename = configuredBase || "/";

  return (
    <BrowserRouter
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register-admin" element={<RegisterAdmin />} />
        <Route path="/home" element={<ProtectedRoute role="user"><HomePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminShell /></ProtectedRoute>} />
        <Route path="/quiz/:levelId" element={<ProtectedRoute role="user"><QuizPage /></ProtectedRoute>} />
        <Route path="/AskMatheal" element={<ProtectedRoute role="user"><AskMatheal /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute role="user"><ProfilePage /></ProtectedRoute>} />
        <Route path="/materi" element={<ProtectedRoute role="user"><MateriPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
