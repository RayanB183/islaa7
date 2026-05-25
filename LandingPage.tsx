import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─── Scroll Reveal Hook ─────────────────────────────────────────── */
export function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale'
    );
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in-view'); }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, []);
}

/* ─── Animated Counter ───────────────────────────────────────────── */
function Counter({ end, suffix = '', prefix = '', decimals = 0 }: {
  end: number; suffix?: string; prefix?: string; decimals?: number;
}) {
  const [val, setVal] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !done.current) {
        done.current = true;
        const dur = 2400;
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - (1 - p) ** 4;
          const cur = eased * end;
          setVal(decimals > 0 ? parseFloat(cur.toFixed(decimals)) : Math.floor(cur));
          if (p < 1) requestAnimationFrame(tick);
          else setVal(end);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, decimals]);
  return (
    <span ref={spanRef}>
      {prefix}{decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}{suffix}
    </span>
  );
}

/* ─── Animated Bar (inline, dark bg) ────────────────────────────── */
function AnimatedBarInline({ pct, color }: { pct: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setW(pct); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [pct]);
  return (
    <div ref={ref} className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${w}%`, transition: 'width 1.4s cubic-bezier(0.22,1,0.36,1)' }}
      />
    </div>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────────── */
function Navbar({ scrolled }: { scrolled: boolean }) {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? 'navbar-glass' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 bg-transparent border-none cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-base">إ</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            ISLAA<span className="gradient-text-gold">7</span>
          </span>
        </button>

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'About', id: 'about' },
            { label: 'How It Works', id: 'how-it-works' },
            { label: 'Team', id: 'team' },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors cursor-pointer bg-transparent border-none"
            >
              {label}
            </button>
          ))}
          <Link
            to="/market-plan"
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            Market Plan
          </Link>
        </div>

        <Link
          to="/login"
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-black gold-gradient hover:opacity-90 transition-all duration-200 shadow-lg"
        >
          Get Started →
        </Link>
      </div>
    </nav>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
      {/* Ambient orbs */}
      <div
        className="absolute w-[700px] h-[700px] rounded-full hero-orb-1 -top-40 -left-40 pointer-events-none"
        style={{ filter: 'blur(100px)' }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full hero-orb-2 -bottom-32 -right-32 pointer-events-none"
        style={{ filter: 'blur(100px)' }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-uae-gold/30 bg-uae-gold/10 mb-8 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-uae-green animate-pulse" />
          <span className="text-uae-gold text-xs font-semibold tracking-widest uppercase">
            UN SDG 12 · Responsible Consumption & Production
          </span>
        </div>

        {/* Main headline */}
        <h1
          className="text-6xl sm:text-7xl lg:text-[90px] font-black leading-none tracking-tighter mb-6 animate-fade-in-up"
          style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
        >
          <span className="text-white">Repair.</span>{' '}
          <span className="gradient-text-gold">Reward.</span>{' '}
          <span className="text-white">Renew.</span>
        </h1>

        <p
          className="text-xl sm:text-2xl text-gray-300 font-light max-w-2xl mx-auto leading-relaxed mb-3 animate-fade-in-up"
          style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
        >
          Don't Bin It Book It. Islaa7 connects residents with verified
          repair technicians in minutes, turning waste into worth.
        </p>
        <p
          className="text-lg text-uae-gold font-medium mb-10 animate-fade-in-up"
          style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
        >
          إصلاح · The Arabic word for repair, reimagined for a sustainable future.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
          style={{ animationDelay: '0.4s', animationFillMode: 'both' }}
        >
          <Link
            to="/login"
            className="px-8 py-4 rounded-full font-bold text-base text-black gold-gradient shadow-2xl hover:opacity-90 hover:scale-105 transition-all duration-200"
          >
            Book a Repair →
          </Link>
          <Link
            to="/market-plan"
            className="px-8 py-4 rounded-full font-bold text-base text-white border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:scale-105 transition-all duration-200"
          >
            View Market Plan
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
        <span className="text-gray-600 text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-uae-gold/60 to-transparent" />
      </div>
    </section>
  );
}

/* ─── Stats ──────────────────────────────────────────────────────── */
function StatsSection() {
  const stats = [
    { end: 79000, suffix: '+', label: 'Tonnes of waste/year', sub: 'Al Raha Beach alone', decimals: 0 },
    { end: 16000, suffix: '', label: 'Tonnes repairable', sub: 'Per year in Al Raha Beach', decimals: 0 },
    { end: 1.8, suffix: ' kg', label: 'Waste per person/day', sub: 'Abu Dhabi average', decimals: 1 },
    { end: 90, suffix: '%', label: 'Target completion rate', sub: 'Within 7 working hours', decimals: 0 },
  ];
  return (
    <section className="bg-[#050508] py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <p className="reveal text-center text-xs font-bold tracking-widest text-uae-gold uppercase mb-16">
          The Scale of the Problem We're Solving
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className="reveal-scale hover-lift text-center p-8 rounded-3xl landing-glass"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="text-4xl lg:text-5xl font-black text-white mb-2">
                <Counter end={s.end} suffix={s.suffix} decimals={s.decimals} />
              </div>
              <div className="text-uae-gold font-semibold text-sm mb-1">{s.label}</div>
              <div className="text-gray-500 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── About / Problem ────────────────────────────────────────────── */
function AboutSection() {
  const bars = [
    { label: 'Total Municipal Waste', pct: 100, color: 'bg-red-500', value: '79,000 t' },
    { label: 'Repairable Items', pct: 20, color: 'bg-uae-gold', value: '16,000 t' },
    { label: 'Food Waste', pct: 30, color: 'bg-orange-400', value: '24,000 t' },
    { label: 'Recyclable Material', pct: 15, color: 'bg-blue-400', value: '12,000 t' },
  ];
  return (
    <section id="about" className="bg-white py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <p className="reveal text-xs font-bold tracking-widest text-uae-green uppercase mb-4">
              The Problem
            </p>
            <h2
              className="reveal text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-8"
              style={{ transitionDelay: '100ms' }}
            >
              The UAE is one of the world's biggest waste generators.
            </h2>
            <p
              className="reveal text-lg text-gray-600 leading-relaxed mb-6"
              style={{ transitionDelay: '200ms' }}
            >
              Abu Dhabi residents produce{' '}
              <strong>1.8 kg of waste per person per day</strong> — among the
              highest globally. A community like Al Raha Beach, with ~120,000
              residents, generates an estimated{' '}
              <strong>79,000 tonnes of municipal waste per year.</strong>
            </p>
            <p
              className="reveal text-lg text-gray-600 leading-relaxed mb-8"
              style={{ transitionDelay: '300ms' }}
            >
              Studies show a 1% increase in median income leads to{' '}
              <strong>1.86 kg of extra household waste</strong> per person per year
              — meaning as the UAE grows wealthier, waste grows with it unless a
              structural solution is in place.{' '}
              <span className="text-gray-900 font-semibold">Islaa7 is that solution.</span>
            </p>
            <div className="reveal space-y-3" style={{ transitionDelay: '400ms' }}>
              {[
                'No trustworthy way to find repair professionals',
                'Unclear pricing creates hesitation to repair',
                'No incentive system for sustainable behaviour',
                'Skilled tradespeople lack digital reach',
              ].map((point, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-500 text-xs font-black">✕</span>
                  </div>
                  <span className="text-gray-700 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal-right">
            <div className="bg-gray-950 rounded-3xl p-8 text-white">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-6">
                Annual Waste Profile — Al Raha Beach
              </p>
              {bars.map((bar, i) => (
                <div key={i} className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-300">{bar.label}</span>
                    <span className="text-gray-400 font-mono text-xs">{bar.value}</span>
                  </div>
                  <AnimatedBarInline pct={bar.pct} color={bar.color} />
                </div>
              ))}
              <div className="mt-6 pt-6 border-t border-gray-800">
                <p className="text-uae-gold text-2xl font-bold">16,000 tonnes</p>
                <p className="text-gray-400 text-sm mt-1">
                  could be repaired instead of discarded — every single year
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ───────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Upload & Describe',
      body: 'Submit a photo of the broken item with a short description. Our system handles the rest automatically.',
      icon: '📸',
      accent: 'from-uae-gold/20',
    },
    {
      num: '02',
      title: 'AI Analysis & Match',
      body: 'Our AI instantly identifies the damage type, estimates the repair cost, and matches you with a verified nearby technician.',
      icon: '🤖',
      accent: 'from-uae-green/20',
    },
    {
      num: '03',
      title: 'Repaired & Rewarded',
      body: 'The technician arrives and completes the repair. Payment is released once the repair is completed. Earn points with every repair. (This feature is still being worked on)',
      icon: '⭐',
      accent: 'from-blue-500/20',
    },
  ];
  return (
    <section id="how-it-works" className="bg-[#050508] py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <p className="reveal text-xs font-bold tracking-widest text-uae-gold uppercase mb-4">
            The Process
          </p>
          <h2
            className="reveal text-5xl lg:text-6xl font-black text-white leading-tight"
            style={{ transitionDelay: '100ms' }}
          >
            As simple as ordering a taxi.
          </h2>
          <p
            className="reveal text-gray-400 text-lg mt-4 max-w-xl mx-auto"
            style={{ transitionDelay: '200ms' }}
          >
            Three steps from broken to fixed — and you earn points every single time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="reveal hover-lift rounded-3xl landing-glass p-8 flex flex-col"
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.accent} to-transparent flex items-center justify-center text-3xl mb-5`}
              >
                {step.icon}
              </div>
              <span className="text-gray-700 text-5xl font-black mb-2 leading-none">
                {step.num}
              </span>
              <h3 className="text-white text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed flex-1">{step.body}</p>
            </div>
          ))}
        </div>

        <div
          className="reveal mt-16 text-center"
          style={{ transitionDelay: '400ms' }}
        >
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-uae-gold/30 bg-uae-gold/5">
            <span className="text-uae-gold text-2xl font-black">90%</span>
            <span className="text-gray-300 text-sm">
              of repairs to be planned within{' '}
              <strong className="text-white">7 hours</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Why Islaa7 ─────────────────────────────────────────────────── */
