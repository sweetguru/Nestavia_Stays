import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LOGO } from "@/lib/assets";
import { errMsg } from "@/lib/api";
import { toast } from "sonner";

export default function AuthPage() {
  const [sp] = useSearchParams();
  const [mode, setMode] = useState(sp.get("mode") === "register" ? "register" : "login");
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const u = mode === "login" ? await login(f.email, f.password) : await register(f);
      toast.success(`Welcome, ${u.name}`);
      nav(u.role === "host" ? "/host" : sp.get("next") || "/");
    } catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  };

  return (
    <div className="min-h-[85vh] grid lg:grid-cols-2">
      <div className="relative grain hidden lg:flex flex-col justify-between bg-[#0F281E] text-white p-16">
        <img src={LOGO} alt="Nestavia" className="h-24 w-24 rounded-full ring-2 ring-[#C5A059]" />
        <div>
          <p className="eyebrow">The Himalayan Gateway</p>
          <h2 className="font-serif text-5xl font-semibold mt-3 leading-tight">Where every journey begins in comfort.</h2>
          <p className="text-white/70 mt-6 max-w-md">Create an account to reserve your dates, upload your UPI receipt and receive the exact location on approval.</p>
        </div>
        <p className="text-xs text-white/40">Zirakpur · Punjab</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} data-testid="auth-form" className="card-lux w-full max-w-md p-8 sm:p-10">
          <img src={LOGO} alt="" className="h-14 w-14 rounded-full lg:hidden mb-4" />
          <div className="flex rounded-full bg-[#F0F4F1] p-1 mb-8">
            {["login", "register"].map((m) => <button type="button" key={m} data-testid={`auth-tab-${m}`} onClick={() => setMode(m)} className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${mode === m ? "bg-[#0F281E] text-white" : "text-[#3D5A45]"}`}>{m === "login" ? "Log in" : "Create account"}</button>)}
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#0F281E]">{mode === "login" ? "Welcome back" : "Join Nestavia"}</h1>
          <div className="space-y-4 mt-6">
            {mode === "register" && <input data-testid="auth-name-input" required placeholder="Full name" value={f.name} onChange={set("name")} className={inp} />}
            <input data-testid="auth-email-input" required type="email" placeholder="Email" value={f.email} onChange={set("email")} className={inp} />
            {mode === "register" && <input data-testid="auth-phone-input" placeholder="WhatsApp number" value={f.phone} onChange={set("phone")} className={inp} />}
            <input data-testid="auth-password-input" required type="password" minLength={6} placeholder="Password (min 6 chars)" value={f.password} onChange={set("password")} className={inp} />
          </div>
          <button data-testid="auth-submit-btn" disabled={busy} className="btn-gold w-full py-3.5 mt-8 disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
          <p className="text-center text-xs text-[#5A655D] mt-6"><Link to="/" className="hover:underline">← Back to the listing</Link></p>
        </form>
      </div>
    </div>
  );
}
const inp = "w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/60";
