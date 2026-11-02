import React, { useState } from 'react';
import { Wifi, Battery, RotateCw, Monitor, Smartphone } from 'lucide-react';

interface PhoneSimulatorFrameProps {
  children: React.ReactNode;
  isPhoneFrame: boolean;
  setIsPhoneFrame: (val: boolean) => void;
}

export const PhoneSimulatorFrame: React.FC<PhoneSimulatorFrameProps> = ({
  children,
  isPhoneFrame,
  setIsPhoneFrame,
}) => {
  const [isLandscape, setIsLandscape] = useState(true); // DAWs default to landscape on phones/tablets

  if (!isPhoneFrame) {
    return <div className="w-full h-full flex flex-col">{children}</div>;
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#070707] p-2 sm:p-6 overflow-hidden">
      {/* Top Device Orientation Switcher Bar */}
      <div className="flex items-center gap-3 mb-3 text-xs text-neutral-400">
        <span className="font-mono text-amber-400 font-bold">Google Pixel 9 Pro Simulator</span>
        <span>•</span>
        <button
          onClick={() => setIsLandscape(!isLandscape)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition"
        >
          <RotateCw className="w-3.5 h-3.5 text-amber-400" />
          <span>{isLandscape ? 'Landscape (DAW Mode)' : 'Portrait Mode'}</span>
        </button>
        <button
          onClick={() => setIsPhoneFrame(false)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition"
        >
          <Monitor className="w-3.5 h-3.5 text-cyan-400" />
          <span>Wide Studio</span>
        </button>
      </div>

      {/* Phone Hardware Chassis */}
      <div
        className={`relative bg-[#101010] border-[8px] border-[#252525] rounded-[42px] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isLandscape
            ? 'w-[96vw] max-w-[1080px] h-[85vh] max-h-[640px]'
            : 'w-[390px] h-[85vh] max-h-[820px]'
        }`}
      >
        {/* Android 15 Status Bar */}
        <div className="h-6 bg-black/90 text-neutral-400 flex items-center justify-between px-5 text-[11px] font-mono shrink-0 select-none z-30">
          <div className="flex items-center gap-1.5">
            <span>9:41</span>
            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">5G</span>
          </div>

          {/* Camera Notch */}
          <div className="w-3.5 h-3.5 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-950/80" />
          </div>

          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-neutral-300" />
            <span className="text-[10px]">100%</span>
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Embedded Application Screen */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-[#0a0a0a]">
          {children}
        </div>

        {/* Android Home Navigation Gesture Bar */}
        <div className="h-5 bg-black/90 flex items-center justify-center shrink-0 z-30">
          <div className="w-32 h-1 bg-neutral-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
