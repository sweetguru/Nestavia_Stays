import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LOGO } from "@/lib/assets";
import { HeroGallery } from "@/components/HeroGallery";
import { BookingWidget } from "@/components/BookingWidget";
import { Reviews } from "@/components/Reviews";
import { Footer } from "@/components/Footer";
import { MapPin, Users, BedDouble, Bath, Wifi, Snowflake, Tv, UtensilsCrossed, ShieldAlert, Lock, Mountain, Sparkles } from "lucide-react";

const AMENITIES = [
  [Wifi, "High-speed Wi-Fi"], [Snowflake, "Air conditioning"], [Tv, "Smart TV"], [UtensilsCrossed, "Fully-equipped kitchen"],
  [Bath, "Geyser & rain shower"], [Mountain, "Balcony with open views"], [BedDouble, "King-size bed"], [Sparkles, "Daily-cleaned linens"],
];

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
        <div className="rise">
          <p className="eyebrow">Zirakpur · Punjab · Direct booking</p>
          <h1 data-testid="property-title" className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F281E] mt-2">{property.name}</h1>
          <p className="text-base md:text-lg text-[#3D5A45] mt-3 italic font-serif">"{property.tagline}"</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-[#5A655D]">
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
              <p className="text-base text-[#1A1D1A] leading-relaxed mt-6">
                A private, tastefully-designed 1BHK apartment on the 10th floor — bright master bedroom opening onto a sunlit balcony, a lounge dressed with pop-art and velvet seating, a mosaic-tiled modular kitchen, and a spa-style bathroom. Perfectly placed near Chandigarh airport as your gateway to Shimla, Kasauli and the Himalayas.
              </p>
            </section>

            <section className="rise rise-2">
              <p className="eyebrow">What this place offers</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                {AMENITIES.map(([Icon, t]) => <div key={t} className="flex items-center gap-3 text-sm text-[#1A1D1A]"><span className="h-10 w-10 rounded-full bg-[#F0F4F1] text-[#3D5A45] flex items-center justify-center"><Icon size={18} /></span>{t}</div>)}
              </div>
            </section>

            <section className="rise rise-3 grid sm:grid-cols-2 gap-5">
              <div data-testid="house-rules-card" className="card-lux p-6 border-l-4 !border-l-[#C5A059]">
                <div className="flex items-center gap-2 text-[#0F281E] font-semibold"><ShieldAlert size={18} className="text-[#C5A059]" /> House rules</div>
                <ul className="text-sm text-[#1A1D1A] mt-3 space-y-2 list-disc pl-4">
                  <li>Maximum {property.max_guests} guests — strictly enforced.</li>
                  <li>{property.house_rule}</li>
                  <li>Check-in 2:00 PM · Check-out 11:00 AM.</li>
                  <li>Government ID required for all guests at arrival.</li>
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
