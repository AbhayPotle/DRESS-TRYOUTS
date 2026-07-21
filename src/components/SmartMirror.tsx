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
import { calculateMeasurements, analyzeSkinTone, RecommendationFactors, getAIRecommendations, ScanMeasurements, getRecommendedSize } from '../utils/aiRecommender';
import { GestureDetector, GestureType } from '../utils/gestureControls';
import { drawGarments, drawScanningHUD } from '../utils/garmentWarper';

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
  styleVibe: 'elegant' | 'artistic' | 'casual';
  onExit: () => void;
}

export default function SmartMirror({
  gender,
  initialMeasurements,
  initialStream,
  styleVibe,
  onExit
}: SmartMirrorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Libraries & Data
  const [outfitLibrary] = useState<Outfit[]>(() => generateOutfitLibrary());
  const [genderOutfits] = useState<Outfit[]>(() => {
    // Strictly isolate adult vs children garments based on height metrics (140cm threshold)
    const isChild = initialMeasurements?.heightCm !== null && initialMeasurements.heightCm < 140;
    
    const filtered = outfitLibrary.filter(o => {
      if (gender === 'male') {
        return isChild ? o.gender === 'boy' : o.gender === 'man';
      } else {
        return isChild ? o.gender === 'girl' : o.gender === 'woman';
      }
    });
    // Shuffle using Fisher-Yates algorithm to prevent repeats and show random items
    const arr = [...filtered];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  
  // State
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const [wornOutfit, setWornOutfit] = useState<Outfit | null>(null);
  const activeOutfit = wornOutfit || genderOutfits[activeOutfitIndex] || null;
  
  const [favorites, setFavorites] = useState<string[]>([]);
  const [capturedSnaps, setCapturedSnaps] = useState<{ id: string; outfit: Outfit; imageSrc: string; timestamp: string }[]>([]);
  const [compareLooks, setCompareLooks] = useState<any[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // UI Display state
  const [isUiHidden, setIsUiHidden] = useState(false);

  // Recommendations State
  const [measurements, setMeasurements] = useState<ScanMeasurements>(initialMeasurements);
  const [factors, setFactors] = useState<RecommendationFactors>({
    skinTone: { 
      hex: '#EBEBEB', 
      type: 'Neutral', 
      paletteName: 'Soft Spring Pastels', 
      recommendedColors: ['#93B5C6', '#E6D5B8', '#FFC4DD'],
      description: 'Neutral undertones have a balanced warm/cool ratio. You look wonderful in soft spring pastels, charcoal accents, and champagne golds.',
      colorNames: ['Slate Blue', 'Champagne', 'Blush Rose']
    },
    measurements: initialMeasurements,
    occasion: 'Casual',
    weather: 'sunny',
    season: 'Summer',
    styleVibe
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

  // Body Scanner HUD overlay toggle
  const [showScannerHUD, setShowScannerHUD] = useState(false);
  const showScannerHUDRef = useRef<boolean>(showScannerHUD);

  // Design Studio overrides
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [customTexture, setCustomTexture] = useState<Garment['renderConfig']['texture'] | null>(null);
  const customColorRef = useRef<string | null>(null);
  const customTextureRef = useRef<Garment['renderConfig']['texture'] | null>(null);

  // Auto-reset overrides when outfit index changes
  useEffect(() => {
    setCustomColor(null);
    setCustomTexture(null);
  }, [activeOutfitIndex]);

  // References for Gesture Detector and Hand Tracker
  const gestureDetectorRef = useRef<GestureDetector>(new GestureDetector());
  const handLandmarksRef = useRef<any>(null);
  const lastPinchTimeRef = useRef<number>(0);

  // References to stop background tracking leaks
  const activeCameraRef = useRef<any>(null);
  const activePoseRef = useRef<any>(null);
  const activeHandsRef = useRef<any>(null);
  const lastShoulderCenterRef = useRef<{ x: number; y: number } | null>(null);

  // State synchronization Refs to prevent MediaPipe stale closure bugs
  const activeOutfitRef = useRef<Outfit | null>(activeOutfit);
  const measurementsRef = useRef<ScanMeasurements>(measurements);
  const favoritesRef = useRef<string[]>(favorites);
  const compareLooksRef = useRef<any[]>(compareLooks);
  const genderOutfitsRef = useRef<Outfit[]>(genderOutfits);
  const isFashionShowActiveRef = useRef<boolean>(isFashionShowActive);

  // Sync refs on every single render
  useEffect(() => {
    activeOutfitRef.current = activeOutfit;
    measurementsRef.current = measurements;
    favoritesRef.current = favorites;
    compareLooksRef.current = compareLooks;
    genderOutfitsRef.current = genderOutfits;
    isFashionShowActiveRef.current = isFashionShowActive;
    showScannerHUDRef.current = showScannerHUD;
    customColorRef.current = customColor;
    customTextureRef.current = customTexture;
  });

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

    // Recommendations will recalculate reactively via useEffect on factors change


    return () => {
      if (fashionShowTimerRef.current) clearInterval(fashionShowTimerRef.current);
      if (activeCameraRef.current) {
        try { activeCameraRef.current.stop(); } catch (e) {}
        activeCameraRef.current = null;
      }
      if (activePoseRef.current) {
        try { activePoseRef.current.close(); } catch (e) {}
        activePoseRef.current = null;
      }
      if (activeHandsRef.current) {
        try { activeHandsRef.current.close(); } catch (e) {}
        activeHandsRef.current = null;
      }
    };
  }, []);

  // Recalculate recommendations helper
  const recalculateRecommendations = () => {
    const recs = getAIRecommendations(genderOutfits, factors);
    setAiRecommendations(recs);
  };

  useEffect(() => {
    recalculateRecommendations();
  }, [factors]);

  // Setup MediaPipe Tracker
  const setupMediaPipeTracker = () => {
    const mpPose = (window as any).Pose;
    const mpCamera = (window as any).Camera;
    const mpHands = (window as any).Hands;

    if (!mpPose || !mpCamera || !videoRef.current) {
      startSkeletonSimulation();
      return;
    }

    // Clean up any existing active camera loops to prevent duplicate overlays (double dresses)
    if (activeCameraRef.current) {
      try { activeCameraRef.current.stop(); } catch (e) {}
      activeCameraRef.current = null;
    }
    if (activePoseRef.current) {
      try { activePoseRef.current.close(); } catch (e) {}
      activePoseRef.current = null;
    }
    if (activeHandsRef.current) {
      try { activeHandsRef.current.close(); } catch (e) {}
      activeHandsRef.current = null;
    }

    const pose = new mpPose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    activePoseRef.current = pose;

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
      activeHandsRef.current = hands;
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.45,
        minTrackingConfidence: 0.45
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

      if (results.poseLandmarks) {
        const lS = results.poseLandmarks[11];
        const rS = results.poseLandmarks[12];
        
        if (lS && rS) {
          const currentX = (lS.x + rS.x) / 2;
          const currentY = (lS.y + rS.y) / 2;
          
          if (lastShoulderCenterRef.current) {
            const jumpDist = Math.sqrt(
              Math.pow(currentX - lastShoulderCenterRef.current.x, 2) + 
              Math.pow(currentY - lastShoulderCenterRef.current.y, 2)
            );
            
            // Rejects background person tracking jumps
            if (jumpDist > 0.20) {
              return; 
            }
            
            lastShoulderCenterRef.current = {
              x: lastShoulderCenterRef.current.x * 0.7 + currentX * 0.3,
              y: lastShoulderCenterRef.current.y * 0.7 + currentY * 0.3
            };
          } else {
            lastShoulderCenterRef.current = { x: currentX, y: currentY };
          }
        }

        // Proceed to render on canvas
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw the warped clothing textures using up-to-date activeOutfitRef with Design Studio overrides
        const itemsToDraw = activeOutfitRef.current
          ? activeOutfitRef.current.items.map(item => {
              if (['top', 'bottom', 'full', 'outerwear'].includes(item.type)) {
                return {
                  ...item,
                  renderConfig: {
                    ...item.renderConfig,
                    baseColor: customColorRef.current || item.renderConfig.baseColor,
                    texture: customTextureRef.current || item.renderConfig.texture
                  }
                };
              }
              return item;
            })
          : [];

        drawGarments(
          ctx, 
          results.poseLandmarks, 
          itemsToDraw, 
          measurementsRef.current, 
          canvas.width, 
          canvas.height
        );

        // Draw futuristic real-time Body Scanner HUD if enabled
        if (showScannerHUDRef.current) {
          drawScanningHUD(
            ctx,
            results.poseLandmarks,
            measurementsRef.current,
            canvas.width,
            canvas.height
          );
        }

        // Check for Precise Pinch Gesture using MediaPipe Hands!
        let hasPrecisePinch = false;
        if (handLandmarksRef.current && handLandmarksRef.current.length > 0) {
          for (const hand of handLandmarksRef.current) {
            const thumbTip = hand[4];
            const indexTip = hand[8];
            if (thumbTip && indexTip) {
              const d = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
              if (d < 0.078) { // sub-pixel pinch threshold (optimized for sensitivity)
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
              const isPinching = d < 0.078;

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

        // Process Gestures via Unified GestureDetector
        const detected = gestureDetectorRef.current.update(
          results.poseLandmarks,
          handLandmarksRef.current,
          Date.now()
        );
        let gestureToTrigger: GestureType = 'none';
        if (detected.gesture !== 'none') {
          gestureToTrigger = detected.gesture;
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

    activeCameraRef.current = camera;
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

      // Draw the warped clothing garments with Design Studio overrides
      const itemsToDrawSim = activeOutfit
        ? activeOutfit.items.map(item => {
            if (['top', 'bottom', 'full', 'outerwear'].includes(item.type)) {
              return {
                ...item,
                renderConfig: {
                  ...item.renderConfig,
                  baseColor: customColor || item.renderConfig.baseColor,
                  texture: customTexture || item.renderConfig.texture
                }
              };
            }
            return item;
          })
        : [];

      drawGarments(
        ctx, 
        simLandmarks, 
        itemsToDrawSim, 
        measurements, 
        canvas.width, 
        canvas.height
      );

      if (showScannerHUD) {
        drawScanningHUD(
          ctx,
          simLandmarks,
          measurements,
          canvas.width,
          canvas.height
        );
      }

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

    // Perform specific action using up-to-date refs
    if (gesture === 'pinch') {
      setActiveOutfitIndex(prev => (prev + 1) % genderOutfitsRef.current.length);
    } else if (gesture === 'double_pinch') {
      setActiveOutfitIndex(prev => (prev - 1 + genderOutfitsRef.current.length) % genderOutfitsRef.current.length);
    } else if (gesture === 'wave_right') {
      const rand = Math.floor(Math.random() * genderOutfitsRef.current.length);
      setActiveOutfitIndex(rand);
    } else if (gesture === 'thumbs_up') {
      const active = activeOutfitRef.current;
      if (active) {
        setFavorites(prev => 
          prev.includes(active.id) ? prev.filter(f => f !== active.id) : [...prev, active.id]
        );
      }
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
    if (isFashionShowActiveRef.current) {
      if (fashionShowTimerRef.current) clearInterval(fashionShowTimerRef.current);
      setIsFashionShowActive(false);
    } else {
      setIsFashionShowActive(true);
      fashionShowTimerRef.current = setInterval(() => {
        setActiveOutfitIndex(prev => (prev + 1) % genderOutfitsRef.current.length);
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
      outfit: activeOutfitRef.current || activeOutfit!,
      imageSrc,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setCapturedSnaps(prev => [newSnap, ...prev]);
  };

  const handleSelectOutfit = (outfit: Outfit) => {
    const selectedGarment = outfit.items[0];
    if (!selectedGarment) return;

    setWornOutfit(prev => {
      const prevItems = prev ? prev.items : [];
      let nextItems = [...prevItems];

      if (selectedGarment.type === 'full') {
        // If it's a full body dress/saree/sherwani, remove other top/bottom/full garments
        nextItems = nextItems.filter(g => g.type !== 'top' && g.type !== 'bottom' && g.type !== 'full');
        nextItems.push(selectedGarment);
      } else if (selectedGarment.type === 'top') {
        // Remove existing top and full body garments
        nextItems = nextItems.filter(g => g.type !== 'top' && g.type !== 'full');
        nextItems.push(selectedGarment);
      } else if (selectedGarment.type === 'bottom') {
        // Remove existing bottom and full body garments
        nextItems = nextItems.filter(g => g.type !== 'bottom' && g.type !== 'full');
        nextItems.push(selectedGarment);
      } else {
        // For accessories, shoes, outerwear: replace existing item of same type
        nextItems = nextItems.filter(g => g.type !== selectedGarment.type);
        nextItems.push(selectedGarment);
      }

      const totalPrice = nextItems.reduce((sum, g) => sum + g.price, 0);

      return {
        id: `worn_outfit_${Date.now()}`,
        name: selectedGarment.name,
        gender: outfit.gender,
        category: selectedGarment.category,
        styleTags: selectedGarment.styleTags,
        items: nextItems,
        description: selectedGarment.description,
        totalPrice
      };
    });

    const idx = genderOutfits.findIndex(o => o.id === outfit.id);
    if (idx !== -1 && idx !== activeOutfitIndex) {
      setActiveOutfitIndex(idx);
    }
  };

  // Sync index-based gesture cycling and timers to worn selection
  useEffect(() => {
    const nextOutfit = genderOutfits[activeOutfitIndex];
    if (nextOutfit) {
      const selectedGarment = nextOutfit.items[0];
      if (selectedGarment) {
        setWornOutfit(prev => {
          const prevItems = prev ? prev.items : [];
          let nextItems = [...prevItems];
          if (selectedGarment.type === 'full') {
            nextItems = nextItems.filter(g => g.type !== 'top' && g.type !== 'bottom' && g.type !== 'full');
            nextItems.push(selectedGarment);
          } else if (selectedGarment.type === 'top') {
            nextItems = nextItems.filter(g => g.type !== 'top' && g.type !== 'full');
            nextItems.push(selectedGarment);
          } else if (selectedGarment.type === 'bottom') {
            nextItems = nextItems.filter(g => g.type !== 'bottom' && g.type !== 'full');
            nextItems.push(selectedGarment);
          } else {
            nextItems = nextItems.filter(g => g.type !== selectedGarment.type);
            nextItems.push(selectedGarment);
          }
          const totalPrice = nextItems.reduce((sum, g) => sum + g.price, 0);
          return {
            id: `worn_outfit_${Date.now()}`,
            name: selectedGarment.name,
            gender: nextOutfit.gender,
            category: selectedGarment.category,
            styleTags: selectedGarment.styleTags,
            items: nextItems,
            description: selectedGarment.description,
            totalPrice
          };
        });
      }
    }
  }, [activeOutfitIndex, genderOutfits]);

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
            {!isUiHidden && (
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
                  <button
                    onClick={() => setShowScannerHUD(prev => !prev)}
                    className={`px-4 py-2.5 rounded-full border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg backdrop-blur-md ${
                      showScannerHUD 
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-cyan-500/20' 
                        : 'bg-black/60 hover:bg-black/80 text-cyan-400 border-cyan-500/30'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>{showScannerHUD ? "Scanner HUD: ON" : "Scanner HUD: OFF"}</span>
                  </button>
                </div>

                {/* Occasion weather selectors */}
                <div className="flex gap-2 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10">
                  {(['Casual', 'Business', 'Traditional', 'Party'] as const).map(oc => (
                    <button
                      key={oc}
                      onClick={() => {
                        setFactors(prev => ({ ...prev, occasion: oc }));
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
                  <button
                    onClick={() => setIsUiHidden(true)}
                    className="px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/40 hover:text-white flex items-center gap-1 ml-1"
                  >
                    <span>👁️ Hide HUD</span>
                  </button>
                </div>
              </div>
            )}

            {/* Guidelines Floating Card */}
            {!isUiHidden && (
              <div className="absolute top-24 left-6 z-20 w-64 bg-black/60 border border-white/10 backdrop-blur-md rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-center gap-1.5 text-yellow-500 font-bold uppercase tracking-wider text-[10px]">
                  <HelpCircle className="w-4 h-4" />
                  <span>Mirror Guidelines</span>
                </div>
                <p className="text-neutral-400 leading-normal">
                  Align your shoulders and face in the frame. Works whether you are sitting close or standing back!
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

                <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                  <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Fit Calibration:</span>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-300">Your Recommended Size:</span>
                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">
                      {getRecommendedSize(measurements, gender)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[9px] text-neutral-300 font-mono mt-1 pt-1 border-t border-white/5">
                    <span>Chest: {measurements.chestCm ? `${measurements.chestCm}cm` : 'N/A'}</span>
                    <span>Waist: {measurements.waistCm ? `${measurements.waistCm}cm` : 'N/A'}</span>
                    <span>Shoulder: {measurements.shoulderWidthCm ? `${measurements.shoulderWidthCm}cm` : 'N/A'}</span>
                    <span>Height: {measurements.heightCm ? `${measurements.heightCm}cm` : 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                  <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Style Vibe:</span>
                  <div className="flex gap-1">
                    {[
                      { id: 'elegant', label: 'Elegant' },
                      { id: 'artistic', label: 'Artistic' },
                      { id: 'casual', label: 'Casual' }
                    ].map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setFactors(prev => ({ ...prev, styleVibe: v.id as any }));
                        }}
                        className={`flex-1 py-1 rounded text-[9px] font-bold transition-all cursor-pointer border ${
                          factors.styleVibe === v.id
                            ? 'bg-yellow-500 text-black border-yellow-400 font-black'
                            : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom HUD (Control center & screenshot trigger) */}
            {!isUiHidden && (
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Screenshot, fashion show, compare widgets */}
                <div className="flex items-center gap-4">
                  {compareLooks.length > 0 && (
                    <button
                      onClick={() => setIsCompareOpen(true)}
                      className="px-5 py-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white border border-cyan-400 font-bold text-xs uppercase tracking-wider transition-transform hover:scale-105 flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
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
            )}

            {/* Design Customization Bar */}
            {activeOutfit && !isUiHidden && (
              <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/75 border border-white/10 backdrop-blur-lg px-6 py-3.5 rounded-3xl flex flex-col gap-2.5 items-center z-20 shadow-2xl animate-fade-in w-[90%] max-w-md">
                <div className="flex items-center gap-1.5 text-[9px] text-cyan-400 font-bold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  <span>Interactive Design Studio</span>
                </div>
                
                <div className="flex gap-4 w-full justify-between items-center border-t border-white/5 pt-2">
                  {/* Colors */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">Garment Color</span>
                    <div className="flex gap-1.5">
                      {['#960A0A', '#0A0A0A', '#FAFAFA', '#0F4C81', '#1B4D3E'].map(hex => (
                        <button
                          key={hex}
                          onClick={() => setCustomColor(hex)}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            (customColor || activeOutfit.items[0]?.renderConfig.baseColor) === hex 
                              ? 'border-cyan-400 scale-110 shadow-lg shadow-cyan-400/20' 
                              : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-[1px] h-8 bg-white/5" />

                  {/* Fabrics */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">Fabric Texture</span>
                    <div className="flex gap-1">
                      {(['plain', 'stripes', 'plaid', 'denim', 'silk'] as const).map(tex => (
                        <button
                          key={tex}
                          onClick={() => setCustomTexture(tex)}
                          className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                            (customTexture || activeOutfit.items[0]?.renderConfig.texture || 'plain') === tex 
                              ? 'bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/10' 
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {tex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
          {!isUiHidden && (
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
          )}

          {/* Floating Show Controls button when UI is hidden */}
          {isUiHidden && (
            <button
              onClick={() => setIsUiHidden(false)}
              className="absolute top-6 right-6 z-30 px-4.5 py-3 rounded-full bg-black/85 border border-white/20 hover:bg-white hover:text-black backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white shadow-2xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer animate-fade-in"
            >
              <span>👁️ Show HUD controls</span>
            </button>
          )}
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
