import { Share2 } from "lucide-react";
import { toast } from "sonner";

export const ShareButton = ({ property }) => {
  const url = window.location.origin;
  const text = `🌿 ${property.name}\n"${property.tagline}"\n\nPrivate 1BHK near Chandigarh airport · from ₹${property.base_rate}/night · up to ${property.max_guests} guests · direct booking, no platform fees.\n\n${url}`;
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: property.name, text, url }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  return (
    <button data-testid="share-listing-btn" onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-[#C5A059] text-[#0F281E] px-3 py-1.5 text-xs font-semibold hover:bg-[#C5A059]/15 transition-colors">
      <Share2 size={14} /> Share on WhatsApp
    </button>
  );
};
