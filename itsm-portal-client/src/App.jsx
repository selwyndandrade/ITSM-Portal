import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from "./Components/Login";
import Register from "./Components/Register";
import ProtectedRoute from "./Components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import TicketDetail from "./pages/TicketDetail";
import MainLayout from './layouts/MainLayout'
import Tickets from './pages/Tickets'
import CreateTicket from './pages/CreateTicket'
import KnowledgeBase from './pages/KnowledgeBase'
import KnowledgeArticle from './pages/KnowledgeArticle'
import Reports from './pages/Reports'
import Admin from './pages/Admin'
import MeyonAssistant from './pages/AiHelpManager'
import ProfilePage from './pages/ProfilePage'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import CreateAsset from './pages/CreateAsset'
import ServiceCatalog from './pages/ServiceCatalog'
import ServiceDetail from './pages/ServiceDetail'
import MyRequests from './pages/MyRequests'
import AutomationRules from './pages/AutomationRules'
import AutomationActivity from './pages/AutomationActivity'
import ApprovalCenter from './pages/ApprovalCenter'
import ApprovalDetail from './pages/ApprovalDetail'

function App() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) return <div className="auth-shell"><div className="auth-card"><div className="auth-card__body"><div className="auth-card__header"><div className="auth-card__brand"><div className="auth-card__brand-mark">K</div><div><span className="auth-card__eyebrow">KYRO</span><h2>Preparing your workspace…</h2></div></div></div><p>Checking your session and loading the portal experience.</p></div></div></div>;

  if (!user) {
    return showRegister 
      ? <Register onSwitchToLogin={() => setShowRegister(false)} /> 
      : <Login onSwitchToRegister={() => setShowRegister(true)} />;
  }

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
          <Route path="/tickets/new" element={<ProtectedRoute><CreateTicket /></ProtectedRoute>} />
          <Route path="/tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
          <Route path="/ai-help" element={<ProtectedRoute><MeyonAssistant /></ProtectedRoute>} />
          <Route path="/knowledge" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
          <Route path="/knowledge/:id" element={<ProtectedRoute><KnowledgeArticle /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
          <Route path="/assets/new" element={<ProtectedRoute><CreateAsset /></ProtectedRoute>} />
          <Route path="/assets/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
          <Route path="/catalog" element={<ProtectedRoute><ServiceCatalog /></ProtectedRoute>} />
          <Route path="/catalog/:id" element={<ProtectedRoute><ServiceDetail /></ProtectedRoute>} />
          <Route path="/my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
          <Route path="/automation-rules" element={<ProtectedRoute><AutomationRules /></ProtectedRoute>} />
          <Route path="/automation-activity" element={<ProtectedRoute><AutomationActivity /></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute><ApprovalCenter /></ProtectedRoute>} />
          <Route path="/approvals/:id" element={<ProtectedRoute><ApprovalDetail /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App;
