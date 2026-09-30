import { LOGO, WHATSAPP_QR, INSTA_QR } from "@/lib/assets";
import { waLink } from "@/lib/api";

export const Footer = ({ property }) => (
  <footer className="relative grain bg-[#0F281E] text-white mt-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 grid gap-12 md:grid-cols-3">
      <div>
        <img src={LOGO} alt="Nestavia" className="h-20 w-20 rounded-full ring-2 ring-[#C5A059]" />
        <h3 className="font-serif text-3xl mt-6">Nestavia Zirakpur</h3>
        <p className="text-[#E6C687] text-sm mt-1 tracking-widest uppercase">Where Every Journey Begins in Comfort</p>
        <p className="text-white/70 text-sm mt-6 leading-relaxed">A private, fully-equipped 1BHK sanctuary at the gateway to the Himalayas. Hosted by {property?.host_name}.</p>
      </div>
      <div className="text-center">
        <p className="eyebrow mb-4">Chat with your host</p>
        <img src={WHATSAPP_QR} alt="WhatsApp QR" className="h-44 w-44 mx-auto rounded-xl object-contain bg-white p-2" data-testid="footer-whatsapp-qr" />
        <a data-testid="footer-whatsapp-link" href={waLink(property?.host_whatsapp || "918802757866", "Hi Nestavia, I have a question about your Zirakpur stay.")} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm text-[#E6C687] hover:underline">+91 88027 57866</a>
      </div>
      <div className="text-center">
        <p className="eyebrow mb-4">Follow us on Instagram</p>
        <img src={INSTA_QR} alt="Instagram QR" className="h-44 w-44 mx-auto rounded-xl object-contain bg-white p-2" data-testid="footer-insta-qr" />
        <a data-testid="footer-insta-link" href="https://instagram.com/Nestavia_stays" target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm text-[#E6C687] hover:underline">@Nestavia_stays</a>
      </div>
    </div>
    <div className="border-t border-white/10 py-6 text-center text-xs text-white/50">© {new Date().getFullYear()} Nestavia Zirakpur · Direct bookings only · Zirakpur, Punjab</div>
  </footer>
);
