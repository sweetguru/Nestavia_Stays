import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GPAY_QR } from "@/lib/assets";
import { api, inr, fmtDate, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { X, Upload, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const PaymentModal = ({ quote, property, onClose }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [phone, setPhone] = useState(user?.phone || "");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!phone.trim() || !ref.trim()) return toast.error("Phone number and UPI transaction ID are required");
    if (!file) return toast.error("Please upload your payment screenshot");
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await api.post("/uploads/receipt", fd);
      await api.post("/bookings", {
        check_in: quote.check_in, check_out: quote.check_out, guests: quote.guests, payment_option: quote.payment_option,
        guest_phone: phone, transaction_ref: ref, receipt_file_id: up.data.file_id, special_requests: notes,
      });
      toast.success("Booking request sent! Host will verify your payment shortly.");
      nav("/my-bookings");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#0F281E]/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div data-testid="payment-modal" onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D2]">
          <h3 className="font-serif text-2xl text-[#0F281E]">Complete your payment</h3>
          <button data-testid="payment-close-btn" onClick={onClose} className="p-2 rounded-full hover:bg-[#F0F4F1]"><X size={18} /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-8 p-6">
          <div className="text-center">
            <p className="eyebrow mb-3">Scan & pay with GPay / any UPI app</p>
            <img src={GPAY_QR} alt="GPay QR" data-testid="gpay-qr-image" className="w-full max-w-[260px] mx-auto rounded-xl border border-[#E8E2D2]" />
            <div className="mt-4 flex items-center justify-center gap-2 bg-[#F0F4F1] rounded-full px-4 py-2 text-sm">
              <span data-testid="upi-id-text" className="font-semibold text-[#0F281E]">{property.upi_id}</span>
              <button data-testid="copy-upi-btn" onClick={() => { navigator.clipboard?.writeText(property.upi_id); toast.success("UPI ID copied"); }} className="text-[#3D5A45]"><Copy size={14} /></button>
            </div>
            <div className="mt-4 text-sm text-[#5A655D]">
              <div>{fmtDate(quote.check_in)} → {fmtDate(quote.check_out)} · {quote.guests} guest{quote.guests > 1 ? "s" : ""}</div>
              <div className="mt-2 text-[#0F281E]">Amount to pay now</div>
              <div data-testid="payment-amount-due" className="font-serif text-4xl font-bold text-[#0F281E]">{inr(quote.amount_due)}</div>
              {quote.balance_due > 0 && <div className="text-xs">Remaining {inr(quote.balance_due)} payable at check-in</div>}
            </div>
          </div>
          <div className="space-y-4">
            <Field label="WhatsApp / phone number *"><input data-testid="payment-phone-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxxxx" className={inp} /></Field>
            <Field label="UPI transaction ID / reference *"><input data-testid="payment-ref-input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 4152XXXXXXXX" className={inp} /></Field>
            <Field label="Payment screenshot *">
              <label data-testid="receipt-upload-label" className="flex items-center gap-3 border-2 border-dashed border-[#C5A059]/60 rounded-xl p-4 cursor-pointer hover:bg-[#FBF8EE] transition-colors">
                {file ? <CheckCircle2 className="text-green-600" /> : <Upload className="text-[#C5A059]" />}
                <span className="text-sm text-[#3D5A45] truncate">{file ? file.name : "Click to upload receipt image"}</span>
                <input data-testid="receipt-file-input" type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </Field>
            <Field label="Special requests (optional)"><textarea data-testid="payment-notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inp} /></Field>
            <div className="rounded-lg bg-[#FBF8EE] border border-[#E6C687] p-3 text-xs text-[#5A655D]">{property.house_rule}</div>
            <button data-testid="submit-booking-btn" disabled={busy} onClick={submit} className="btn-emerald w-full py-3.5 disabled:opacity-60">{busy ? "Submitting…" : "Submit booking request"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const inp = "w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C5A059]/60";
const Field = ({ label, children }) => <label className="block text-xs font-semibold text-[#3D5A45]">{label}<div className="mt-1">{children}</div></label>;
