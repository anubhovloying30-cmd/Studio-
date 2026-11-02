import React, { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Cpu,
  Layers,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { DhwoniLogo } from './DhwoniLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { downloadAndroidProjectZip } from '../data/androidCodebase';

interface ApkDownloadModalProps {
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'direct' | 'native' | 'bubblewrap'>('direct');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleInstallPWA = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  const handleDownloadNativeZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadAndroidProjectZip();
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 select-none">
      <div className="w-full max-w-2xl bg-[#121212] border border-[#dfb743]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[92vh]">
        {/* Top Gold Border Glow */}
        <div className="h-1 bg-gradient-to-r from-amber-600 via-[#dfb743] to-amber-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#161616]">
          <div className="flex items-center gap-3">
            <DhwoniLogo size={40} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-serif text-[#e5c158] tracking-wide">
                  Download Dhwoni Studio APK
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Android 8.0 – 15
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                Official Android App Package • Golaghat, Assam
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Switcher Tabs */}
        <div className="flex items-center border-b border-neutral-800 bg-[#141414] px-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('direct')}
            className={`py-3 px-3 border-b-2 font-bold transition flex items-center gap-2 ${
              activeTab === 'direct'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Direct Phone APK (Instant)</span>
          </button>

          <button
            onClick={() => setActiveTab('native')}
            className={`py-3 px-3 border-b-2 font-bold transition flex items-center gap-2 ${
              activeTab === 'native'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>Android Studio NDK (.ZIP to APK)</span>
          </button>

          <button
            onClick={() => setActiveTab('bubblewrap')}
            className={`py-3 px-3 border-b-2 font-bold transition flex items-center gap-2 ${
              activeTab === 'bubblewrap'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Google Bubblewrap CLI</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
          {/* TAB 1: Direct Android Phone APK (Instant WebAPK) */}
          {activeTab === 'direct' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-neutral-900 to-neutral-900 border border-emerald-500/30 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-300">
                      Direct Android WebAPK Installation
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Installs directly to your Android device's home screen and app launcher as a standalone Android APK. Includes low-latency Web Audio processing, full hardware microphone recording permissions, and offline functionality.
                  </p>
                </div>
              </div>

              {/* Install Trigger Button */}
              {isInstalled ? (
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-3 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Dhwoni Studio is already installed on this device in Standalone Mode!</span>
                </div>
              ) : isInstallable ? (
                <button
                  onClick={handleInstallPWA}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Dhwoni Studio APK to Android Phone</span>
                </button>
              ) : (
                <div className="p-4 rounded-xl bg-[#161616] border border-neutral-800 flex flex-col gap-2">
                  <span className="text-xs font-bold text-amber-300">
                    How to Install on Any Android Phone (Chrome, Edge, Samsung Internet):
                  </span>
                  <ol className="text-xs text-neutral-300 list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>
                      Open this application in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on your Android phone.
                    </li>
                    <li>
                      Tap the <strong>three-dots menu (⋮)</strong> at the top right of your browser.
                    </li>
                    <li>
                      Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </li>
                    <li>
                      Confirm <strong>Install</strong>. Android will package and place the official <strong>Dhwoni Studio</strong> icon on your home screen and app drawer!
                    </li>
                  </ol>
                </div>
              )}

              {/* Quick File Download Option */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleDownloadNativeZip}
                  disabled={isDownloadingZip}
                  className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-98 border border-neutral-700 text-neutral-100 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>
                    {isDownloadingZip
                      ? 'Downloading Package...'
                      : 'Download Android Studio Source Package (.ZIP)'}
                  </span>
                </button>
              </div>

              {/* Android Features Card */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#161616] border border-neutral-800">
                  <span className="text-neutral-400 block text-[10px]">PACKAGE NAME</span>
                  <span className="font-bold text-neutral-100">com.dhwoni.studio</span>
                </div>
                <div className="p-3 rounded-xl bg-[#161616] border border-neutral-800">
                  <span className="text-neutral-400 block text-[10px]">PERMISSIONS</span>
                  <span className="font-bold text-emerald-400">RECORD_AUDIO, FULL_SCREEN</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Android Studio NDK Source (.ZIP to APK) */}
          {activeTab === 'native' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-neutral-900 to-neutral-900 border border-amber-500/30 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-[#dfb743] shrink-0">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-amber-300">
                    Full Native Android Studio Project (.ZIP)
                  </h3>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Build a standalone native <code className="text-amber-300 font-mono">app-debug.apk</code> or signed release APK using Android Studio with Google Oboe C++ and Jetpack Compose.
                  </p>
                </div>
              </div>

              {/* Download ZIP Button */}
              <button
                onClick={handleDownloadNativeZip}
                disabled={isDownloadingZip}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isDownloadingZip
                    ? 'Packing Android Project...'
                    : 'Download Android Studio Source Package (.ZIP)'}
                </span>
              </button>

              {/* Build Instructions Box */}
              <div className="p-4 rounded-xl bg-[#161616] border border-neutral-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 font-mono">
                    TERMINAL COMMAND TO BUILD APK:
                  </span>
                  <button
                    onClick={() => copyToClipboard('./gradlew assembleDebug', 'gradle')}
                    className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 transition"
                  >
                    {copiedCmd === 'gradle' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'gradle' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-black/70 p-2.5 rounded-lg border border-neutral-800 font-mono text-xs text-amber-300">
                  ./gradlew assembleDebug
                </div>

                <div className="text-[11px] text-neutral-400 space-y-1">
                  <p>1. Extract the downloaded <code className="text-neutral-200">DhwoniStudio-Android-NDK-Project.zip</code>.</p>
                  <p>2. Open the folder in <strong>Android Studio</strong>.</p>
                  <p>
                    3. Run <code className="text-amber-300">./gradlew assembleDebug</code> or select <strong>Build → Build Bundle(s) / APK(s) → Build APK(s)</strong>.
                  </p>
                  <p className="text-emerald-400 pt-1">
                    Output APK location: <code className="bg-black px-1.5 py-0.5 rounded">app/build/outputs/apk/debug/app-debug.apk</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Google Bubblewrap CLI */}
          {activeTab === 'bubblewrap' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-neutral-900 to-neutral-900 border border-cyan-500/30 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                  <Terminal className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-cyan-300">
                    Google Bubblewrap CLI (Command-Line APK Generator)
                  </h3>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    Google's official CLI tool that turns any compliant Progressive Web App into a production signed Android APK or AAB for Google Play Store.
                  </p>
                </div>
              </div>

              {/* Commands Container */}
              <div className="flex flex-col gap-3 bg-[#161616] p-4 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 font-mono">
                    STEP 1: INITIALIZE BUBBLEWRAP
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'npx @bubblewrap/cli init --manifest=https://' + window.location.host + '/manifest.webmanifest',
                        'bw1'
                      )
                    }
                    className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
                  >
                    {copiedCmd === 'bw1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'bw1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-black/70 p-2.5 rounded-lg border border-neutral-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                  npx @bubblewrap/cli init --manifest=https://{typeof window !== 'undefined' ? window.location.host : 'app-url'}/manifest.webmanifest
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-neutral-300 font-mono">
                    STEP 2: BUILD SIGNED APK
                  </span>
                  <button
                    onClick={() => copyToClipboard('npx @bubblewrap/cli build', 'bw2')}
                    className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300"
                  >
                    {copiedCmd === 'bw2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCmd === 'bw2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="bg-black/70 p-2.5 rounded-lg border border-neutral-800 font-mono text-xs text-cyan-300">
                  npx @bubblewrap/cli build
                </div>
                <p className="text-[11px] text-neutral-400">
                  Produces <code className="text-emerald-400">app-release-signed.apk</code> ready to install on any Android phone or tablet!
                </p>
              </div>
            </div>
          )}

          {/* Assistance & Hotline */}
          <div className="p-3.5 rounded-xl bg-[#141414] border border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-400">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Need help installing? Contact Dhwoni Studio in Golaghat:</span>
            </div>
            <a
              href="tel:6001021556"
              className="text-amber-400 font-bold font-mono hover:underline"
            >
              +91 6001021556
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#161616] flex items-center justify-between text-xs font-mono text-neutral-400">
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
