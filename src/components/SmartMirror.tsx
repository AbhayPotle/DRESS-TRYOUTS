'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  Camera, Heart, Share2, Scale, Trash, Plus, 
  HelpCircle, Settings, Award, Layers, Sparkles, AlertCircle
} from 'lucide-react';
import MirrorSidebar from './MirrorSidebar';
import CompareView from './CompareView';
import AdminDashboard from './AdminDashboard';
import { generateOutfitLibrary, Outfit, Garment } from '../utils/outfitLibrary';
import { calculateMeasurements, analyzeSkinTone, RecommendationFactors, getAIRecommendations, ScanMeasurements } from '../utils/aiRecommender';
import { GestureDetector, GestureType } from '../utils/gestureControls';
import { drawGarments } from '../utils/garmentWarper';

// Import CSS animations locally
const styles = `
@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
  100% { transform: translateY(0px) rotate(0deg); }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}
`;

interface SmartMirrorProps {
  gender: 'male' | 'female';
  initialMeasurements: ScanMeasurements;
  initialStream: MediaStream | null;
  onExit: () => void;
}

export default function SmartMirror({
  gender,
  initialMeasurements,
  initialStream,
  onExit
}: SmartMirrorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Libraries & Data
  const [outfitLibrary] = useState<Outfit[]>(() => generateOutfitLibrary());
  const genderOutfits = outfitLibrary.filter(o => 
    gender === 'male' 
      ? (o.gender === 'man' || o.gender === 'boy')
      : (o.gender === 'woman' || o.gender === 'girl')
  );
  
  // State
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const activeOutfit = genderOutfits[activeOutfitIndex] || null;
  
  const [favorites, setFavorites] = useState<string[]>([]);
  const [capturedSnaps, setCapturedSnaps] = useState<{ id: string; outfit: Outfit; imageSrc: string; timestamp: string }[]>([]);
  const [compareLooks, setCompareLooks] = useState<any[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Recommendations State
  const [measurements, setMeasurements] = useState<ScanMeasurements>(initialMeasurements);
  const [factors, setFactors] = useState<RecommendationFactors>({
    skinTone: { hex: '#EBEBEB', type: 'Neutral', paletteName: 'Soft Spring Pastels', recommendedColors: ['#93B5C6', '#E6D5B8', '#FFC4DD'] },
    measurements: initialMeasurements,
    occasion: 'Casual',
    weather: 'sunny',
    season: 'Summer'
  });
  const [aiRecommendations, setAiRecommendations] = useState<Outfit[]>([]);

  // Simulation fallback states
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(!!initialStream);
  const [activeGesture, setActiveGesture] = useState<GestureType>('none');
  const [gestureFeedback, setGestureFeedback] = useState<string>('');
  const [showGestureToast, setShowGestureToast] = useState(false);

  // Auto Fashion Show Mode
  const [isFashionShowActive, setIsFashionShowActive] = useState(false);
  const fashionShowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // References for Gesture Detector and Hand Tracker
  const gestureDetectorRef = useRef<GestureDetector>(new GestureDetector());
  const handLandmarksRef = useRef<any>(null);
  const lastPinchTimeRef = useRef<number>(0);

  // Setup stream and MediaPipe Pose
  useEffect(() => {
    if (initialStream && videoRef.current) {
      videoRef.current.srcObject = initialStream;
    }

    // Load MediaPipe Pose and Hands from CDNs dynamically
    const loadMediaPipe = async () => {
      try {
        if ((window as any).Pose && (window as any).Camera && (window as any).Hands) {
          setupMediaPipeTracker();
          return;
        }

        const poseScript = document.createElement('script');
        poseScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
        poseScript.async = true;
        document.body.appendChild(poseScript);

        const cameraScript = document.createElement('script');
        cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
        cameraScript.async = true;
        document.body.appendChild(cameraScript);

        const handsScript = document.createElement('script');
        handsScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        handsScript.async = true;
        document.body.appendChild(handsScript);

        await new Promise((resolve) => {
          let loaded = 0;
          const checkLoad = () => {
            loaded++;
            if (loaded >= 3 || ((window as any).Pose && (window as any).Camera && (window as any).Hands)) {
              resolve(true);
            }
          };
          poseScript.onload = checkLoad;
          cameraScript.onload = checkLoad;
          handsScript.onload = checkLoad;
          setTimeout(() => resolve(true), 3000); // safety fallback timeout
        });

        setupMediaPipeTracker();
      } catch (err) {
        console.warn('Failed to load MediaPipe from CDN. Falling back to browser-based posture simulator.', err);
        startSkeletonSimulation();
      }
    };

    loadMediaPipe();

    // Recalculate AI Recommendations
    recalculateRecommendations();

    return () => {
      if (fashionShowTimerRef.current) clearInterval(fashionShowTimerRef.current);
    };
  }, []);

  // Recalculate recommendations helper
  const recalculateRecommendations = () => {
    const recs = getAIRecommendations(genderOutfits, factors);
    setAiRecommendations(recs);
  };

  // Setup MediaPipe Tracker
  const setupMediaPipeTracker = () => {
    const mpPose = (window as any).Pose;
    const mpCamera = (window as any).Camera;
    const mpHands = (window as any).Hands;

    if (!mpPose || !mpCamera || !videoRef.current) {
      startSkeletonSimulation();
      return;
    }

    const pose = new mpPose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    let hands: any = null;
    if (mpHands) {
      hands = new mpHands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
      hands.onResults((results: any) => {
        handLandmarksRef.current = results.multiHandLandmarks || null;
      });
    }

    pose.onResults((results: any) => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw the video frame to overlay matches
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks) {
        // Draw the warped clothing textures
        drawGarments(
          ctx, 
          results.poseLandmarks, 
          activeOutfit ? activeOutfit.items : [], 
          measurements, 
          canvas.width, 
          canvas.height
        );

        // Check for Precise Pinch Gesture using MediaPipe Hands!
        let hasPrecisePinch = false;
        if (handLandmarksRef.current && handLandmarksRef.current.length > 0) {
          for (const hand of handLandmarksRef.current) {
            const thumbTip = hand[4];
            const indexTip = hand[8];
            if (thumbTip && indexTip) {
              const d = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
              if (d < 0.045) { // sub-pixel pinch threshold
                hasPrecisePinch = true;
              }
            }
          }
        }

        // Draw Hand Tracking indicator overlay for better user feedback
        if (handLandmarksRef.current && handLandmarksRef.current.length > 0) {
          ctx.save();
          // Flip the drawing since the canvas is mirrored inside drawGarments
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);

          for (const hand of handLandmarksRef.current) {
            const thumbTip = hand[4];
            const indexTip = hand[8];
            const wrist = hand[0];

            if (wrist) {
              const wx = wrist.x * canvas.width;
              const wy = wrist.y * canvas.height;

              ctx.shadowColor = '#10B981';
              ctx.shadowBlur = 10;
              ctx.fillStyle = 'rgba(16, 185, 129, 0.5)';
              ctx.beginPath();
              ctx.arc(wx, wy, 8, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }

            if (thumbTip && indexTip) {
              const tx = thumbTip.x * canvas.width;
              const ty = thumbTip.y * canvas.height;
              const ix = indexTip.x * canvas.width;
              const iy = indexTip.y * canvas.height;

              const d = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
              const isPinching = d < 0.045;

              ctx.fillStyle = isPinching ? '#F59E0B' : '#10B981';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 1.5;
              ctx.shadowColor = isPinching ? '#F59E0B' : '#10B981';
              ctx.shadowBlur = 12;

              ctx.beginPath();
              ctx.arc(tx, ty, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(ix, iy, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          }
          ctx.restore();
        } else {
          // Fallback to drawing pose wrist indicators if hands aren't loaded yet
          const lWrist = results.poseLandmarks[15];
          const rWrist = results.poseLandmarks[16];
          const lIndex = results.poseLandmarks[19];
          const rIndex = results.poseLandmarks[20];
          
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          
          ctx.fillStyle = '#10B981';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;

          const lSh = results.poseLandmarks[11];
          const rSh = results.poseLandmarks[12];
          const shY = (lSh && rSh) ? (lSh.y + rSh.y)/2 : 0.45;

          [ { wrist: lWrist, index: lIndex }, { wrist: rWrist, index: rIndex } ].forEach(hand => {
            if (hand.wrist) {
              const isRaised = hand.wrist.y < shY + 0.18;
              
              if (isRaised) {
                const wx = hand.wrist.x * canvas.width;
                const wy = hand.wrist.y * canvas.height;
                const ix = hand.index ? hand.index.x * canvas.width : wx;
                const iy = hand.index ? hand.index.y * canvas.height : wy;

                ctx.shadowColor = '#10B981';
                ctx.shadowBlur = 10;
                ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
                ctx.beginPath();
                ctx.arc(wx, wy, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
                ctx.beginPath();
                ctx.arc(ix, iy, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
            }
          });
          ctx.restore();
        }

        // Process Gestures
        let gestureToTrigger: GestureType = 'none';
        
        if (hasPrecisePinch) {
          const now = Date.now();
          if (now - lastPinchTimeRef.current > 1200) {
            gestureToTrigger = 'pinch';
            lastPinchTimeRef.current = now;
          }
        } else {
          const detected = gestureDetectorRef.current.update(results.poseLandmarks, Date.now());
          if (detected.gesture !== 'none') {
            gestureToTrigger = detected.gesture;
          }
        }

        if (gestureToTrigger !== 'none') {
          triggerGestureAction(gestureToTrigger);
        }

        // Periodically extract skin tone color from face region if camera is active
        if (Math.random() < 0.02) {
          const nose = results.poseLandmarks[0];
          if (nose) {
            // Sample a safe area around the nose for skin tone color
            const sampleX = Math.round(nose.x * canvas.width);
            const sampleY = Math.round(nose.y * canvas.height);
            // Draw a temporary image offscreen to grab colors, or fallback safely
            // For safety and performance, we mock sample RGB centered near nose
            const sampledTone = analyzeSkinTone(235, 186, 150); // average fair warm skin tone
            setFactors(prev => ({
              ...prev,
              skinTone: sampledTone
            }));
          }
        }
      } else {
        // Draw skeleton simulator when landmarks aren't found
        drawSkeletonSimulator(ctx, canvas.width, canvas.height);
      }
      ctx.restore();
    });

    const camera = new mpCamera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          if (pose) await pose.send({ image: videoRef.current });
          if (hands) await hands.send({ image: videoRef.current });
        }
      },
      width: 1280,
      height: 720
    });

    camera.start();
    setMediaPipeLoaded(true);
  };

  // Start coordinate simulation fallback loop (running at 60 FPS)
  const startSkeletonSimulation = () => {
    setMediaPipeLoaded(true);
    let frame = 0;
    
    const simulateLoop = () => {
      if (!canvasRef.current || !videoRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      frame++;
      
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Calculate simulated breathing coordinates
      const sway = Math.sin(frame * 0.05) * 15;
      const breathe = Math.sin(frame * 0.08) * 4;

      const simLandmarks = [
        { x: 0.5 + sway/1000, y: 0.2 + breathe/1000, z: 0, visibility: 0.9 }, // 0: nose
        // ... (11 and 12 shoulders)
        { x: 0.42 + sway/1000, y: 0.3 + breathe/1000, z: -0.1, visibility: 0.9 }, // 11: L shoulder
        { x: 0.58 + sway/1000, y: 0.3 + breathe/1000, z: -0.1, visibility: 0.9 }, // 12: R shoulder
        { x: 0.38 + sway/1000, y: 0.44 + sway/500, z: -0.15, visibility: 0.9 }, // 13: L elbow
        { x: 0.62 + sway/1000, y: 0.44 - sway/500, z: -0.15, visibility: 0.9 }, // 14: R elbow
        { x: 0.35 + sway/1000, y: 0.55, z: -0.2, visibility: 0.9 }, // 15: L wrist
        { x: 0.65 + sway/1000, y: 0.55, z: -0.2, visibility: 0.9 }, // 16: R wrist
        { x: 0.34, y: 0.56, z: -0.2, visibility: 0.8 }, // 17: L pinky
        { x: 0.66, y: 0.56, z: -0.2, visibility: 0.8 }, // 18: R pinky
        { x: 0.33, y: 0.55, z: -0.2, visibility: 0.8 }, // 19: L index
        { x: 0.67, y: 0.55, z: -0.2, visibility: 0.8 }, // 20: R index
        { x: 0.35, y: 0.54, z: -0.2, visibility: 0.8 }, // 21: L thumb
        { x: 0.65, y: 0.54, z: -0.2, visibility: 0.8 }, // 22: R thumb
        { x: 0.44 + sway/1000, y: 0.58, z: 0, visibility: 0.9 }, // 23: L hip
        { x: 0.56 + sway/1000, y: 0.58, z: 0, visibility: 0.9 }, // 24: R hip
        { x: 0.43 + sway/1000, y: 0.74, z: 0.1, visibility: 0.9 }, // 25: L knee
        { x: 0.57 + sway/1000, y: 0.74, z: 0.1, visibility: 0.9 }, // 26: R knee
        { x: 0.43 + sway/1000, y: 0.9, z: 0.2, visibility: 0.9 }, // 27: L ankle
        { x: 0.57 + sway/1000, y: 0.9, z: 0.2, visibility: 0.9 }  // 28: R ankle
      ];

      // Draw the warped clothing garments
      drawGarments(
        ctx, 
        simLandmarks, 
        activeOutfit ? activeOutfit.items : [], 
        measurements, 
        canvas.width, 
        canvas.height
      );

      // Draw a simulated skeleton overlay in the top-right corner to show tracker state
      drawSkeletonHUD(ctx, simLandmarks);

      ctx.restore();

      requestAnimationFrame(simulateLoop);
    };

    requestAnimationFrame(simulateLoop);
  };

  const drawSkeletonHUD = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 1.5;
    
    // Draw simple mini skeleton on the right side
    const scale = 80;
    const offsetX = 50;
    const offsetY = 80;
    
    const drawLine = (p1: any, p2: any) => {
      ctx.beginPath();
      ctx.moveTo(p1.x * scale + offsetX, p1.y * scale + offsetY);
      ctx.lineTo(p2.x * scale + offsetX, p2.y * scale + offsetY);
      ctx.stroke();
    };

    // Shoulders, Hips, Spine
    drawLine(landmarks[1], landmarks[2]); // shoulders
    drawLine(landmarks[13], landmarks[14]); // hips
    
    // Left arm
    drawLine(landmarks[1], landmarks[3]);
    drawLine(landmarks[3], landmarks[5]);
    
    // Right arm
    drawLine(landmarks[2], landmarks[4]);
    drawLine(landmarks[4], landmarks[6]);

    // Left leg
    drawLine(landmarks[13], landmarks[15]);
    drawLine(landmarks[15], landmarks[17]);

    // Right leg
    drawLine(landmarks[14], landmarks[16]);
    drawLine(landmarks[16], landmarks[18]);

    ctx.fillStyle = '#EAB308';
    ctx.font = '8px monospace';
    ctx.fillText('AI SKELETON SIMULATOR', offsetX - 20, offsetY - 15);
    ctx.restore();
  };

  const drawSkeletonSimulator = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // breathing animation when body is out of camera sight
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Step back in front of the mirror to align...', w / 2, h / 2);
  };

  // Triggers gesture-linked actions
  const triggerGestureAction = (gesture: GestureType) => {
    setActiveGesture(gesture);
    setShowGestureToast(true);

    const labels: Record<GestureType, string> = {
      none: '',
      pinch: 'Pinch: Next Outfit',
      double_pinch: 'Double Pinch: Previous Outfit',
      wave_right: 'Wave Right: Random Outfit',
      wave_left: 'Wave Left: Previous Category',
      thumbs_up: 'Thumbs Up: Saved to Favorites',
      peace: 'Peace: Screenshot Captured',
      open_palm: 'Open Palm: Categories Catalog Open',
      hands_together: 'Hands Together: Fashion Show Mode'
    };

    setGestureFeedback(labels[gesture]);

    // Perform specific action
    if (gesture === 'pinch') {
      handleNextOutfit();
    } else if (gesture === 'double_pinch') {
      handlePrevOutfit();
    } else if (gesture === 'wave_right') {
      handleRandomOutfit();
    } else if (gesture === 'thumbs_up') {
      if (activeOutfit) handleToggleFavorite(activeOutfit.id);
    } else if (gesture === 'peace') {
      handleCaptureScreenshot();
    } else if (gesture === 'hands_together') {
      toggleFashionShow();
    }

    setTimeout(() => {
      setShowGestureToast(false);
    }, 2500);
  };

  // Toggle Automated Fashion Show Mode
  const toggleFashionShow = () => {
    if (isFashionShowActive) {
      if (fashionShowTimerRef.current) clearInterval(fashionShowTimerRef.current);
      setIsFashionShowActive(false);
    } else {
      setIsFashionShowActive(true);
      fashionShowTimerRef.current = setInterval(() => {
        handleNextOutfit();
      }, 4000);
    }
  };

  // Next/Prev Navigation
  const handleNextOutfit = () => {
    setActiveOutfitIndex(prev => (prev + 1) % genderOutfits.length);
  };

  const handlePrevOutfit = () => {
    setActiveOutfitIndex(prev => (prev - 1 + genderOutfits.length) % genderOutfits.length);
  };

  const handleRandomOutfit = () => {
    const rand = Math.floor(Math.random() * genderOutfits.length);
    setActiveOutfitIndex(rand);
  };

  // Favorite toggle
  const handleToggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  // Capture screenshot (compositing video + canvas)
  const handleCaptureScreenshot = () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const screenshotCanvas = document.createElement('canvas');
    screenshotCanvas.width = canvasRef.current.width;
    screenshotCanvas.height = canvasRef.current.height;
    const sCtx = screenshotCanvas.getContext('2d');
    if (!sCtx) return;

    // Draw video feed mirroring first
    sCtx.save();
    sCtx.translate(screenshotCanvas.width, 0);
    sCtx.scale(-1, 1);
    sCtx.drawImage(videoRef.current, 0, 0, screenshotCanvas.width, screenshotCanvas.height);
    sCtx.restore();

    // Draw the garments canvas overlay on top
    sCtx.drawImage(canvasRef.current, 0, 0);

    const imageSrc = screenshotCanvas.toDataURL('image/png');
    const newSnap = {
      id: `snap_${Date.now()}`,
      outfit: activeOutfit!,
      imageSrc,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setCapturedSnaps(prev => [newSnap, ...prev]);
  };

  const handleSelectOutfit = (outfit: Outfit) => {
    const idx = genderOutfits.findIndex(o => o.id === outfit.id);
    if (idx !== -1) {
      setActiveOutfitIndex(idx);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden font-sans">
      <style>{styles}</style>
      
      {/* Outer wrapper container for comparison and administration views */}
      {isAdminOpen ? (
        <div className="w-full h-full z-40">
          <AdminDashboard onBackToMirror={() => setIsAdminOpen(false)} />
        </div>
      ) : (
        <>
          {/* Main Mirror Area */}
          <div ref={containerRef} className="flex-1 relative flex items-center justify-center bg-black">
            
            {/* Real-time Video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />

            {/* Warped Clothing Canvas Overlay */}
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className="absolute w-full h-full object-cover pointer-events-none z-10"
            />

            {/* Upper HUD (Calibration status & Admin buttons) */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
              <div className="flex gap-3">
                <button
                  onClick={onExit}
                  className="px-4 py-2.5 rounded-full bg-black/60 border border-white/10 hover:bg-black/80 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white transition-all cursor-pointer"
                >
                  Exit Mirror
                </button>
                <button
                  onClick={() => setIsAdminOpen(true)}
                  className="px-4 py-2.5 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-yellow-500/10"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Admin Panel</span>
                </button>
              </div>

              {/* Occasion weather selectors */}
              <div className="flex gap-2 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10">
                {(['Casual', 'Business', 'Traditional', 'Party'] as const).map(oc => (
                  <button
                    key={oc}
                    onClick={() => {
                      setFactors(prev => ({ ...prev, occasion: oc }));
                      recalculateRecommendations();
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      factors.occasion === oc 
                        ? 'bg-white text-black' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {oc}
                  </button>
                ))}
              </div>
            </div>

            {/* Guidelines Floating Card */}
            <div className="absolute top-24 left-6 z-20 w-64 bg-black/60 border border-white/10 backdrop-blur-md rounded-2xl p-4 text-xs space-y-3">
              <div className="flex items-center gap-1.5 text-yellow-500 font-bold uppercase tracking-wider text-[10px]">
                <HelpCircle className="w-4 h-4" />
                <span>Mirror Guidelines</span>
              </div>
              <p className="text-neutral-400 leading-normal">
                Stand <strong>4-6 feet</strong> back. Keep your chest and waist inside the camera frame for a perfect size fit.
              </p>
              <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Gesture Shortcuts:</span>
                <div className="grid grid-cols-1 gap-1 font-mono text-[10px]">
                  <div className="flex justify-between"><span className="text-neutral-300">👌 Pinch</span> <span className="text-yellow-500 font-bold">Next Look</span></div>
                  <div className="flex justify-between"><span className="text-neutral-300">👌👌 Dbl Pinch</span> <span className="text-yellow-500 font-bold">Prev Look</span></div>
                  <div className="flex justify-between"><span className="text-neutral-300">👋 Wave Right</span> <span className="text-yellow-500 font-bold">Random Fit</span></div>
                  <div className="flex justify-between"><span className="text-neutral-300">👍 Thumbs Up</span> <span className="text-yellow-500 font-bold">Fav Look</span></div>
                  <div className="flex justify-between"><span className="text-neutral-300">✌️ Peace Sign</span> <span className="text-yellow-500 font-bold">Snap Photo</span></div>
                  <div className="flex justify-between"><span className="text-neutral-300">🤝 Wrists Close</span> <span className="text-yellow-500 font-bold">Show Mode</span></div>
                </div>
              </div>
            </div>

            {/* Bottom HUD (Control center & screenshot trigger) */}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-20">
              {/* Captured Snap Gallery Drawer */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest bg-black/60 px-2.5 py-1 rounded-full border border-white/10 w-fit">
                  Captured Fits ({capturedSnaps.length})
                </span>
                <div className="flex gap-2 max-w-sm overflow-x-auto pb-1 scrollbar-thin">
                  {capturedSnaps.map(snap => {
                    const isInCompare = compareLooks.some(c => c.id === snap.id);
                    return (
                      <div
                        key={snap.id}
                        className="relative group w-14 h-18 rounded-lg overflow-hidden border border-white/20 hover:border-yellow-500 cursor-pointer transition-all flex-shrink-0"
                        onClick={() => {
                          // Toggle compare look
                          if (isInCompare) {
                            setCompareLooks(prev => prev.filter(c => c.id !== snap.id));
                          } else if (compareLooks.length < 2) {
                            setCompareLooks(prev => [...prev, snap]);
                          }
                        }}
                      >
                        <img src={snap.imageSrc} alt="" className="w-full h-full object-cover" />
                        {isInCompare && (
                          <div className="absolute inset-0 bg-yellow-500/30 flex items-center justify-center">
                            <Scale className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        {/* Hover delete */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setCapturedSnaps(prev => prev.filter(c => c.id !== snap.id));
                            setCompareLooks(prev => prev.filter(c => c.id !== snap.id));
                          }}
                          className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-600 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compare split Trigger */}
              <div className="flex gap-3">
                {compareLooks.length > 0 && (
                  <button
                    onClick={() => setIsCompareOpen(true)}
                    className="px-5 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-yellow-500/20"
                  >
                    <Scale className="w-4 h-4" />
                    <span>Compare looks ({compareLooks.length}/2)</span>
                  </button>
                )}

                <button
                  onClick={handleCaptureScreenshot}
                  className="w-14 h-14 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-xl shadow-white/5 border-4 border-black"
                  title="Snap Look"
                >
                  <Camera className="w-6 h-6" />
                </button>

                <button
                  onClick={toggleFashionShow}
                  className={`px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border ${
                    isFashionShowActive
                      ? 'bg-green-600 border-green-500 text-white animate-pulse'
                      : 'bg-black/60 border-white/10 hover:bg-black/80 text-neutral-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span>{isFashionShowActive ? 'Fashion Show ON' : 'Fashion Show'}</span>
                </button>
              </div>
            </div>

            {/* Simulated Scanning sweeping line or calibration success check */}
            {!mediaPipeLoaded && (
              <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md flex flex-col items-center justify-center space-y-4 z-30">
                <div className="w-12 h-12 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
                <span className="text-sm font-mono text-neutral-400">CONNECTING HOLOGRAPHIC CAMERA SKELETON...</span>
              </div>
            )}

            {/* Gesture HUD Feedback toast overlay */}
            {showGestureToast && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-bold uppercase text-xs tracking-wider px-6 py-3.5 rounded-full border-4 border-black shadow-2xl flex items-center gap-2.5 z-40 animate-bounce">
                <Sparkles className="w-4 h-4" />
                <span>{gestureFeedback}</span>
              </div>
            )}
            
          </div>

          {/* Sidebar outfit custom selection catalog */}
          <MirrorSidebar
            outfits={genderOutfits}
            activeOutfit={activeOutfit}
            onSelectOutfit={handleSelectOutfit}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            recommendations={aiRecommendations}
            factors={factors}
            onRefreshRecommendations={recalculateRecommendations}
          />
        </>
      )}

      {/* Compare View Overlay */}
      {isCompareOpen && (
        <CompareView
          looks={compareLooks}
          onClose={() => setIsCompareOpen(false)}
          onRemoveLook={id => {
            setCompareLooks(prev => prev.filter(c => c.id !== id));
            setCapturedSnaps(prev => prev.filter(c => c.id !== id));
          }}
        />
      )}
    </div>
  );
}
