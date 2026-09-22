import React from 'react';

const AuthLayout = ({ children, pageType = 'login' }) => {
  return (
    <div className="auth-page bg-surface dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row min-h-screen w-screen overflow-x-hidden select-none">

      {/* LEFT HALF — Smart Agriculture Brand Panel (50% Width on Desktop/Laptop) */}
      <div className="auth-split-left hidden lg:flex lg:w-1/2 xl:w-1/2 h-screen sticky top-0 bg-gradient-to-br from-slate-950 via-emerald-950/90 to-slate-900 border-r border-slate-800 shrink-0 relative overflow-hidden">

        {/* Soft Ambient Light Gradient Orbs (No raster image) */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Agricultural Animations (Growing crops, swaying wheat, floating leaves) */}
        <div className="absolute top-10 left-10 text-emerald-300/30 text-3xl animate-leaf-1 pointer-events-none">
          <i className="fas fa-leaf"></i>
        </div>
        <div className="absolute bottom-32 left-20 text-emerald-400/30 text-4xl animate-leaf-2 pointer-events-none">
          <i className="fas fa-leaf"></i>
        </div>
        <div className="absolute top-1/3 left-12 text-amber-300/25 text-2xl animate-leaf-3 pointer-events-none">
          <i className="fas fa-wheat-awn"></i>
        </div>
        <div className="absolute bottom-16 right-16 text-emerald-400/25 text-5xl animate-sway pointer-events-none">
          <i className="fas fa-plant-wilt"></i>
        </div>
        <div className="absolute bottom-6 left-1/3 text-emerald-300/25 text-4xl animate-crop-grow pointer-events-none">
          <i className="fas fa-seedling"></i>
        </div>

        {/* Subtle AI Orbital Node Glow */}
        <div className="absolute top-16 left-1/4 w-36 h-36 bg-brand-accent/20 rounded-full animate-pulse-glow pointer-events-none blur-xl"></div>

        {/* Left Section Vertical Content Structure */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 h-full text-white w-full pointer-events-none">

          {/* 1. Top Logo Badge */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#22C55E] flex items-center justify-center text-[#17231C] text-xl font-bold shadow-lg">
              <i className="fas fa-leaf"></i>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                Phoenix AI
              </span>
              <p className="text-[9px] uppercase font-bold tracking-widest text-[#A7F3D0]">
                Technology for a Greener Tomorrow
              </p>
            </div>
          </div>

          {/* 2 & 3. Main Agricultural Heading & Description */}
          <div className="max-w-md space-y-3.5 my-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#A7F3D0] text-xs font-semibold backdrop-blur-md">
              <i className="fas fa-seedling"></i> Smart Agriculture + Technology
            </div>
            <h2 className="font-extrabold text-3xl xl:text-4xl text-white leading-tight tracking-tight">
              Technology for a <span className="text-[#22C55E]">Greener Tomorrow</span>
            </h2>
            <p className="text-white/90 text-xs xl:text-sm leading-relaxed font-normal">
              Empowering farmers with AI crop advisories, real-time Mandi crop prices, weather forecasts, and government scheme updates.
            </p>

            {/* 4. Feature Badges */}
            <div className="pt-1 flex flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-medium">
                <i className="fas fa-chart-line text-[#F59E0B]"></i> Mandi Prices
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-medium">
                <i className="fas fa-cloud-sun text-[#22C55E]"></i> Weather Forecasts
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-medium">
                <i className="fas fa-microchip text-[#10B981]"></i> AI Advisory
              </div>
            </div>
          </div>

          {/* 5 & 6. Footer Text & Live Engine Indicator */}
          <div className="flex items-center justify-between text-xs text-white/80 border-t border-white/15 pt-4">
            <span>© 2026 Phoenix AI Agriculture Platform</span>
            <span className="flex items-center gap-1.5 text-[#22C55E] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping"></span> Live System
            </span>
          </div>

        </div>

      </div>

      {/* RIGHT HALF — Authentication Form Container (50% Width on Desktop/Laptop) */}
      <div className="auth-split-right w-full lg:w-1/2 xl:w-1/2 h-full bg-surface dark:bg-slate-950 p-4 sm:p-6 lg:p-8 xl:p-12 overflow-hidden z-10 relative flex flex-col justify-between">

        {/* Centered Form Component Card */}
        <div className="my-auto w-full max-w-[460px] mx-auto view-transition z-10">
          {children}
        </div>

        {/* Sub-footer */}
        <div className="text-center pt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium shrink-0 z-10">
          © 2026 Phoenix AI Smart Agriculture Platform. All rights reserved.
        </div>

      </div>

    </div>
  );
};

export default AuthLayout;
