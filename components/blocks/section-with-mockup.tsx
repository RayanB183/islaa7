import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Feature {
  eyebrow: string;
  heading: string;
  body: string;
  points: string[];
  imageUrl: string;
  imageAlt: string;
  reverse?: boolean;
  accentColor?: string;
}

interface SectionWithMockupProps {
  features?: Feature[];
  className?: string;
}

function useInView(threshold = 0.15) {
  const ref  = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function MockupCard({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
  key?: React.Key;
}) {
  const { ref, inView } = useInView();
  const reverse = feature.reverse ?? index % 2 !== 0;
  const accent  = feature.accentColor ?? '#C29B40';

  return (
    <div
      ref={ref}
      className={cn(
        'grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center',
        'opacity-0 translate-y-8 transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        inView && 'opacity-100 translate-y-0',
      )}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Content column */}
      <div className={cn(reverse && 'lg:order-2')}>
        <p
          className="text-xs font-bold tracking-widest uppercase mb-4"
          style={{ color: accent }}
        >
          {feature.eyebrow}
        </p>
        <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-5 tracking-tighter">
          {feature.heading}
        </h3>
        <p className="text-gray-400 text-base leading-relaxed mb-7 max-w-md">
          {feature.body}
        </p>
        <ul className="space-y-3">
          {feature.points.map((pt, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}
              >
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  className="w-3 h-3"
                  style={{ color: accent }}
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-gray-300 text-sm leading-relaxed">{pt}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mockup column */}
      <div className={cn(reverse && 'lg:order-1')}>
        <div
          className="relative rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 40px 80px rgba(0,0,0,0.5), 0 0 60px ${accent}18`,
          }}
        >
          {/* Status bar chrome */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <div className="flex gap-1.5">
              {['#ff5f57', '#ffbd2e', '#28c840'].map((c, i) => (
                <span key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
              ))}
            </div>
            <div
              className="h-1.5 w-24 rounded-full"
              style={{ background: `${accent}30` }}
            />
            <div className="w-12" />
          </div>
          {/* Image */}
          <img
            src={feature.imageUrl}
            alt={feature.imageAlt}
            className="w-full object-cover"
            style={{ aspectRatio: '4/3' }}
            loading="lazy"
          />
          {/* Subtle inner reflection */}
          <div
            className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.04) 0%, transparent 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

const DEFAULT_FEATURES: Feature[] = [
  {
    eyebrow: 'For Citizens',
    heading: 'Book a verified technician in under 3 minutes.',
    body: 'Upload a photo, describe the issue — our AI identifies the damage, estimates cost, and dispatches a nearby verified technician immediately.',
    points: [
      'Photo-based damage identification',
      'Instant cost estimate before you commit',
      'Track your technician in real time',
      'Payment held in escrow until job is done',
    ],
    imageUrl: 'https://picsum.photos/seed/islaa7-repair/800/600',
    imageAlt: 'Repair booking interface showing item photo upload',
    reverse: false,
    accentColor: '#C29B40',
  },
  {
    eyebrow: 'For Technicians',
    heading: 'Build a business. Keep 90% of every job.',
    body: 'Islaa7 routes verified repair jobs directly to you. No middlemen, no commute guessing. Just a reliable stream of local work.',
    points: [
      'Instant job notifications by category',
      'Transparent earnings — 90% to you',
      'Verified badge builds customer trust',
      'Digital record of every repair',
    ],
    imageUrl: 'https://picsum.photos/seed/islaa7-tech/800/600',
    imageAlt: 'Technician dashboard showing incoming repair jobs',
    reverse: true,
    accentColor: '#00732F',
  },
  {
    eyebrow: 'Rewards Programme',
    heading: 'Repair more. Earn more. Waste less.',
    body: 'Every completed repair earns points. Redeem them for cinema tickets, meal vouchers, and partner discounts — a real incentive to choose repair over disposal.',
    points: [
      'Points credited after every successful repair',
      'Cinema tickets, meal vouchers, free repairs',
      'Partner retail discounts coming soon',
      'Leaderboard tracks community impact',
    ],
    imageUrl: 'https://picsum.photos/seed/islaa7-rewards/800/600',
    imageAlt: 'Rewards dashboard showing earned points and available vouchers',
    reverse: false,
    accentColor: '#C29B40',
  },
];

export function SectionWithMockup({
  features = DEFAULT_FEATURES,
  className,
}: SectionWithMockupProps) {
  return (
    <section className={cn('bg-[#050508] py-32 px-6', className)}>
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-24">
          <p className="text-xs font-bold tracking-widest text-uae-gold uppercase mb-4">
            Platform Features
          </p>
          <h2 className="text-5xl lg:text-6xl font-black text-white leading-tight tracking-tighter">
            Everything you need.
            <br />
            <span className="text-uae-gold">Nothing you don't.</span>
          </h2>
        </div>

        {/* Feature rows */}
        <div className="space-y-28">
          {features.map((feature, i) => (
            <MockupCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
