import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from "./components/Login";
import { useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import TicketDetail from "./pages/TicketDetail";
import MainLayout from './layouts/MainLayout'
import CreateTicket from './pages/CreateTicket'

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Login />;

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets/new" element={<CreateTicket />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  )
}

export default App;
