import React from 'react';
import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  showRadialGradient?: boolean;
}

export function AuroraBackground({
  children,
  className,
  showRadialGradient = true,
}: AuroraBackgroundProps) {
  return (
    <div className={cn('relative bg-[#030304]', className)}>
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Aurora gradient layer — animated */}
        <div
          className="absolute inset-[-20%] animate-aurora"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(100deg, #C29B40 0%, #C29B40 7%, transparent 10%, transparent 12%, #00732F 16%)',
              'repeating-linear-gradient(100deg, #E6C268 0%, #00A86B 10%, transparent 20%, transparent 23%, #9B7730 40%)',
            ].join(', '),
            backgroundSize: '300% 200%, 200% 300%',
            filter: 'blur(72px) saturate(1.4)',
            opacity: 0.45,
            mixBlendMode: 'screen',
          }}
        />
        {/* Second layer with offset timing for depth */}
        <div
          className="absolute inset-[-10%] animate-aurora"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(80deg, transparent 0%, #C29B40 15%, transparent 25%, #00732F 40%, transparent 55%)',
              'repeating-linear-gradient(130deg, #E6C268 0%, transparent 20%, #00A86B 35%, transparent 50%)',
            ].join(', '),
            backgroundSize: '400% 200%, 300% 400%',
            filter: 'blur(100px)',
            opacity: 0.25,
            animationDuration: '90s',
            animationDirection: 'reverse',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* Radial vignette to pull focus inward */}
      {showRadialGradient && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(3,3,4,0.85) 100%)',
          }}
          aria-hidden="true"
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
