import React from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  /** تدرج CSS كامل، مثل: linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%) */
  gradient: string;
  /** تأخير دخول البطاقة بالثواني */
  delay?: number;
}

/** بطاقة ميزة متوهجة: توهج مموّه خلف البطاقة + حد متدرج 8px عبر background-clip. */
export function FeatureCard({ title, description, icon, gradient, delay = 0 }: FeatureCardProps) {
  return (
    <div
      className="feature-rise relative flex flex-col justify-start items-start w-full max-w-[260px] md:max-w-[300px] group mx-auto"
      style={{ animation: `feature-rise 0.8s ease-out ${delay}s both` }}
    >
      <div
        className="absolute w-full h-[260px] md:h-[300px] opacity-60 rounded-[40px] pointer-events-none"
        style={{ background: gradient, filter: 'blur(45px)' }}
        aria-hidden="true"
      />
      <div
        className="relative self-stretch h-[260px] md:h-[300px] rounded-[40px] z-10 overflow-hidden"
        style={{
          border: '8px solid transparent',
          background: `linear-gradient(#1A1A1C, #1A1A1C) padding-box, ${gradient} border-box`,
        }}
      >
        <div className="w-full h-full p-7 flex flex-col justify-between">
          <div className="text-white/90">{icon}</div>
          <div>
            <h3 className="text-white font-medium text-xl mb-3 tracking-tight">{title}</h3>
            <p className="text-gray-400 text-[14px] leading-[1.6] font-normal selection:bg-white/20">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
