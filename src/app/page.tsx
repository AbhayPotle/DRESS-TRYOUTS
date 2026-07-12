'use client';

import React, { useState } from 'react';
import { Sparkles, Camera, ArrowRight, ShieldCheck, Hand, Layers, HelpCircle } from 'lucide-react';
import OnboardingFlow from '../components/OnboardingFlow';
import SmartMirror from '../components/SmartMirror';
import { ScanMeasurements } from '../utils/aiRecommender';

export default function Home() {
  const [appState, setAppState] = useState<'landing' | 'onboarding' | 'mirror'>('landing');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [measurements, setMeasurements] = useState<ScanMeasurements | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [styleVibe, setStyleVibe] = useState<'elegant' | 'artistic' | 'casual'>('casual');

  const handleOnboardingComplete = (data: {
    gender: 'male' | 'female';
    measurements: ScanMeasurements;
    stream: MediaStream | null;
    styleVibe: 'elegant' | 'artistic' | 'casual';
  }) => {
    setGender(data.gender);
    setMeasurements(data.measurements);
    setCameraStream(data.stream);
    setStyleVibe(data.styleVibe);
    setAppState('mirror');
  };

  const handleExitMirror = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setAppState('landing');
  };

  return (
    <main className="min-h-screen bg-black text-white selection:bg-yellow-500 selection:text-black">
      
      {/* 1. Landing Page state */}
      {appState === 'landing' && (
        <div className="relative min-h-screen flex flex-col justify-between overflow-hidden px-6 py-8">
          {/* Background Ambient Glow */}
          <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-yellow-500/5 blur-[150px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-neutral-500/10 blur-[150px] pointer-events-none" />

          {/* Header */}
          <header className="max-w-7xl w-full mx-auto flex justify-between items-center z-10">
            <span className="font-mono text-xs tracking-[0.3em] font-extrabold text-neutral-400">
              AETHER / SMART MIRROR
            </span>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span>100% Local Privacy</span>
            </div>
          </header>

          {/* Hero Section */}
          <section className="max-w-4xl mx-auto text-center space-y-8 py-16 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-yellow-500 text-xs font-semibold uppercase tracking-wider animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time AI virtual fitting</span>
            </div>

            <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[0.95] bg-clip-text text-transparent bg-gradient-to-b from-white via-neutral-100 to-neutral-500">
              Stand in the <br />Future of Fashion
            </h1>

            <p className="text-neutral-400 text-md md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
              Try on shirts, jackets, pants, and luxury traditional wear in real time. We project clothing onto your body shape perfectly while preserving your face, expressions, and hair.
            </p>

            <button
              onClick={() => setAppState('onboarding')}
              className="group inline-flex items-center gap-3 px-8 py-4.5 rounded-2xl bg-white text-black font-bold text-sm tracking-wide transition-all duration-300 hover:bg-neutral-200 shadow-xl shadow-white/5 hover:scale-[1.02] cursor-pointer"
            >
              <span>Step Into Smart Mirror</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </section>

          {/* Core Feature Grids */}
          <section className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 z-10 border-t border-white/10 pt-10">
            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold">Never Disappear</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                No avatars, no 3D dummies, no body blurs. We preserve your real face, hair, skin, and hand motions. Only the dress changes.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                <Hand className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold">Touchless Gestures</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Change outfits by pinching or waving, save favorites with a thumbs up, and snap comparison screenshots with a peace sign!
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold">Intelligent Warp & Occlusion</h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Vector-based fabric deformation wraps curves, folds at elbows/knees, and keeps your hands and hair layered naturally in front.
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="max-w-7xl w-full mx-auto flex justify-between items-center text-[10px] text-neutral-500 font-mono mt-8 border-t border-white/5 pt-4">
            <span>© 2026 AETHER MIRROR LABS.</span>
            <span>DEVELOPED FOR DRESS-TRYOUTS</span>
          </footer>
        </div>
      )}

      {/* 2. Onboarding Flow state */}
      {appState === 'onboarding' && (
        <div className="py-8">
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        </div>
      )}

      {/* 3. Virtual Smart Mirror state */}
      {appState === 'mirror' && measurements && (
        <SmartMirror
          gender={gender}
          initialMeasurements={measurements}
          initialStream={cameraStream}
          styleVibe={styleVibe}
          onExit={handleExitMirror}
        />
      )}

    </main>
  );
}
