import { useEffect, useState } from "react";
import { api, waLink } from "@/lib/api";
import { LOGO, GALLERY, WALKTHROUGH_VIDEO } from "@/lib/assets";
import { HeroGallery } from "@/components/HeroGallery";
import { BookingWidget } from "@/components/BookingWidget";
import { Reviews } from "@/components/Reviews";
import { Footer } from "@/components/Footer";
import { ShareButton } from "@/components/ShareButton";
import { InstagramGallery } from "@/components/InstagramGallery";
import { EnquiryForm } from "@/components/EnquiryForm";
import { MapPin, Users, BedDouble, Bath, Wifi, Snowflake, Tv, UtensilsCrossed, ShieldAlert, Lock, Mountain, Sparkles } from "lucide-react";

const ICONS = [["wifi", Wifi], ["air", Snowflake], ["ac", Snowflake], ["tv", Tv], ["kitchen", UtensilsCrossed], ["shower", Bath], ["geyser", Bath], ["balcony", Mountain], ["view", Mountain], ["bed", BedDouble]];
const iconFor = (t) => (ICONS.find(([k]) => t.toLowerCase().includes(k)) || [null, Sparkles])[1];

export default function Home() {
  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [], average: 0, count: 0 });
  useEffect(() => {
    api.get("/property").then((r) => setProperty(r.data));
    api.get("/reviews").then((r) => setReviews(r.data));
  }, []);
  if (!property) return <div className="min-h-[60vh] flex items-center justify-center"><img src={LOGO} alt="" className="h-20 w-20 rounded-full animate-pulse" /></div>;

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12">
        {property.promo_enabled && (
          <div data-testid="promo-banner" className="rise relative grain overflow-hidden mb-8 rounded-2xl bg-[#0F281E] text-white px-6 py-5 sm:px-8 flex flex-wrap items-center gap-4 border border-[#C5A059]/50">
            <span className="h-11 w-11 rounded-full bg-[#C5A059] text-[#0F281E] flex items-center justify-center shrink-0"><Sparkles size={20} /></span>
            <div className="flex-1 min-w-[200px]">
              <p className="eyebrow !text-[10px]">Special offer</p>
              <h3 data-testid="promo-title" className="font-serif text-xl sm:text-2xl font-semibold text-[#E6C687] leading-tight">{property.promo_title}</h3>
              {property.promo_text && <p data-testid="promo-text" className="text-sm text-white/80 mt-1">{property.promo_text}</p>}
            </div>
            <a data-testid="promo-whatsapp-btn" href={waLink(property.host_whatsapp, `Hi ${property.host_name}, I'd like to book Nestavia Zirakpur with the offer "${property.promo_title}". Which dates are available?`)} target="_blank" rel="noreferrer" className="btn-gold px-5 py-2.5 text-xs">Claim on WhatsApp</a>
          </div>
        )}
        <div className="rise">
          <p className="eyebrow">Zirakpur · Punjab · Direct booking</p>
          <h1 data-testid="property-title" className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F281E] mt-2">{property.name}</h1>
          <p className="text-base md:text-lg text-[#3D5A45] mt-3 italic font-serif">"{property.tagline}"</p>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-[#5A655D]">
            <ShareButton property={property} />
            <span className="flex items-center gap-1.5"><Users size={15} /> Up to {property.max_guests} guests</span>
            <span className="flex items-center gap-1.5"><BedDouble size={15} /> 1 bedroom</span>
            <span className="flex items-center gap-1.5"><Bath size={15} /> 1 bathroom</span>
            <span className="flex items-center gap-1.5"><MapPin size={15} /> {property.public_area.split(" (")[0]}</span>
          </div>
        </div>
        <div className="mt-8"><HeroGallery /></div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-12 mt-12">
          <div className="space-y-14">
            <section className="rise rise-1">
              <div className="flex items-center gap-4">
                <img src={LOGO} alt="Host" className="h-16 w-16 rounded-full ring-2 ring-[#C5A059] object-cover" />
                <div><h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0F281E]">Hosted by {property.host_name}</h2><p className="text-sm text-[#5A655D]">Superhost · Responds within an hour on WhatsApp</p></div>
              </div>
              <p data-testid="property-description" className="text-base text-[#1A1D1A] leading-relaxed mt-6 whitespace-pre-line">{property.description}</p>
            </section>

            <section data-testid="walkthrough-section" className="rise rise-2">
              <p className="eyebrow">Property walkthrough</p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0F281E] mt-2">Take a tour before you arrive</h2>
              <video data-testid="walkthrough-video" src={WALKTHROUGH_VIDEO} controls playsInline preload="metadata" poster={GALLERY[0].url} className="w-full mt-5 rounded-2xl border border-[#E8E2D2] shadow-[0_8px_30px_-12px_rgba(15,40,30,0.25)] bg-black" />
            </section>

            <section className="rise rise-2">
              <p className="eyebrow">What this place offers</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                {property.amenities.map((t) => { const Icon = iconFor(t); return <div key={t} data-testid="amenity-item" className="flex items-center gap-3 text-sm text-[#1A1D1A]"><span className="h-10 w-10 rounded-full bg-[#F0F4F1] text-[#3D5A45] flex items-center justify-center"><Icon size={18} /></span>{t}</div>; })}
              </div>
            </section>

            <section className="rise rise-3 grid sm:grid-cols-2 gap-5">
              <div data-testid="house-rules-card" className="card-lux p-6 border-l-4 !border-l-[#C5A059]">
                <div className="flex items-center gap-2 text-[#0F281E] font-semibold"><ShieldAlert size={18} className="text-[#C5A059]" /> House rules</div>
                <ul className="text-sm text-[#1A1D1A] mt-3 space-y-2 list-disc pl-4">
                  {property.house_rules.map((r) => <li key={r} data-testid="house-rule-item">{r}</li>)}
                </ul>
              </div>
              <div data-testid="location-privacy-card" className="card-lux p-6 bg-[#0F281E] !border-[#1B3B2B] text-white">
                <div className="flex items-center gap-2 font-semibold"><Lock size={18} className="text-[#C5A059]" /> Location revealed after approval</div>
                <p className="text-sm text-white/75 mt-3 leading-relaxed">{property.public_area}</p>
                <p className="text-xs text-[#E6C687] mt-4">For guest privacy & security, the exact tower, unit number and Google Maps pin are shared only once the host confirms your booking.</p>
              </div>
            </section>

            <section className="card-lux p-6 sm:p-8">
              <p className="eyebrow">Pricing & policies</p>
              <div className="grid sm:grid-cols-2 gap-6 mt-5 text-sm">
                <Policy title="Nightly rate" items={[`₹${property.base_rate} for 2 guests`, `+₹${property.extra_guest_fee} per extra guest/night (max 4)`, "Fri & Sat nights +15% weekend markup", "10% off when booked within 48 hrs of check-in"]} />
                <Policy title="Payment & cancellation" items={[`Pay ${property.partial_percent}% now if check-in is ${property.partial_eligible_days}+ days away`, "100% upfront if check-in is within 6 days", "Cancel 4+ days before: 100% refund", "Cancel within 48 hrs: 40% refund"]} />
              </div>
            </section>

            <Reviews data={reviews} />
            <InstagramGallery posts={property.instagram_posts} />
            <EnquiryForm property={property} />
          </div>
          <BookingWidget property={property} />
        </div>
      </main>
      <Footer property={property} />
    </>
  );
}

const Policy = ({ title, items }) => (
  <div><h4 className="font-semibold text-[#0F281E] mb-2">{title}</h4><ul className="space-y-1.5 text-[#5A655D] list-disc pl-4">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>
);
