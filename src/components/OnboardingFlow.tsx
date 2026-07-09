'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, User, ChevronRight, RefreshCw, Eye } from 'lucide-react';
import { ScanMeasurements } from '../utils/aiRecommender';

interface OnboardingFlowProps {
  onComplete: (data: {
    gender: 'man' | 'woman' | 'boy' | 'girl';
    measurements: ScanMeasurements;
    stream: MediaStream | null;
  }) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'gender' | 'camera' | 'scan' | 'result'>('gender');
  const [gender, setGender] = useState<'man' | 'woman' | 'boy' | 'girl'>('man');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('Positioning body in frame...');
  const [computedMeasurements, setComputedMeasurements] = useState<ScanMeasurements | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop camera stream on unmount if not passed forward
  useEffect(() => {
    return () => {
      if (step !== 'result' && stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step, stream]);

  const handleGenderSelect = (selectedGender: 'man' | 'woman' | 'boy' | 'girl') => {
    setGender(selectedGender);
    setStep('camera');
  };

  const requestCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      setStep('scan');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      startScanning();
    } catch (err) {
      console.warn('Camera access denied or unavailable. Loading virtual model preview...', err);
      // Fallback: Proceed to scan stage with virtual simulation model
      setStep('scan');
      startScanning(true);
    }
  };