function WhySection() {
  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Estimates',
      body: 'Groq-powered LLM analyses photos to identify damage and estimate cost before a technician is dispatched.',
    },
    {
      icon: '💰',
      title: 'Escrow Payments',
      body: 'Payment is held securely and only released once the repair is completed.',
    },
    {
      icon: '⭐',
      title: 'Verified Technicians',
      body: 'Every worker is admin-verified. Ratings below 4 stars mean removal — quality is non-negotiable.',
    },
    {
      icon: '🎁',
      title: 'Real Rewards',
      body: 'Cinema tickets, meal vouchers, free repairs. (In progress — not yet confirmed)',
    },
  ];
  return (
    <section className="bg-white py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <p className="reveal text-xs font-bold tracking-widest text-uae-green uppercase mb-4">
            Why Islaa7
          </p>
          <h2
            className="reveal text-5xl lg:text-6xl font-black text-gray-900 leading-tight"
            style={{ transitionDelay: '100ms' }}
          >
            Built different. By design.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="reveal hover-lift p-8 rounded-3xl bg-gray-50 border border-gray-100"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="text-4xl mb-5 block">{f.icon}</span>
              <h3 className="text-gray-900 text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Rewards ────────────────────────────────────────────────────── */
function RewardsSection() {
  const rewards = [
    { icon: '🎬', label: 'Cinema Tickets' },
    { icon: '🍽️', label: 'Meal Vouchers' },
    { icon: '🔧', label: 'Free Repairs' },
    { icon: '🎁', label: 'Partner Discounts' },
  ];
  return (
    <section
      className="py-32 px-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #001A0D 0%, #002D14 50%, #001A0D 100%)',
      }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(194,155,64,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(0,115,47,0.2) 0%, transparent 50%)',
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="reveal text-xs font-bold tracking-widest text-uae-gold uppercase mb-4">
              Rewards Programme
            </p>
            <h2
              className="reveal text-5xl font-black text-white leading-tight mb-6"
              style={{ transitionDelay: '100ms' }}
            >
              Repair more.<br />Earn more.
            </h2>
            <p
              className="reveal text-gray-300 text-lg leading-relaxed mb-8"
              style={{ transitionDelay: '200ms' }}
            >
              Every repair earns points. Points can unlock rewards — from cinema
              tickets to partner discounts. Rewards programme coming soon.
            </p>
            <div className="reveal space-y-4" style={{ transitionDelay: '300ms' }}>
            </div>
          </div>

          <div className="reveal-right grid grid-cols-2 gap-4">
            {rewards.map((r, i) => (
              <div
                key={i}
                className="hover-lift p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col items-center text-center"
              >
                <span className="text-4xl mb-3">{r.icon}</span>
                <span className="text-white text-sm font-semibold">{r.label}</span>
              </div>
            ))}
            <div className="col-span-2 p-6 rounded-3xl bg-uae-gold/10 border border-uae-gold/30 text-center">
              <p className="text-uae-gold text-3xl font-black">10%</p>
              <p className="text-gray-300 text-sm mt-1">
                Platform commission — workers keep <strong className="text-white">90%</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Next Steps ─────────────────────────────────────────────────── */
function NextStepsSection() {
  const steps = [
    {
      icon: '🚀',
      phase: 'Phase 1',
      title: 'Al Raha Beach Pilot Launch',
      body: 'Deploy to Al Raha Beach with 50 verified technicians. Validate the booking flow, repair quality, and user satisfaction in a controlled community.',
      timeline: 'Months 0–6',
    },
    {
      icon: '🏙️',
      phase: 'Phase 2',
      title: 'Abu Dhabi Expansion',
      body: 'Scale across Abu Dhabi with 500+ technicians. Partner with government agencies for outreach. Onboard all repair categories.',
      timeline: 'Months 6–18',
    },
    {
      icon: '🇦🇪',
      phase: 'Phase 3',
      title: 'UAE-Wide Rollout',
      body: 'Launch in Dubai, Sharjah, and Ajman. Partner with major UAE retailers for rewards redemption.',
      timeline: 'Months 18–36',
    },
    {
      icon: '🌍',
      phase: 'Phase 4',
      title: 'Regional GCC & High-Volume Expansion',
      body: 'Adapt the platform for Saudi Arabia, Kuwait, Qatar, Egypt, and Jordan. Become essential infrastructure, cutting municipal waste management costs by 50%.',
      timeline: 'Months 36+',
    },
  ];
  return (
    <section className="bg-[#050508] py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <p className="reveal text-xs font-bold tracking-widest text-uae-gold uppercase mb-4">
            Roadmap
          </p>
          <h2
            className="reveal text-5xl lg:text-6xl font-black text-white leading-tight"
            style={{ transitionDelay: '100ms' }}
          >
            What comes next.
          </h2>
          <p
            className="reveal text-gray-400 text-lg mt-4 max-w-xl mx-auto"
            style={{ transitionDelay: '200ms' }}
          >
            A phased approach to building the UAE's repair economy, community by community.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="reveal hover-lift landing-glass rounded-3xl p-8"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
                  {step.icon}
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                    {step.phase} · {step.timeline}
                  </span>
                  <h3 className="text-white text-xl font-bold mt-1 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Team ───────────────────────────────────────────────────────── */
function TeamSection() {
  const team = [
    { name: 'Omar Alemam', role: 'Co-Founder', avatar: 'O' },
    { name: 'Nasser Armouti', role: 'Co-Founder', avatar: 'N' },
    { name: 'Kamil Gilani', role: 'Co-Founder', avatar: 'K' },
    { name: 'Abdelrahman Alemam', role: 'Co-Founder', avatar: 'A' },
    { name: 'Ibrahim Siddiqui', role: 'Co-Founder', avatar: 'I' },
  ];
  return (
    <section id="team" className="bg-[#F8F8FA] py-32 px-6">
      <div className="max-w-7xl mx-auto text-center">
        <p className="reveal text-xs font-bold tracking-widest text-uae-green uppercase mb-4">
          The Team
        </p>
        <h2
          className="reveal text-5xl font-black text-gray-900 leading-tight mb-4"
          style={{ transitionDelay: '100ms' }}
        >
          Year 9 students. Global ambition.
        </h2>
        <p
          className="reveal text-gray-600 text-lg max-w-2xl mx-auto mb-6"
          style={{ transitionDelay: '200ms' }}
        >
          Islaa7 was created for the{' '}
          <strong>GEMS Global Innovation Challenge 2025–26</strong>, aligned with
          UN Sustainable Development Goal 12: Responsible Consumption and
          Production.
        </p>
        <div
          className="reveal inline-flex items-center gap-2 px-4 py-2 rounded-full border border-uae-green/30 bg-uae-green/5 mb-16"
          style={{ transitionDelay: '300ms' }}
        >
          <span className="w-2 h-2 rounded-full bg-uae-green" />
          <span className="text-uae-green text-sm font-semibold">
            UN SDG 12 · Responsible Consumption & Production
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {team.map((member, i) => (
            <div
              key={i}
              className="reveal hover-lift flex flex-col items-center"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="w-20 h-20 rounded-2xl gold-gradient flex items-center justify-center text-2xl font-black text-white mb-4 shadow-lg animate-pulse-glow">
                {member.avatar}
              </div>
              <p className="text-gray-900 font-bold text-sm">{member.name}</p>
              <p className="text-gray-500 text-xs">{member.role}</p>
            </div>
          ))}
        </div>

        {/* SDG badges */}
        <div className="reveal mt-20 flex flex-wrap justify-center gap-4" style={{ transitionDelay: '500ms' }}>
          {[
            { emoji: '🌱', label: 'Sustainability' },
            { emoji: '♻️', label: 'Circular Economy' },
            { emoji: '🤝', label: 'Fair Work' },
          ].map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm"
            >
              <span>{badge.emoji}</span>
              <span className="text-gray-700 text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Market Plan CTA ────────────────────────────────────────────── */
function MarketPlanCTASection() {
  return (
    <section className="bg-black py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <div
          className="reveal rounded-3xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)',
            border: '1px solid rgba(194,155,64,0.2)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 70% 50%, rgba(194,155,64,0.2) 0%, transparent 60%)',
            }}
          />
          <div className="relative z-10 p-12 lg:p-16">
            <p className="text-xs font-bold tracking-widest text-uae-gold uppercase mb-4">
              Market Opportunity
            </p>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
              A $2.8B market.<br />We're just getting started.
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl leading-relaxed">
              The UAE waste management and repair services market represents a
              massive underserved opportunity. View our full market analysis,
              revenue projections, and go-to-market strategy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/market-plan"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-black gold-gradient hover:opacity-90 hover:scale-105 transition-all duration-200"
              >
                View Market Plan →
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-white border border-white/20 bg-white/5 hover:bg-white/10 hover:scale-105 transition-all duration-200"
              >
                Try the Platform
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────── */
function LandingFooter() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <footer className="bg-black border-t border-white/10 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
                <span className="text-white font-black text-sm">إ</span>
              </div>
              <span className="text-white font-bold text-lg">ISLAA7 · إصلاح</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              Don't Bin It Book It. Reducing waste, one repair at a time.
            </p>
            <p className="text-uae-gold text-xs mt-4 font-semibold">
              Don't Bin It, Book It™
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">
                Platform
              </p>
              <div className="flex flex-col gap-3">
                {['Book a Repair', 'For Technicians', 'Rewards', 'Admin Portal'].map((l) => (
                  <Link
                    key={l}
                    to="/login"
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">
                Company
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => scrollTo('about')}
                  className="text-gray-500 hover:text-gray-300 text-sm transition-colors text-left bg-transparent border-none cursor-pointer"
                >
                  About Us
                </button>
                <Link
                  to="/market-plan"
                  className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                  Market Plan
                </Link>
                <button
                  onClick={() => scrollTo('team')}
                  className="text-gray-500 hover:text-gray-300 text-sm transition-colors text-left bg-transparent border-none cursor-pointer"
                >
                  Team
                </button>
                <span className="text-gray-500 text-sm">SDG 12</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-xs">
            © 2025–26 ISLAA7 · GEMS Global Innovation Challenge · UAE
          </p>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-xs">Powered by</span>
            <span className="text-uae-gold text-xs font-semibold">
              Groq AI · Supabase
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main Export ────────────────────────────────────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useScrollReveal();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="bg-black text-white overflow-x-hidden">
      <Navbar scrolled={scrolled} />
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <HowItWorksSection />
      <WhySection />
      <RewardsSection />
      <NextStepsSection />
      <TeamSection />
      <MarketPlanCTASection />
      <LandingFooter />
    </div>
  );
}
