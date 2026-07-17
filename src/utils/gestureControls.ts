/**
 * Supported touch-free gestures for interactive smart mirror navigation.
 */
export type GestureType =
  | 'none'
  | 'pinch'
  | 'double_pinch'
  | 'wave_right'
  | 'wave_left'
  | 'thumbs_up'
  | 'peace'
  | 'open_palm'
  | 'hands_together';

/**
 * Normalized 3D point structure for body skeleton keypoint mapping.
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * GestureDetector class maps raw multi-frame coordinate inputs from MediaPipe
 * into discrete high-level user navigation gestures using spatial thresholds.
 */
export class GestureDetector {
  private history: { leftHand: Point3D[]; rightHand: Point3D[]; leftWrist: Point3D[]; rightWrist: Point3D[] }[] = [];
  private maxHistoryLen = 30; // 1 second at 30 FPS
  private gestureCooldowns: Record<GestureType, number> = {
    none: 0,
    pinch: 0,
    double_pinch: 0,
    wave_right: 0,
    wave_left: 0,
    thumbs_up: 0,
    peace: 0,
    open_palm: 0,
    hands_together: 0
  };

  private gestureConfidence: Record<GestureType, number> = {
    none: 0,
    pinch: 0,
    double_pinch: 0,
    wave_right: 0,
    wave_left: 0,
    thumbs_up: 0,
    peace: 0,
    open_palm: 0,
    hands_together: 0
  };