  const startScanning = (isDemo = false) => {
    setScanProgress(0);
    const statuses = [
      'Detecting body keypoints...',
      'Measuring shoulder-to-shoulder width...',
      'Calculating chest and waist circumference...',
      'Analyzing hip-to-waist ratios...',
      'Determining height and limb lengths...',
      'Syncing with AI garment warp engine...',
      'Scan complete! Generating profile...'
    ];

    let progress = 0;
    scanIntervalRef.current = setInterval(() => {
      progress += 2;
      setScanProgress(progress);

      const statusIdx = Math.min(
        statuses.length - 1,
        Math.floor((progress / 100) * statuses.length)
      );
      setScanStatus(statuses[statusIdx]);

      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        
        // Mock calculations based on average profiles
        const mockMeasurements: Record<string, ScanMeasurements> = {
          man: {
            heightCm: 178,
            chestCm: 102,
            waistCm: 84,
            hipCm: 96,
            shoulderWidthCm: 46,
            armLengthCm: 62,
            legLengthCm: 81,
            bodyType: 'Athletic'
          },
          woman: {
            heightCm: 165,
            chestCm: 90,
            waistCm: 68,
            hipCm: 94,
            shoulderWidthCm: 39,
            armLengthCm: 56,
            legLengthCm: 74,
            bodyType: 'Curvy'
          },
          boy: {
            heightCm: 140,
            chestCm: 72,
            waistCm: 62,
            hipCm: 74,
            shoulderWidthCm: 32,
            armLengthCm: 46,
            legLengthCm: 58,
            bodyType: 'Average'
          },
          girl: {
            heightCm: 138,
            chestCm: 68,
            waistCm: 59,
            hipCm: 72,
            shoulderWidthCm: 31,
            armLengthCm: 44,
            legLengthCm: 56,
            bodyType: 'Slim'
          }
        };

        setComputedMeasurements(mockMeasurements[gender]);
        setStep('result');
      }
    }, 80);
  };

  const handleFinish = () => {
    if (computedMeasurements) {
      onComplete({
        gender,
        measurements: computedMeasurements,
        stream
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] text-white px-4">
      {/* Gender Selection Step */}
      {step === 'gender' && (
        <div className="w-full max-w-4xl text-center space-y-8 animate-fade-in">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-yellow-500 text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Luxury AI Fitting Mirror</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-300 to-neutral-500">
              Welcome to the Smart Mirror
            </h1>
            <p className="text-neutral-400 text-lg max-w-xl mx-auto">
              Step into a luxury virtual fitting experience. Choose a profile to begin.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            {(['man', 'woman', 'boy', 'girl'] as const).map(p => (
              <button
                key={p}
                onClick={() => handleGenderSelect(p)}
                className="group relative flex flex-col items-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-yellow-500/50 hover:bg-white/10 transition-all duration-500 overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-16 h-16 rounded-full bg-neutral-800/80 group-hover:bg-yellow-500/20 flex items-center justify-center border border-white/10 group-hover:border-yellow-500/30 transition-all duration-500 mb-4">
                  <User className="w-8 h-8 text-neutral-400 group-hover:text-yellow-500 transition-colors duration-500" />
                </div>
                <span className="text-lg font-bold capitalize tracking-wide">{p}</span>
                <span className="text-xs text-neutral-500 mt-1">Select Profile</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera Permission Step */}
      {step === 'camera' && (
        <div className="w-full max-w-md text-center space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-2xl animate-scale-up">
          <div className="w-20 h-20 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto">
            <Camera className="w-10 h-10 text-yellow-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Enable Camera Stream</h2>
            <p className="text-neutral-400 text-sm">
              We require camera access to perform the body scan and overlay garments in real time. Your video stream is processed entirely locally on your device and is never uploaded.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={requestCamera}
              className="w-full py-4 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-white/5"
            >
              <span>Grant Camera Permission</span>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setStep('scan');
                startScanning(true);
              }}
              className="w-full py-3 bg-neutral-900 border border-white/10 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <Eye className="w-4 h-4" />
              <span>Use Virtual Model (Demo Mode)</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Body Scan Step */}
      {step === 'scan' && (
        <div className="w-full max-w-2xl text-center space-y-6 animate-fade-in">
          <h2 className="text-3xl font-bold tracking-tight">AI Body Scan Calibration</h2>
          <p className="text-neutral-400 text-sm max-w-md mx-auto">
            Stand back so your full body is visible. Keep your posture straight for calibration.
          </p>

          <div className="relative aspect-video rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl">
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 to-neutral-900 space-y-4">
                <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
                <span className="text-neutral-500 text-sm">Streaming virtual avatar skeleton...</span>
              </div>
            )}

            {/* Neon scan sweep line */}
            <div
              className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent shadow-[0_0_15px_rgba(234,179,8,0.8)]"
              style={{
                top: `${scanProgress}%`,
                transition: 'top 80ms linear'
              }}
            />
            
            {/* Scan Progress HUD */}
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-6 text-left">
              <div className="flex justify-between items-center bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 w-fit">
                <span className="text-xs font-mono tracking-widest text-yellow-500 uppercase">System Status: Active</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-mono">
                  <span>{scanStatus}</span>
                  <span className="text-yellow-500">{scanProgress}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all duration-100"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calibration Scan Result Step */}
      {step === 'result' && computedMeasurements && (
        <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl animate-scale-up space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-500 mb-2">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Scan Successful</h2>
            <p className="text-neutral-400 text-sm">
              Measurements compiled. Generative AI garment sizing has been calibrated.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-2xl border border-white/5">
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Body Shape Profile</span>
              <p className="text-xl font-bold text-yellow-500">{computedMeasurements.bodyType}</p>
            </div>
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Estimated Height</span>
              <p className="text-xl font-bold text-white">{computedMeasurements.heightCm} cm</p>
            </div>
            <hr className="col-span-2 border-white/10" />
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Chest Circumference</span>
              <p className="text-md font-semibold text-neutral-300">{computedMeasurements.chestCm} cm</p>
            </div>
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Waist Circumference</span>
              <p className="text-md font-semibold text-neutral-300">{computedMeasurements.waistCm} cm</p>
            </div>
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Hip Circumference</span>
              <p className="text-md font-semibold text-neutral-300">{computedMeasurements.hipCm} cm</p>
            </div>
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Shoulder Width</span>
              <p className="text-md font-semibold text-neutral-300">{computedMeasurements.shoulderWidthCm} cm</p>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-yellow-500/20"
          >
            <span>Open Virtual Smart Mirror</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
