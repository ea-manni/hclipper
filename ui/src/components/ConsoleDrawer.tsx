import React, { useEffect, useRef } from 'react';
import { Terminal, X, Trash2 } from 'lucide-react';

interface ConsoleDrawerProps {
  show: boolean;
  onClose: () => void;
  logs: string[];
  onClear: () => void;
}

export const ConsoleDrawer: React.FC<ConsoleDrawerProps> = ({ 
  show, 
  onClose, 
  logs, 
  onClear 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!show) return null;

  return (
    <div className="h-48 border-t border-white/10 bg-[#07090e] flex flex-col shrink-0 select-none">
      <div className="h-8 px-4 border-b border-white/5 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>Python Engine Subprocess Output (JSON-RPC / Stdout)</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={onClear}
            className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 p-3 font-mono text-[11px] text-slate-300 overflow-y-auto space-y-1 select-text bg-[#090b10]"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">No engine logs recorded yet. Run a pipeline command to stream output.</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="leading-relaxed">
              <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
              <span className={log.includes('error') || log.includes('Error') ? 'text-red-400' : log.includes('SUCCESS') || log.includes('finished') ? 'text-emerald-400' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