  /**
   * Tracks landmarks over time and evaluates gesture status.
   * Returns the detected gesture if its confidence threshold is met and cooldown has expired.
   */
  public update(
    poseLandmarks: Point3D[],
    handLandmarks: Point3D[][] | null,
    timestamp: number
  ): { gesture: GestureType; confidence: number } {
    // Decrement cooldowns
    for (const key in this.gestureCooldowns) {
      const g = key as GestureType;
      if (this.gestureCooldowns[g] > 0) {
        this.gestureCooldowns[g] -= 16.6; // assume approx 60 FPS tick (16.6ms)
      }
    }

    let activeGesture: GestureType = 'none';
    let activeConfidence = 0;

    // 1. High-Fidelity Gesture Recognition using MediaPipe Hands 21-joint skeleton
    if (handLandmarks && handLandmarks.length > 0) {
      for (const hand of handLandmarks) {
        if (hand.length < 21) continue;

        const wrist = hand[0];
        const thumbTip = hand[4];
        const thumbMCP = hand[2];
        const indexTip = hand[8];
        const indexMCP = hand[5];
        const middleTip = hand[12];
        const middleMCP = hand[9];
        const ringTip = hand[16];
        const ringMCP = hand[13];
        const pinkyTip = hand[20];
        const pinkyMCP = hand[17];

        if (!wrist || !thumbTip || !indexTip || !middleTip || !ringTip || !pinkyTip) continue;

        // Calculate dynamic hand size in screen space to make all gestures distance-invariant!
        const handScale = this.distance(wrist, middleMCP) || 0.08;

        // Check if hand is flipped or upright
        const isUpright = wrist.y > middleMCP.y;

        // Distance between thumb tip and index tip for pinch (scaled)
        const pinchDist = this.distance(thumbTip, indexTip);
        if (pinchDist < handScale * 0.48) {
          activeGesture = 'pinch';
          activeConfidence = 0.95;
          break;
        }

        // Thumbs Up: Thumb tip is high above wrist/knuckles, other fingers are curled/closed
        const otherFingersClosed = 
          indexTip.y > indexMCP.y && 
          middleTip.y > middleMCP.y && 
          ringTip.y > ringMCP.y && 
          pinkyTip.y > pinkyMCP.y;

        if (isUpright && thumbTip.y < thumbMCP.y - handScale * 0.3 && otherFingersClosed) {
          activeGesture = 'thumbs_up';
          activeConfidence = 0.95;
          break;
        }

        // Peace Sign: Index and Middle are extended, Ring and Pinky are closed
        const isIndexExtended = indexTip.y < indexMCP.y - handScale * 0.22;
        const isMiddleExtended = middleTip.y < middleMCP.y - handScale * 0.22;
        const isRingClosed = ringTip.y > ringMCP.y - handScale * 0.1;
        const isPinkyClosed = pinkyTip.y > pinkyMCP.y - handScale * 0.1;

        if (isUpright && isIndexExtended && isMiddleExtended && isRingClosed && isPinkyClosed) {
          activeGesture = 'peace';
          activeConfidence = 0.95;
          break;
        }

        // Open Palm: All fingers fully extended and spread out
        const allExtended = 
          indexTip.y < indexMCP.y - handScale * 0.38 && 
          middleTip.y < middleMCP.y - handScale * 0.38 && 
          ringTip.y < ringMCP.y - handScale * 0.38 && 
          pinkyTip.y < pinkyMCP.y - handScale * 0.38;

        if (isUpright && allExtended) {
          activeGesture = 'open_palm';
          activeConfidence = 0.90;
          break;
        }
      }
    }

    // 2. Low-Fidelity Fallback Gesture Recognition using MediaPipe Pose Landmarks
    if (activeGesture === 'none' && poseLandmarks && poseLandmarks.length >= 23) {
      const leftWrist = poseLandmarks[15];
      const rightWrist = poseLandmarks[16];
      const leftIndex = poseLandmarks[19];
      const rightIndex = poseLandmarks[20];
      const leftThumb = poseLandmarks[21];
      const rightThumb = poseLandmarks[22];
      const leftElbow = poseLandmarks[13];
      const rightElbow = poseLandmarks[14];

      if (leftWrist && rightWrist && leftIndex && rightIndex && leftThumb && rightThumb) {
        // Push Pose landmarks to history for wave detection
        this.history.push({
          leftHand: [leftIndex, leftThumb],
          rightHand: [rightIndex, rightThumb],
          leftWrist: [leftWrist],
          rightWrist: [rightWrist]
        });

        if (this.history.length > this.maxHistoryLen) {
          this.history.shift();
        }

        const isLeftWristVisible = leftWrist.visibility! > 0.82;
        const isRightWristVisible = rightWrist.visibility! > 0.82;

        // Hands Together: Wrists are close
        const wristDist = this.distance(leftWrist, rightWrist);
        if (wristDist < 0.12 && isLeftWristVisible && isRightWristVisible) {
          activeGesture = 'hands_together';
          activeConfidence = 0.90;
        }

        // Strict raising constraint: Wrist must be raised above the elbow to prevent false triggers when resting arms down
        const isRightHandRaised = rightElbow && rightWrist.y < rightElbow.y - 0.05;
        const isLeftHandRaised = leftElbow && leftWrist.y < leftElbow.y - 0.05;

        // Wave Right
        if (activeGesture === 'none' && isRightWristVisible && isRightHandRaised) {
          const isWavingRight = this.checkWaving(this.history.map(h => h.rightWrist[0]));
          if (isWavingRight) {
            activeGesture = 'wave_right';
            activeConfidence = 0.85;
          }
        }

        // Wave Left
        if (activeGesture === 'none' && isLeftWristVisible && isLeftHandRaised) {
          const isWavingLeft = this.checkWaving(this.history.map(h => h.leftWrist[0]));
          if (isWavingLeft) {
            activeGesture = 'wave_left';
            activeConfidence = 0.85;
          }
        }
      }
    }

    // Handle gesture confidence accumulation
    const requiredFrames = activeGesture === 'pinch' ? 2 : 6; // pinch is high priority, trigger faster!
    
    for (const key in this.gestureConfidence) {
      const g = key as GestureType;
      if (g === activeGesture) {
        this.gestureConfidence[g] = Math.min(10, this.gestureConfidence[g] + 1);
      } else {
        this.gestureConfidence[g] = Math.max(0, this.gestureConfidence[g] - 1);
      }
    }

    if (activeGesture !== 'none' && this.gestureConfidence[activeGesture] >= requiredFrames) {
      if (this.gestureCooldowns[activeGesture] <= 0) {
        this.setCooldown(activeGesture, activeGesture === 'pinch' ? 1200 : 1600); // cooldown lengths
        this.resetConfidence();
        return { gesture: activeGesture, confidence: activeConfidence };
      }
    }

    return { gesture: 'none', confidence: 0 };
  }

  private distance(p1: Point3D, p2: Point3D): number {
    if (!p1 || !p2) return 999;
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  private setCooldown(gesture: GestureType, ms: number) {
    this.gestureCooldowns[gesture] = ms;
  }

  private resetConfidence() {
    for (const key in this.gestureConfidence) {
      this.gestureConfidence[key as GestureType] = 0;
    }
  }

  private checkWaving(history: Point3D[]): boolean {
    const validPoints = history.filter(p => p && p.visibility! > 0.5);
    if (validPoints.length < 15) return false;

    const last15 = validPoints.slice(-15);
    const xCoords = last15.map(p => p.x);
    
    const mean = xCoords.reduce((a, b) => a + b, 0) / xCoords.length;
    const variance = xCoords.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / xCoords.length;
    const stdDev = Math.sqrt(variance);

    const yCoords = last15.map(p => p.y);
    const yMean = yCoords.reduce((a, b) => a + b, 0) / yCoords.length;
    const yVariance = yCoords.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) / yCoords.length;
    const yStdDev = Math.sqrt(yVariance);

    return stdDev > 0.045 && yStdDev < 0.025; // slightly tightened threshold to prevent false waves
  }
}
