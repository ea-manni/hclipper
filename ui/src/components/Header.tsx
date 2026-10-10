import React from 'react';
import { Sparkles, Cpu, ShieldCheck, Video } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="h-14 border-b border-white/5 bg-[#0d111a]/80 backdrop-blur-md px-5 flex items-center justify-between select-none">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Video className="w-4 h-4 text-slate-950 font-bold" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-extrabold tracking-tight text-white font-display">hclipper</span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20">
              v1.0 Studio
            </span>
          </div>
          <p className="text-[10px] text-slate-400 -mt-0.5">100% Local AI Video Repurposing</p>
        </div>
      </div>

      {/* Engine Status Indicators */}
      <div className="flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-medium text-[11px]">Intel QSV Hardware Accel</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium text-[11px]">YuNet ONNX Face Tracker Ready</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-[11px]">Local Privacy: Zero Cloud</span>
        </div>
      </div>
    </header>
  );
};
