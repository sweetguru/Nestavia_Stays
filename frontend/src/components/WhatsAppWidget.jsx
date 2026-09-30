import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/api";

export const WhatsAppWidget = () => (
  <a
    data-testid="whatsapp-float-btn"
    href={waLink("918802757866", "Hi Nestavia Zirakpur! I'd like to know more about booking your stay.")}
    target="_blank" rel="noreferrer"
    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] text-white pl-4 pr-5 py-3 rounded-full shadow-xl hover:scale-105 transition-transform duration-200"
  >
    <MessageCircle size={22} /> <span className="text-sm font-semibold">WhatsApp Host</span>
  </a>
);
