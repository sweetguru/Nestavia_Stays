import { useState } from "react";
import { waLink, fmtDate } from "@/lib/api";
import { MessageCircle } from "lucide-react";

export const EnquiryForm = ({ property }) => {
  const [f, setF] = useState({ name: "", check_in: "", check_out: "", guests: 2, question: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const msg = () => {
    const dates = f.check_in && f.check_out ? `${fmtDate(f.check_in)} → ${fmtDate(f.check_out)}` : f.check_in ? `from ${fmtDate(f.check_in)}` : "dates flexible";
    return `Hi ${property.host_name}, I'm ${f.name || "a guest"} enquiring about Nestavia Zirakpur.\n\n📅 Dates: ${dates}\n👥 Guests: ${f.guests}\n\n❓ ${f.question || "Is this available and what would be the total price?"}`;
  };
  const inp = "mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm bg-white text-[#1A1D1A]";
  return (
    <section data-testid="enquiry-section" className="mt-16 card-lux p-6 sm:p-8 grid md:grid-cols-[1fr_1.3fr] gap-8">
      <div>
        <p className="eyebrow">Have a question?</p>
        <h2 className="font-serif text-3xl font-semibold text-[#0F281E] mt-2">Ask the host directly</h2>
        <p className="text-sm text-[#5A655D] mt-3 leading-relaxed">Not sure about dates, pricing or arrival times? Fill this in and we'll open WhatsApp with your question ready to send — {property.host_name} usually replies within the hour.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs font-semibold text-[#3D5A45]">Your name<input data-testid="enquiry-name-input" value={f.name} onChange={set("name")} className={inp} /></label>
        <label className="text-xs font-semibold text-[#3D5A45]">Check-in<input data-testid="enquiry-checkin-input" type="date" value={f.check_in} onChange={set("check_in")} className={inp} /></label>
        <label className="text-xs font-semibold text-[#3D5A45]">Check-out<input data-testid="enquiry-checkout-input" type="date" value={f.check_out} onChange={set("check_out")} className={inp} /></label>
        <label className="text-xs font-semibold text-[#3D5A45]">Guests
          <select data-testid="enquiry-guests-select" value={f.guests} onChange={set("guests")} className={inp}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <label className="col-span-2 text-xs font-semibold text-[#3D5A45]">Your question<textarea data-testid="enquiry-question-input" rows={3} value={f.question} onChange={set("question")} placeholder="e.g. Can we check in early? Is parking available?" className={inp} /></label>
        <a data-testid="enquiry-whatsapp-btn" href={waLink(property.host_whatsapp, msg())} target="_blank" rel="noreferrer" className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white py-3 text-sm font-semibold hover:brightness-95"><MessageCircle size={16} /> Send on WhatsApp</a>
      </div>
    </section>
  );
};
