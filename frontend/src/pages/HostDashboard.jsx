import { useEffect, useState } from "react";
import { api, inr, errMsg } from "@/lib/api";
import { HostCalendar } from "@/components/HostCalendar";
import { BookingQueue } from "@/components/BookingQueue";
import { CheckinReminders } from "@/components/CheckinReminders";
import { ListingEditor } from "@/components/ListingEditor";
import { OccupancyInsights } from "@/components/OccupancyInsights";
import { Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function HostDashboard() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [avail, setAvail] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [tpl, setTpl] = useState({ title: "", message: "" });

  const reload = () => {
    api.get("/host/stats").then((r) => setStats(r.data));
    api.get("/bookings").then((r) => setBookings(r.data.bookings));
    api.get("/availability").then((r) => setAvail(r.data));
    api.get("/host/quick-replies").then((r) => setTemplates(r.data.templates));
  };
  useEffect(reload, []);

  const addTpl = async () => { try { await api.post("/host/quick-replies", tpl); setTpl({ title: "", message: "" }); toast.success("Template saved"); reload(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <main data-testid="host-dashboard" className="bg-[#0F281E] min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        <p className="eyebrow">Host portal</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold mt-2">Welcome back, Dr. Gurpreet</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <Stat tid="stat-revenue" label="Revenue collected" value={stats ? inr(stats.total_revenue) : "—"} />
          <Stat tid="stat-pending" label="Pending approvals" value={stats?.pending ?? "—"} hot />
          <Stat tid="stat-confirmed" label="Confirmed" value={stats?.confirmed ?? "—"} />
          <Stat tid="stat-upcoming" label="Upcoming check-ins" value={stats?.upcoming ?? "—"} />
        </div>
      </div>
      <div className="bg-[#F8F6F0] text-[#1A1D1A] rounded-t-[2rem]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 grid lg:grid-cols-[1fr_420px] gap-8">
          <section>
            <div className="mb-6"><CheckinReminders bookings={bookings} /></div>
            <div className="mb-6"><OccupancyInsights /></div>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {["pending", "confirmed", "completed", "cancelled", "rejected", "all"].map((f) => <button key={f} data-testid={`filter-${f}`} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-[#0F281E] text-white" : "bg-white border border-[#E8E2D2] text-[#3D5A45]"}`}>{f}</button>)}
            </div>
            <BookingQueue bookings={bookings} reload={reload} filter={filter} />
          </section>
          <aside className="space-y-6">
            {avail && <HostCalendar avail={avail} reload={reload} />}
            <ListingEditor />
            <div data-testid="quick-replies" className="card-lux p-6">
              <h3 className="font-serif text-2xl text-[#0F281E]">WhatsApp quick replies</h3>
              <div className="space-y-3 mt-4">
                {templates.map((t) => (
                  <div key={t.id} data-testid={`template-${t.id}`} className="rounded-lg bg-[#F8F6F0] p-3 text-sm">
                    <div className="flex items-center justify-between"><b className="text-[#0F281E]">{t.title}</b>
                      <div className="flex gap-1">
                        <button data-testid={`copy-template-${t.id}`} onClick={() => { navigator.clipboard?.writeText(t.message); toast.success("Copied"); }} className="p-1.5 rounded hover:bg-white"><Copy size={14} /></button>
                        <button data-testid={`delete-template-${t.id}`} onClick={() => api.delete(`/host/quick-replies/${t.id}`).then(reload)} className="p-1.5 rounded hover:bg-white text-red-600"><Trash2 size={14} /></button>
                      </div></div>
                    <p className="text-xs text-[#5A655D] mt-1 whitespace-pre-line">{t.message}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <input data-testid="template-title-input" placeholder="Template title" value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                <textarea data-testid="template-message-input" placeholder="Message" rows={2} value={tpl.message} onChange={(e) => setTpl({ ...tpl, message: e.target.value })} className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                <button data-testid="add-template-btn" disabled={!tpl.title || !tpl.message} onClick={addTpl} className="btn-gold px-4 py-2 text-xs disabled:opacity-40">Add template</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
const Stat = ({ tid, label, value, hot }) => (
  <div data-testid={tid} className={`rounded-xl p-5 border ${hot ? "bg-[#C5A059] text-[#0F281E] border-[#C5A059]" : "bg-white/5 border-white/10"}`}>
    <div className={`text-xs ${hot ? "text-[#0F281E]/70" : "text-white/60"}`}>{label}</div>
    <div className="font-serif text-3xl font-semibold mt-1">{value}</div>
  </div>
);
