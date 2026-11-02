import React from 'react';
import {
  X,
  MapPin,
  Phone,
  User,
  Mic,
  Music,
  Sliders,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { DhwoniLogo } from './DhwoniLogo';

interface StudioInfoModalProps {
  onClose: () => void;
  onLoadAssamDemo: () => void;
}

export const StudioInfoModal: React.FC<StudioInfoModalProps> = ({
  onClose,
  onLoadAssamDemo,
}) => {
  const phoneNumbers = [
    { num: '6001021556', label: 'Primary Studio Line' },
    { num: '9101004124', label: 'Music Direction & Booking' },
    { num: '7086451350', label: 'Production Desk' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-xl bg-[#121212] border border-[#dfb743]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[92vh]">
        {/* Top Gold Border Glow */}
        <div className="h-1 bg-gradient-to-r from-amber-600 via-[#dfb743] to-amber-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#161616]">
          <div className="flex items-center gap-3">
            <DhwoniLogo size={42} />
            <div>
              <h2 className="text-base font-bold font-serif text-[#e5c158] tracking-wide">
                DHWONI (STUDIO) • ধ্বনি
              </h2>
              <p className="text-[11px] text-neutral-400 font-mono">
                Upper Temera Gaon, Golaghat, Assam
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
          {/* Main Studio Location Banner */}
          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                MAIN STUDIO LOCATION
              </span>
              <h3 className="text-sm font-bold text-neutral-100 mt-0.5">
                Joraguri Temera Gaon, Golaghat, Assam
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Upper Temera Gaon, Golaghat, Assam • Professional Music Production, Multi-track Vocal Tracking, Mixing & Mastering
              </p>
            </div>
          </div>

          {/* Studio Team & Artists Directory */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
              STUDIO TEAM & ARTISTS
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Studio Manager / Music Edis */}
              <div className="p-3 rounded-xl bg-[#161616] border border-neutral-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-[#dfb743] flex items-center justify-center font-bold text-sm shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-neutral-400 font-mono block">
                    Studio Manager (Music Edis)
                  </span>
                  <span className="text-xs font-bold text-neutral-100">
                    Biplab Loying
                  </span>
                </div>
              </div>

              {/* Musician */}
              <div className="p-3 rounded-xl bg-[#161616] border border-neutral-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-neutral-400 font-mono block">
                    Musician & Instrumentalist
                  </span>
                  <span className="text-xs font-bold text-neutral-100">
                    Anubhov Loying
                  </span>
                </div>
              </div>

              {/* Singer 1 */}
              <div className="p-3 rounded-xl bg-[#161616] border border-neutral-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-neutral-400 font-mono block">
                    Lead Singer
                  </span>
                  <span className="text-xs font-bold text-neutral-100">
                    Anurag Loying
                  </span>
                </div>
              </div>

              {/* Singer 2 */}
              <div className="p-3 rounded-xl bg-[#161616] border border-neutral-800 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-neutral-400 font-mono block">
                    Lead Singer
                  </span>
                  <span className="text-xs font-bold text-neutral-100">
                    Koustav Jyoti Borah
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Numbers / Booking Hotline */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
              CONTACT & BOOKING HOTLINES (TAP TO CALL)
            </span>

            <div className="flex flex-col gap-2">
              {phoneNumbers.map((p, idx) => (
                <a
                  key={idx}
                  href={`tel:${p.num}`}
                  className="p-3 rounded-xl bg-[#181818] border border-neutral-800 hover:border-amber-400/50 flex items-center justify-between text-neutral-200 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white font-mono tracking-wider block">
                        +91 {p.num}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {p.label}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-400 group-hover:underline">
                    Call Studio
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Action: Load Assam Melodic Session */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-neutral-900 border border-amber-500/30 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-300 block">
                Load Dhwoni Assam Melodic Session
              </span>
              <span className="text-[11px] text-neutral-400">
                Pre-configured project with Anurag, Koustav & Anubhov multi-tracks
              </span>
            </div>
            <button
              onClick={() => {
                onLoadAssamDemo();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 active:scale-95 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load Session</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#161616] flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          <span>Dhwoni Studio • Golaghat, Assam</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
