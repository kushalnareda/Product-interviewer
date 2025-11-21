import React from 'react';

interface VisualizerProps {
  isActive: boolean;
  isSpeaking: boolean; // Is the AI speaking?
  isListening: boolean; // Is the User speaking (mic active)?
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, isSpeaking, isListening }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 w-full bg-slate-900 rounded-2xl relative overflow-hidden">
      {!isActive && (
         <div className="text-slate-500 text-sm">Session Disconnected</div>
      )}
      
      {isActive && (
        <div className="relative flex items-center justify-center w-full h-full">
           {/* AI Indicator - Central Orb */}
           <div className={`transition-all duration-500 ease-in-out rounded-full blur-xl absolute
             ${isSpeaking ? 'w-48 h-48 bg-indigo-500/40 animate-pulse' : 'w-24 h-24 bg-indigo-500/10'}
           `}></div>
           
           <div className={`transition-all duration-300 ease-in-out rounded-full z-10 flex items-center justify-center border-2
             ${isSpeaking ? 'w-32 h-32 border-indigo-400 shadow-[0_0_40px_rgba(129,140,248,0.5)]' : 'w-20 h-20 border-slate-700'}
           `}>
              {isSpeaking && <div className="w-full h-1 bg-indigo-400 animate-ping rounded-full opacity-75"></div>}
              {!isSpeaking && <div className="w-2 h-2 bg-slate-500 rounded-full"></div>}
           </div>

           {/* User Mic Indicator */}
           <div className={`absolute bottom-6 flex gap-1 items-end h-8 transition-opacity duration-300 ${isListening ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`w-1 bg-emerald-400 rounded-full ${isListening ? 'animate-[bounce_1s_infinite] h-4' : 'h-1'}`}></div>
              <div className={`w-1 bg-emerald-400 rounded-full ${isListening ? 'animate-[bounce_1.2s_infinite] h-6' : 'h-1'}`}></div>
              <div className={`w-1 bg-emerald-400 rounded-full ${isListening ? 'animate-[bounce_0.8s_infinite] h-3' : 'h-1'}`}></div>
           </div>
        </div>
      )}
    </div>
  );
};