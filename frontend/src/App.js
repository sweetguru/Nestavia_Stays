import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { WhatsAppWidget } from "@/components/WhatsAppWidget";
import Home from "@/pages/Home";
import AuthPage from "@/pages/AuthPage";
import MyBookings from "@/pages/MyBookings";
import HostDashboard from "@/pages/HostDashboard";

const Guard = ({ host, children }) => {
  const { user, loading, isHost } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (host && !isHost) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/my-bookings" element={<Guard><MyBookings /></Guard>} />
          <Route path="/host" element={<Guard host><HostDashboard /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <WhatsAppWidget />
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
