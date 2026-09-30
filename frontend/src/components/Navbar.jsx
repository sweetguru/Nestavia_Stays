import { Link, useNavigate } from "react-router-dom";
import { LOGO } from "@/lib/assets";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, LogOut, CalendarCheck } from "lucide-react";

export const Navbar = () => {
  const { user, isHost, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-[#0F281E]/95 backdrop-blur-md border-b border-[#C5A059]/30 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-3">
          <img src={LOGO} alt="Nestavia Zirakpur" className="h-11 w-11 sm:h-14 sm:w-14 rounded-full object-cover ring-2 ring-[#C5A059]/70" />
          <div className="leading-tight">
            <div className="font-serif text-lg sm:text-2xl font-semibold tracking-wide">Nestavia Zirakpur</div>
            <div className="hidden sm:block text-[10px] uppercase tracking-[0.3em] text-[#E6C687]">The Himalayan Gateway</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          {user ? (
            <>
              {isHost ? (
                <Link to="/host" data-testid="nav-host-dashboard" className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 transition-colors">
                  <LayoutDashboard size={16} /> <span className="hidden sm:inline">Dashboard</span>
                </Link>
              ) : (
                <Link to="/my-bookings" data-testid="nav-my-bookings" className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 transition-colors">
                  <CalendarCheck size={16} /> <span className="hidden sm:inline">My Trips</span>
                </Link>
              )}
              <span className="hidden md:inline text-[#E6C687]" data-testid="nav-user-name">{user.name}</span>
              <button data-testid="nav-logout-btn" onClick={() => logout().then(() => nav("/"))} className="p-2 rounded-full hover:bg-white/10" title="Logout"><LogOut size={16} /></button>
            </>
          ) : (
            <>
              <Link to="/auth" data-testid="nav-login-link" className="px-3 py-2 hover:text-[#E6C687] transition-colors">Log in</Link>
              <Link to="/auth?mode=register" data-testid="nav-register-link" className="btn-gold px-4 py-2 text-xs sm:text-sm">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
