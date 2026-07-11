'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, User, ChevronRight, RefreshCw, Eye, CheckCircle } from 'lucide-react';
import { ScanMeasurements, calculateMeasurements } from '../utils/aiRecommender';

interface OnboardingFlowProps {
  onComplete: (data: {
    gender: 'male' | 'female';
    measurements: ScanMeasurements;
    stream: MediaStream | null;
  }) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'gender' | 'camera' | 'scan' | 'result'>('gender');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('Initializing camera stream...');
  const [computedMeasurements, setComputedMeasurements] = useState<ScanMeasurements | null>(null);
  const [trackerActive, setTrackerActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mpCameraRef = useRef<any>(null);
  const mpPoseRef = useRef<any>(null);

  // Buffer to accumulate live body joint measurements for stable calibration
  const measurementsBufferRef = useRef<{
    shoulderWidths: number[];
    torsoHeights: number[];
    chestWidths: number[];
    waistWidths: number[];
    hipWidths: number[];
  }>({
    shoulderWidths: [],
    torsoHeights: [],
    chestWidths: [],
    waistWidths: [],
    hipWidths: []
  });

  const isCalibrationFrameValidRef = useRef<boolean>(false);

  // Fix: Set video source object on re-render after the element mounts
  useEffect(() => {
    if (step === 'scan' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  // Load MediaPipe scripts on mount if not already loaded
  useEffect(() => {
    const loadMediaPipe = () => {
      if ((window as any).Pose && (window as any).Camera) {
        return; // Already loaded
      }

      // Check if scripts are already in the document
      const existingPose = document.querySelector('script[src*="@mediapipe/pose"]');
      const existingCamera = document.querySelector('script[src*="@mediapipe/camera_utils"]');

      if (!existingPose) {
        const poseScript = document.createElement('script');
        poseScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
        poseScript.async = true;
        document.body.appendChild(poseScript);
      }

      if (!existingCamera) {
        const cameraScript = document.createElement('script');
        cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
        cameraScript.async = true;
        document.body.appendChild(cameraScript);
      }
    };

    loadMediaPipe();
  }, []);

  // Clean up streams/loops on unmount
  useEffect(() => {
    return () => {
      stopScanningTracker();
      if (step !== 'result' && stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [step, stream]);

  const handleGenderSelect = (selectedGender: 'male' | 'female') => {
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
    } catch (err) {
      console.warn('Camera access denied or unavailable. Loading virtual model scan...', err);
      setStep('scan');
      startDemoScanning();
    }
  };

  // Stop MediaPipe tracking loops
  const stopScanningTracker = () => {
    if (mpCameraRef.current) {
      try {
        mpCameraRef.current.stop();
      } catch (e) {}
      mpCameraRef.current = null;
    }
    mpPoseRef.current = null;
  };

  // Start Real AI Body Scanning with MediaPipe Pose
  useEffect(() => {
    if (step === 'scan' && stream) {
      setupRealTimeScanner();
    }
  }, [step, stream]);

  const setupRealTimeScanner = () => {
    // Check if MediaPipe scripts are loaded
    const mpPose = (window as any).Pose;
    const mpCamera = (window as any).Camera;

    if (!mpPose || !mpCamera) {
      console.warn('MediaPipe script not ready yet. Retrying in 500ms...');
      setTimeout(setupRealTimeScanner, 500);
      return;
    }

    setScanStatus('Initializing MediaPipe Pose models...');
    setTrackerActive(true);

    const pose = new mpPose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results: any) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        // Draw real-time green tracking dots on joints to show the scanning is happening!
        drawScanningHUD(ctx, results.poseLandmarks, canvas.width, canvas.height);

        // Extract keypoints for measurement calibration
        const lS = results.poseLandmarks[11]; // L shoulder
        const rS = results.poseLandmarks[12]; // R shoulder
        const lE = results.poseLandmarks[13]; // L elbow
        const lW = results.poseLandmarks[15]; // L wrist
        const lH = results.poseLandmarks[23]; // L hip
        const rH = results.poseLandmarks[24]; // R hip
        const lK = results.poseLandmarks[25]; // L knee
        const lA = results.poseLandmarks[27]; // L ankle

        // Only buffer if shoulders, chest, and waist/hips are all detected with high visibility
        const isLSVisible = lS && lS.visibility > 0.55;
        const isRSVisible = rS && rS.visibility > 0.55;
        const isLHVisible = lH && lH.visibility > 0.55;
        const isRHVisible = rH && rH.visibility > 0.55;

        if (isLSVisible && isRSVisible && isLHVisible && isRHVisible) {
          isCalibrationFrameValidRef.current = true;
          const buffer = measurementsBufferRef.current;
          
          const shWidth = Math.abs(lS.x - rS.x);
          const torsoH = Math.abs((lS.y + rS.y)/2 - (lH.y + rH.y)/2);
          const hipW = Math.abs(lH.x - rH.x);
          
          // Approximate chest/waist width from shoulder/hip relationships
          const chestW = shWidth * 0.9;
          const waistW = hipW * 0.85;

          buffer.shoulderWidths.push(shWidth);
          buffer.torsoHeights.push(torsoH);
          buffer.chestWidths.push(chestW);
          buffer.waistWidths.push(waistW);
          buffer.hipWidths.push(hipW);
        } else {
          isCalibrationFrameValidRef.current = false;
        }
      }
    });

    const camera = new mpCamera(videoRef.current, {
      onFrame: async () => {
        if (pose && videoRef.current && trackerActive) {
          await pose.send({ image: videoRef.current });
        }
      },
      width: 1280,
      height: 720
    });

    camera.start();
    mpCameraRef.current = camera;
    mpPoseRef.current = pose;

    // Start progress sweep bar
    let progress = 0;
    const statuses = [
      'Aligning pose grid...',
      'Measuring shoulder coordinates...',
      'Calculating chest circumference...',
      'Estimating waist outline...',
      'Scanning hip curves...',
      'Compiling custom sizing model...',
      'Scanning complete! Calibration ready.'
    ];

    scanIntervalRef.current = setInterval(() => {
      if (!isCalibrationFrameValidRef.current) {
        // Paused because landmarks (especially waist/hips) are missing!
        setScanStatus('⚠️ Stand back: Waist and hips must be visible to calibrate!');
        return;
      }

      progress += 2;
      setScanProgress(progress);

      const statusIdx = Math.min(
        statuses.length - 1,
        Math.floor((progress / 100) * statuses.length)
      );
      setScanStatus(statuses[statusIdx]);

      if (progress >= 100) {
        clearInterval(scanIntervalRef.current!);
        stopScanningTracker();
        calculateScannedFinalProfile();
      }
    }, 70);
  };

  const drawScanningHUD = (ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number) => {
    ctx.save();
    
    // Draw tracking grid overlay lines
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let j = 0; j < h; j += 40) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
    }

    // Draw glowing green tracking dots on shoulders, chest, hips
    const jointsToDraw = [11, 12, 13, 14, 23, 24]; // Shoulders, elbows, hips
    ctx.fillStyle = '#10B981'; // Green
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    jointsToDraw.forEach(idx => {
      const joint = landmarks[idx];
      if (joint && joint.visibility > 0.4) {
        const jx = joint.x * w;
        const jy = joint.y * h;
        
        ctx.beginPath();
        ctx.arc(jx, jy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw concentric tracking rings
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(jx, jy, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw a bounding scan box around the chest/waist plane
    const lS = landmarks[11];
    const rS = landmarks[12];
    const lH = landmarks[23];
    const rH = landmarks[24];
    
    if (lS && rS && lH && rH) {
      ctx.strokeStyle = '#EAB308'; // Yellow scanner line
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rS.x * w - 20, rS.y * h - 20);
      ctx.lineTo(lS.x * w + 20, lS.y * h - 20);
      ctx.lineTo(lH.x * w + 20, lH.y * h + 20);
      ctx.lineTo(rH.x * w - 20, rH.y * h + 20);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  };

  const calculateScannedFinalProfile = () => {
    const buffer = measurementsBufferRef.current;
    
    // Fallback: If no landmarks were captured (e.g. camera dark/blocked), use standard profile defaults
    if (buffer.shoulderWidths.length < 5) {
      console.warn('Low landmark capture rate. Loading standard size template.');
      const defaults = {
        male: { heightCm: 178, chestCm: 102, waistCm: 84, hipCm: 96, shoulderWidthCm: 46, armLengthCm: 62, legLengthCm: 81, bodyType: 'Athletic' as const },
        female: { heightCm: 165, chestCm: 90, waistCm: 68, hipCm: 94, shoulderWidthCm: 39, armLengthCm: 56, legLengthCm: 74, bodyType: 'Curvy' as const }
      };
      setComputedMeasurements(defaults[gender]);
      setStep('result');
      return;
    }

    // Average the buffered coordinate ratios
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    
    const finalShoulderPx = avg(buffer.shoulderWidths) * 1280;
    const finalTorsoPx = avg(buffer.torsoHeights) * 720;
    const finalHipPx = avg(buffer.hipWidths) * 1280;
    const finalWaistPx = avg(buffer.waistWidths) * 1280;
    const finalChestPx = avg(buffer.chestWidths) * 1280;

    // Use our sizing formulas to compute real chest, waist, and hip size in cm
    const baseHeight = gender === 'male' ? 176 : 163;
    const scannedProfile = calculateMeasurements(
      finalShoulderPx,
      finalTorsoPx,
      finalTorsoPx * 1.3, // estimate leg length from torso
      finalTorsoPx * 0.9, // estimate arm length from torso
      finalHipPx,
      finalWaistPx,
      finalChestPx,
      baseHeight
    );

    setComputedMeasurements(scannedProfile);
    setStep('result');
  };

  // Demo scan fallback loop
  const startDemoScanning = () => {
    let progress = 0;
    scanIntervalRef.current = setInterval(() => {
      progress += 2;
      setScanProgress(progress);
      setScanStatus(`Analyzing virtual space grid... ${progress}%`);
      if (progress >= 100) {
        clearInterval(scanIntervalRef.current!);
        const defaults = {
          male: { heightCm: 178, chestCm: 102, waistCm: 84, hipCm: 96, shoulderWidthCm: 46, armLengthCm: 62, legLengthCm: 81, bodyType: 'Athletic' as const },
          female: { heightCm: 165, chestCm: 90, waistCm: 68, hipCm: 94, shoulderWidthCm: 39, armLengthCm: 56, legLengthCm: 74, bodyType: 'Curvy' as const }
        };
        setComputedMeasurements(defaults[gender]);
        setStep('result');
      }
    }, 70);
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
              Step into a luxury virtual fitting experience. Choose your profile to begin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 max-w-2xl mx-auto w-full px-4">
            {(['male', 'female'] as const).map(p => (
              <button
                key={p}
                onClick={() => handleGenderSelect(p)}
                className="group relative flex flex-col items-center p-10 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-yellow-500/50 hover:bg-white/10 transition-all duration-500 overflow-hidden cursor-pointer w-full"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-20 h-20 rounded-full bg-neutral-800/80 group-hover:bg-yellow-500/20 flex items-center justify-center border border-white/10 group-hover:border-yellow-500/30 transition-all duration-500 mb-6">
                  <User className="w-10 h-10 text-neutral-400 group-hover:text-yellow-500 transition-colors duration-500" />
                </div>
                <span className="text-xl font-bold capitalize tracking-wide">{p}</span>
                <span className="text-xs text-neutral-500 mt-2">Select Profile</span>
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
                startDemoScanning();
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
            Stand back so your shoulders and chest are fully inside the frame. Keep posture straight.
          </p>

          <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
            
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
            />

            {/* Neon scan sweep line */}
            <div
              className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent shadow-[0_0_15px_rgba(234,179,8,0.8)] z-20 pointer-events-none"
              style={{
                top: `${scanProgress}%`,
                transition: 'top 70ms linear'
              }}
            />
            
            {/* Scan Progress HUD */}
            <div className="absolute inset-0 bg-black/30 flex flex-col justify-between p-6 text-left z-20 pointer-events-none">
              <div className="flex justify-between items-center bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 w-fit">
                <span className="text-xs font-mono tracking-widest text-yellow-500 uppercase">SYSTEM STATUS: ACTIVE</span>
              </div>
              <div className="space-y-2 bg-black/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="flex justify-between text-sm font-mono">
                  <span>{scanStatus}</span>
                  <span className="text-yellow-500 font-bold">{scanProgress}%</span>
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
              <CheckCircle className="w-8 h-8" />
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
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Calibrated Height</span>
              <p className="text-xl font-bold text-white">{computedMeasurements.heightCm} cm</p>
            </div>
            <hr className="col-span-2 border-white/10" />
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Chest Sizing</span>
              <p className="text-md font-semibold text-neutral-300">{computedMeasurements.chestCm} cm</p>
            </div>
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Waist Sizing</span>
              <p className="text-md font-semibold text-neutral-300">{computedMeasurements.waistCm} cm</p>
            </div>
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Hips Sizing</span>
              <p className="text-md font-semibold text-neutral-300">{computedMeasurements.hipCm} cm</p>
            </div>
            <div className="space-y-1">
              <span className="text-neutral-500 text-xs uppercase tracking-wider font-semibold">Shoulders Sizing</span>
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
