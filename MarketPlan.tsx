import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from './LandingPage';

/* ─── Animated Bar ───────────────────────────────────────────────── */
function AnimatedBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setWidth(pct);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pct]);
  return (
    <div ref={ref} className="mb-5">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-300 font-medium">{label}</span>
        <span className="text-gray-400 font-mono text-xs">{value}</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: `${width}%`,
            transition: 'width 1.4s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
    </div>
  );
}

/* ─── SVG Growth Chart ───────────────────────────────────────────── */
function GrowthChart() {
  const data = [
    { year: 'Y1', repairs: 5000 },
    { year: 'Y2', repairs: 15000 },
    { year: 'Y3', repairs: 50000 },
    { year: 'Y4', repairs: 100000 },
    { year: 'Y5', repairs: 200000 },
  ];
  const [animated, setAnimated] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setAnimated(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const W = 600,
    H = 220;
  const padL = 20,
    padR = 20,
    padT = 20,
    padB = 40;
  const maxVal = 200000;
  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * (W - padL - padR),
    y: H - padB - (d.repairs / maxVal) * (H - padT - padB),
    ...d,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${H - padB} L${pts[0].x},${H - padB} Z`;

  return (
    <div ref={triggerRef} className="rounded-2xl landing-glass p-6 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C29B40" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C29B40" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line
            key={i}
            x1={padL}
            y1={padT + p * (H - padT - padB)}
            x2={W - padR}
            y2={padT + p * (H - padT - padB)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#chartAreaGrad)"
          opacity={animated ? 0.6 : 0}
          style={{ transition: 'opacity 1s ease' }}
        />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#C29B40"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1100"
          strokeDashoffset={animated ? 0 : 1100}
          style={{ transition: 'stroke-dashoffset 2.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Points + labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill="#C29B40"
              opacity={animated ? 1 : 0}
              style={{ transition: `opacity 0.3s ease ${0.8 + i * 0.18}s` }}
            />
            <text
              x={p.x}
              y={H - 5}
              textAnchor="middle"
              fill="#6b7280"
              fontSize="11"
            >
              {p.year}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-gray-500 text-xs mt-2">
        Annual repairs/month — Conservative projections
      </p>
    </div>
  );
}

/* ─── Main MarketPlan Page ───────────────────────────────────────── */
export default function MarketPlan() {
  useScrollReveal();

  return (
    <div className="bg-[#050508] text-white min-h-screen">
      {/* Sticky nav */}
      <nav className="navbar-glass fixed top-0 inset-x-0 z-50 h-14 flex items-center px-6">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <span>←</span>
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg gold-gradient flex items-center justify-center">
              <span className="text-white font-black text-xs">إ</span>
            </div>
            <span className="text-white font-bold text-sm hidden sm:block">
              ISLAA7 · Market Plan
            </span>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 rounded-full text-xs font-semibold text-black gold-gradient hover:opacity-90 transition-all"
          >
            Try Platform →
          </Link>
        </div>
      </nav>

      {/* Page header */}
      <div className="pt-14 relative overflow-hidden">
        <div className="py-28 px-6 relative border-b border-white/10">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 110%, rgba(194,155,64,0.15) 0%, transparent 70%)',
            }}
          />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-uae-gold/30 bg-uae-gold/10 mb-8">
              <span className="text-uae-gold text-xs font-bold tracking-widest uppercase">
                ⚠ Sample Data — Illustrative Projections Only
              </span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight mb-6">
              Market Plan
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">
              Islaa7's path to becoming the UAE's leading platform for the repair
              economy. Real data will replace all projections upon live launch.
            </p>
          </div>
        </div>
      </div>

      {/* ── TAM / SAM / SOM ─────────────────────────────────────────── */}
      <section className="py-24 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="reveal text-xs text-uae-gold font-bold uppercase tracking-widest mb-4">
            Market Opportunity
          </p>
          <h2
            className="reveal text-4xl font-black text-white mb-16"
            style={{ transitionDelay: '100ms' }}
          >
            Total Addressable Market
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                label: 'TAM',
                sublabel: 'Total Addressable Market',
                value: '$2.8B',
                desc: 'UAE total waste management & repair services market',
                colorClass: 'border-uae-gold/30 bg-uae-gold/5',
                textClass: 'gradient-text-gold',
              },
              {
                label: 'SAM',
                sublabel: 'Serviceable Available Market',
                value: '$420M',
                desc: 'Residential repairable items in major UAE emirates',
                colorClass: 'border-uae-green/30 bg-uae-green/5',
                textClass: 'text-uae-green',
              },
              {
                label: 'SOM',
                sublabel: 'Serviceable Obtainable Market',
                value: '$42M',
                desc: 'Realistic capture in first 3 years post-launch',
                colorClass: 'border-blue-500/30 bg-blue-500/5',
                textClass: 'text-blue-400',
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`reveal hover-lift p-8 rounded-3xl border ${item.colorClass}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <p className="text-5xl font-black text-white mb-2">{item.label}</p>
                <p className={`text-5xl font-black mb-3 ${item.textClass}`}>
                  {item.value}
                </p>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
                  {item.sublabel}
                </p>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="reveal landing-glass p-8 rounded-3xl">
            <p className="text-white font-bold mb-8 text-lg">
              UAE Repair Market Breakdown by Category
            </p>
            <AnimatedBar
              label="Appliances & Electronics"
              value="5,600 t/yr (35%)"
              pct={100}
              color="bg-uae-gold"
            />
            <AnimatedBar
              label="Furniture & Home Items"
              value="4,000 t/yr (25%)"
              pct={71}
              color="bg-blue-400"
            />
            <AnimatedBar
              label="Garments & Textiles"
              value="3,200 t/yr (20%)"
              pct={57}
              color="bg-purple-400"
            />
            <AnimatedBar
              label="Kitchenware & Utensils"
              value="1,800 t/yr (11%)"
              pct={32}
              color="bg-green-400"
            />
            <AnimatedBar
              label="Other Repairable Items"
              value="1,400 t/yr (9%)"
              pct={25}
              color="bg-orange-400"
            />
          </div>
        </div>
      </section>

      {/* ── Revenue Model ───────────────────────────────────────────── */}
      <section className="py-24 px-6 border-b border-white/10 bg-white">
        <div className="max-w-7xl mx-auto">
          <p className="reveal text-xs text-uae-green font-bold uppercase tracking-widest mb-4">
            Revenue Model
          </p>
          <h2
            className="reveal text-4xl font-black text-gray-900 mb-4"
            style={{ transitionDelay: '100ms' }}
          >
            How Islaa7 Makes Money
          </h2>
          <p
            className="reveal text-gray-600 text-lg mb-16 max-w-2xl"
            style={{ transitionDelay: '200ms' }}
          >
            A simple, transparent model designed to maximise worker take-home and
            platform adoption.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="reveal space-y-4">
              <div className="p-6 rounded-2xl bg-gray-900 text-white">
                <p className="text-gray-400 text-sm mb-1">Average repair value</p>
                <p className="text-5xl font-black text-uae-gold">AED 120</p>
                <p className="text-gray-500 text-xs mt-2">
                  Platform earns AED 8.40 · Worker earns AED 111.60
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-800 font-semibold">Worker Earnings</span>
                  <span className="text-3xl font-black text-gray-900">93%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-uae-green rounded-full" style={{ width: '93%' }} />
                </div>
                <p className="text-gray-500 text-xs mt-2">Workers set their own prices. Platform never undercuts.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-800 font-semibold">Platform Commission</span>
                  <span className="text-3xl font-black text-gray-900">7%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-uae-gold rounded-full" style={{ width: '7%' }} />
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Covers platform operations, AI, escrow & rewards costs.
                </p>
              </div>
            </div>

            <div className="reveal-right space-y-3">
              <p className="text-gray-700 font-bold mb-4">Monthly Revenue Projections</p>
              {[
                { label: 'Year 1', repairs: '5,000/mo', revenue: 'AED 42K/mo' },
                { label: 'Year 2', repairs: '15,000/mo', revenue: 'AED 126K/mo' },
                { label: 'Year 3', repairs: '50,000/mo', revenue: 'AED 420K/mo' },
                { label: 'Year 4', repairs: '100,000/mo', revenue: 'AED 840K/mo' },
                { label: 'Year 5', repairs: '200,000/mo', revenue: 'AED 1.68M/mo' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-5 rounded-2xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors hover-lift"
                >
                  <div>
                    <p className="text-gray-800 font-bold">{item.label}</p>
                    <p className="text-gray-500 text-xs">{item.repairs}</p>
                  </div>
                  <p className="text-gray-900 font-black">{item.revenue}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Growth Projections ──────────────────────────────────────── */}
      <section className="py-24 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="reveal text-xs text-uae-gold font-bold uppercase tracking-widest mb-4">
            Growth Projections
          </p>
          <h2
            className="reveal text-4xl font-black text-white mb-4"
            style={{ transitionDelay: '100ms' }}
          >
            5-Year Outlook
          </h2>
          <p
            className="reveal text-gray-400 text-lg mb-12 max-w-xl"
            style={{ transitionDelay: '200ms' }}
          >
            Conservative projections based on UAE app adoption rates and existing
            repair market research. All numbers are sample data.
          </p>

          <div className="reveal mb-10">
            <GrowthChart />
          </div>

          <div className="reveal grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { year: 'Year 1', repairs: '5K', revenue: 'AED 504K/yr' },
              { year: 'Year 2', repairs: '15K', revenue: 'AED 1.57M/yr' },
              { year: 'Year 3', repairs: '50K', revenue: 'AED 5.46M/yr' },
              { year: 'Year 4', repairs: '100K', revenue: 'AED 11.3M/yr' },
              { year: 'Year 5', repairs: '200K', revenue: 'AED 23.5M/yr' },
            ].map((item, i) => (
              <div
                key={i}
                className="hover-lift p-5 rounded-2xl landing-glass text-center"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
                  {item.year}
                </p>
                <p className="text-white text-2xl font-black">{item.repairs}</p>
                <p className="text-uae-gold text-xs font-semibold mt-1">repairs/mo</p>
                <p className="text-gray-500 text-xs mt-2">{item.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Go-to-Market ────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-b border-white/10 bg-white">
        <div className="max-w-7xl mx-auto">
          <p className="reveal text-xs text-uae-green font-bold uppercase tracking-widest mb-4">
            Strategy
          </p>
          <h2
            className="reveal text-4xl font-black text-gray-900 mb-16"
            style={{ transitionDelay: '100ms' }}
          >
            Go-to-Market Phases
          </h2>

          <div className="space-y-6">
            {[
              {
                phase: '01',
                title: 'Al Raha Beach Pilot',
                timeline: 'Months 0–6',
                desc: 'Launch in Al Raha Beach with 50 verified technicians. Focus on appliances and furniture. Validate the model, iterate on UX, collect real repair data to replace all projections.',
                targets: [
                  '500 registered users',
                  '200 repairs completed',
                  '4.5+ average rating',
                  'Gov. partnership established',
                ],
                colorClass: 'border-uae-gold/40 bg-uae-gold/5',
              },
              {
                phase: '02',
                title: 'Abu Dhabi Expansion',
                timeline: 'Months 6–18',
                desc: 'Scale to all Abu Dhabi neighbourhoods. Onboard 500+ technicians across all categories. Partner with local government for citizen outreach and digital marketing campaigns.',
                targets: [
                  '10,000 registered users',
                  '5,000 repairs/month',
                  'Government endorsement',
                  'UAE Pass fully integrated',
                ],
                colorClass: 'border-uae-green/40 bg-uae-green/5',
              },
              {
                phase: '03',
                title: 'UAE-Wide Launch',
                timeline: 'Months 18–36',
                desc: 'Expand to Dubai, Sharjah, Ajman. Integrate UAE Pass nationwide. Launch targeted rewards partnerships with major UAE retailers and hospitality brands.',
                targets: [
                  '100,000 registered users',
                  '50,000 repairs/month',
                  'AED 420K/month revenue',
                  'National media coverage',
                ],
                colorClass: 'border-blue-500/40 bg-blue-500/5',
              },
              {
                phase: '04',
                title: 'GCC Expansion',
                timeline: 'Months 36+',
                desc: 'Adapt platform for Saudi Arabia, Kuwait, and Qatar. Explore B2B enterprise tier for hospitality and commercial sectors. Regional SDG reporting and impact measurement.',
                targets: [
                  'GCC-wide presence',
                  'B2B enterprise tier',
                  'Regional SDG reporting',
                  '1M+ repairs/year',
                ],
                colorClass: 'border-purple-500/40 bg-purple-500/5',
              },
            ].map((phase, i) => (
              <div
                key={i}
                className={`reveal p-8 rounded-3xl border ${phase.colorClass}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center text-white font-black text-sm shadow-lg">
                      {phase.phase}
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                      {phase.timeline}
                    </span>
                    <h3 className="text-gray-900 text-xl font-black mt-1 mb-3">
                      {phase.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {phase.desc}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {phase.targets.map((t, j) => (
                        <span
                          key={j}
                          className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200"
                        >
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Competitive Analysis ────────────────────────────────────── */}
      <section className="py-24 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="reveal text-xs text-uae-gold font-bold uppercase tracking-widest mb-4">
            Competitive Landscape
          </p>
          <h2
            className="reveal text-4xl font-black text-white mb-16"
            style={{ transitionDelay: '100ms' }}
          >
            Why Islaa7 Wins
          </h2>

          <div className="reveal overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-semibold w-1/3">
                    Feature
                  </th>
                  {['ISLAA7', 'Traditional Repairmen', 'Handyman Apps', 'DIY'].map((h) => (
                    <th
                      key={h}
                      className={`text-center py-4 px-4 font-semibold ${
                        h === 'ISLAA7' ? 'text-uae-gold' : 'text-gray-500'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Government-backed', '✓', '✗', '✗', '✗'],
                  ['UAE Pass integration', '✓', '✗', '✗', '✗'],
                  ['AI damage assessment', '✓', '✗', '✗', '✗'],
                  ['Transparent pricing', '✓', '✗', 'Partial', '✗'],
                  ['Verified technicians', '✓', 'Varies', 'Partial', '✗'],
                  ['Rewards programme', '✓', '✗', '✗', '✗'],
                  ['Payment escrow', '✓', '✗', 'Partial', '✗'],
                  ['Arabic / RTL support', '✓', 'N/A', 'Partial', 'N/A'],
                  ['SDG impact tracking', '✓', '✗', '✗', '✗'],
                ].map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 px-4 text-gray-300">{row[0]}</td>
                    {row.slice(1).map((cell, j) => (
                      <td
                        key={j}
                        className={`py-4 px-4 text-center font-semibold ${
                          j === 0
                            ? cell === '✓'
                              ? 'text-uae-gold'
                              : 'text-gray-600'
                            : cell === '✓'
                            ? 'text-green-400'
                            : cell === '✗'
                            ? 'text-red-500/60'
                            : 'text-gray-500'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Financial Summary ───────────────────────────────────────── */}
      <section className="py-24 px-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="reveal text-xs text-uae-gold font-bold uppercase tracking-widest mb-4">
            Financials
          </p>
          <h2
            className="reveal text-4xl font-black text-white mb-3"
            style={{ transitionDelay: '100ms' }}
          >
            Financial Summary
          </h2>
          <p
            className="reveal text-gray-500 text-sm italic mb-12"
            style={{ transitionDelay: '200ms' }}
          >
            * All figures are illustrative sample projections. Subject to revision
            upon live launch.
          </p>

          <div className="reveal overflow-x-auto">
            <table className="w-full text-sm landing-glass rounded-3xl overflow-hidden min-w-[700px]">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left py-5 px-6 text-gray-400 font-semibold">
                    Metric
                  </th>
                  {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'].map((y) => (
                    <th
                      key={y}
                      className="text-right py-5 px-6 text-gray-400 font-semibold"
                    >
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: 'Repairs / Month',
                    values: ['5,000', '15,000', '50,000', '100,000', '200,000'],
                    highlight: false,
                  },
                  {
                    label: 'Avg. Repair Value (AED)',
                    values: ['120', '125', '130', '135', '140'],
                    highlight: false,
                  },
                  {
                    label: 'Monthly GMV (AED)',
                    values: ['600K', '1.875M', '6.5M', '13.5M', '28M'],
                    highlight: false,
                  },
                  {
                    label: 'Platform Revenue / Month',
                    values: ['42K', '131K', '455K', '945K', '1.96M'],
                    highlight: true,
                  },
                  {
                    label: 'Annual Revenue (AED)',
                    values: ['504K', '1.57M', '5.46M', '11.3M', '23.5M'],
                    highlight: true,
                  },
                  {
                    label: 'Active Technicians',
                    values: ['50', '250', '1,000', '2,500', '5,000'],
                    highlight: false,
                  },
                  {
                    label: 'Registered Users',
                    values: ['2,000', '10,000', '50,000', '150,000', '400,000'],
                    highlight: false,
                  },
                ].map((row, i) => (
                  <tr
                    key={i}
                    className={`border-t border-white/5 ${row.highlight ? 'bg-uae-gold/5' : ''}`}
                  >
                    <td
                      className={`py-4 px-6 font-medium ${
                        row.highlight ? 'text-uae-gold' : 'text-gray-300'
                      }`}
                    >
                      {row.label}
                    </td>
                    {row.values.map((v, j) => (
                      <td
                        key={j}
                        className={`py-4 px-6 text-right ${
                          row.highlight ? 'text-uae-gold font-bold' : 'text-gray-400'
                        }`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="reveal text-4xl font-black text-white mb-6">
            Ready to invest in sustainability?
          </h2>
          <p
            className="reveal text-gray-400 text-lg mb-10 leading-relaxed"
            style={{ transitionDelay: '100ms' }}
          >
            Islaa7 is more than a platform — it's a movement to reshape the UAE's
            relationship with consumption and waste. The opportunity is real.
          </p>
          <div
            className="reveal flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ transitionDelay: '200ms' }}
          >
            <Link
              to="/"
              className="px-8 py-4 rounded-full font-bold text-black gold-gradient hover:opacity-90 hover:scale-105 transition-all duration-200"
            >
              ← Back to Home
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 rounded-full font-bold text-white border border-white/20 bg-white/5 hover:bg-white/10 hover:scale-105 transition-all duration-200"
            >
              Try the Platform
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
