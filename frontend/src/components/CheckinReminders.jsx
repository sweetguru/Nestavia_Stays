import { fmtDate, inr, waLink } from "@/lib/api";
import { reminderMessage, balanceMessage, guestPhone } from "@/components/BookingQueue";
import { BellRing, MessageCircle, Wallet } from "lucide-react";

const hoursUntil = (s) => (new Date(`${s}T14:00:00`) - Date.now()) / 36e5;

export const CheckinReminders = ({ bookings }) => {
  const soon = bookings
    .filter((b) => b.status === "confirmed" && hoursUntil(b.check_in) <= 48 && hoursUntil(b.check_in) > -10)
    .sort((a, b) => a.check_in.localeCompare(b.check_in));
  return (
    <div data-testid="checkin-reminders" className="card-lux p-6 border-l-4 !border-l-[#C5A059]">
      <div className="flex items-center gap-2"><BellRing size={18} className="text-[#C5A059]" /><h3 className="font-serif text-2xl text-[#0F281E]">Arriving within 48 hours</h3></div>
      {soon.length === 0 ? (
        <p data-testid="reminders-empty" className="text-sm text-[#5A655D] mt-3">No check-ins in the next 48 hours.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {soon.map((b) => {
            const h = hoursUntil(b.check_in);
            return (
              <li key={b.id} data-testid={`reminder-${b.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#F8F6F0] p-3">
                <div>
                  <div className="font-semibold text-sm text-[#0F281E]">{b.guest_name} · {b.guests} guest{b.guests > 1 ? "s" : ""}</div>
                  <div className="text-xs text-[#5A655D]">{fmtDate(b.check_in)} · {h <= 0 ? "checking in today" : `in ${Math.ceil(h)}h`}{b.balance_due > 0 ? ` · collect ${inr(b.balance_due)}` : ""}</div>
                </div>
                <div className="flex gap-2">
                  {b.balance_due > 0 && <a data-testid={`reminder-balance-${b.id}`} href={waLink(guestPhone(b.guest_phone), balanceMessage(b))} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs rounded-full bg-[#C5A059] text-[#0F281E] inline-flex items-center gap-1.5 font-semibold"><Wallet size={13} /> Balance</a>}
                  <a data-testid={`reminder-whatsapp-${b.id}`} href={waLink(guestPhone(b.guest_phone), reminderMessage(b))} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs rounded-full bg-[#25D366] text-white inline-flex items-center gap-1.5 font-semibold"><MessageCircle size={13} /> Send reminder</a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
