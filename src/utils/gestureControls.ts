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
 * into discrete high-level user navigation gestures with strict single-event latches.
 */
export class GestureDetector {
  private history: { leftWrist: Point3D; rightWrist: Point3D }[] = [];
  private maxHistoryLen = 15;
  
  // Single-event latch state tracking (prevents rapid-fire repeated skipping while pinch is held)
  private isPinchHeld = false;
  private lastPinchReleaseTime = 0;
  private isThumbsUpHeld = false;
  private isPeaceHeld = false;

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

  /**
   * Tracks landmarks over time and evaluates gesture status with strict 1-pinch-1-dress sequential latches.
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
        this.gestureCooldowns[g] -= 33; // approx 30 FPS frame tick
      }
    }

    let detectedGesture: GestureType = 'none';
    let confidence = 0;

    // 1. High-Precision MediaPipe Hands Skeleton Recognition ONLY
    if (handLandmarks && handLandmarks.length > 0) {
      let isPinchingNow = false;
      let isThumbsUpNow = false;
      let isPeaceNow = false;
      let isOpenPalmNow = false;

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

        const handScale = this.distance(wrist, middleMCP) || 0.08;

        // Check Pinch Proximity (thumb tip & index tip)
        const pinchDist = this.distance(thumbTip, indexTip);
        if (pinchDist < handScale * 0.55) {
          isPinchingNow = true;
        }

        // Thumbs Up check
        const isUpright = wrist.y > middleMCP.y;
        const otherFingersClosed =
          indexTip.y > indexMCP.y - handScale * 0.08 &&
          middleTip.y > middleMCP.y - handScale * 0.08 &&
          ringTip.y > ringMCP.y - handScale * 0.08 &&
          pinkyTip.y > pinkyMCP.y - handScale * 0.08;

        if (isUpright && thumbTip.y < thumbMCP.y - handScale * 0.28 && otherFingersClosed) {
          isThumbsUpNow = true;
        }

        // Peace Sign (V) check
        const isIndexExt = indexTip.y < indexMCP.y - handScale * 0.20;
        const isMiddleExt = middleTip.y < middleMCP.y - handScale * 0.20;
        const isRingFolded = ringTip.y > ringMCP.y - handScale * 0.08;
        const isPinkyFolded = pinkyTip.y > pinkyMCP.y - handScale * 0.08;

        if (isUpright && isIndexExt && isMiddleExt && isRingFolded && isPinkyFolded) {
          isPeaceNow = true;
        }

        // Open Palm check
        const allExt =
          indexTip.y < indexMCP.y - handScale * 0.25 &&
          middleTip.y < middleMCP.y - handScale * 0.25 &&
          ringTip.y < ringMCP.y - handScale * 0.25 &&
          pinkyTip.y < pinkyMCP.y - handScale * 0.25;

        if (isUpright && allExt) {
          isOpenPalmNow = true;
        }
      }

      // PINCH SINGLE-EVENT LATCH: Trigger ONCE on pinch-down edge only!
      if (isPinchingNow) {
        if (!this.isPinchHeld) {
          this.isPinchHeld = true;
          const now = timestamp || Date.now();
          // Check for rapid double pinch
          if (now - this.lastPinchReleaseTime < 450 && now - this.lastPinchReleaseTime > 50) {
            detectedGesture = 'double_pinch';
            confidence = 0.99;
          } else {
            detectedGesture = 'pinch';
            confidence = 0.96;
          }
        }
      } else {
        // Pinch released! Reset latch for next clean single pinch
        if (this.isPinchHeld) {
          this.isPinchHeld = false;
          this.lastPinchReleaseTime = timestamp || Date.now();
        }
      }

      // Thumbs Up Latch
      if (isThumbsUpNow) {
        if (!this.isThumbsUpHeld) {
          this.isThumbsUpHeld = true;
          detectedGesture = 'thumbs_up';
          confidence = 0.95;
        }
      } else {
        this.isThumbsUpHeld = false;
      }

      // Peace Sign Latch
      if (isPeaceNow) {
        if (!this.isPeaceHeld) {
          this.isPeaceHeld = true;
          detectedGesture = 'peace';
          confidence = 0.95;
        }
      } else {
        this.isPeaceHeld = false;
      }

      if (detectedGesture === 'none' && isOpenPalmNow) {
        detectedGesture = 'open_palm';
        confidence = 0.92;
      }
    } else {
      // If hands lost, reset latch state
      this.isPinchHeld = false;
      this.isThumbsUpHeld = false;
      this.isPeaceHeld = false;
    }

    // 2. Pose-Based Hand Waving & Wrists Close
    if (detectedGesture === 'none' && poseLandmarks && poseLandmarks.length >= 25) {
      const leftWrist = poseLandmarks[15];
      const rightWrist = poseLandmarks[16];
      const leftShoulder = poseLandmarks[11];
      const rightShoulder = poseLandmarks[12];
      const leftHip = poseLandmarks[23];
      const rightHip = poseLandmarks[24];

      const isLeftWristVisible = leftWrist && (leftWrist.visibility === undefined || leftWrist.visibility > 0.85);
      const isRightWristVisible = rightWrist && (rightWrist.visibility === undefined || rightWrist.visibility > 0.85);

      if (isLeftWristVisible && isRightWristVisible && leftShoulder && rightShoulder && leftHip && rightHip) {
        const shWidth = this.distance(leftShoulder, rightShoulder);

        // Hands Together: Wrists MUST be raised above waist/hip level AND within close distance!
        const isHandsRaisedAboveHips = leftWrist.y < leftHip.y - 0.05 && rightWrist.y < rightHip.y - 0.05;
        const wristDist = this.distance(leftWrist, rightWrist);

        if (isHandsRaisedAboveHips && wristDist < shWidth * 0.20) {
          detectedGesture = 'hands_together';
          confidence = 0.94;
        }

        // Push to motion history for wave detection
        this.history.push({ leftWrist, rightWrist });
        if (this.history.length > this.maxHistoryLen) {
          this.history.shift();
        }

        // Wave Right & Left Detection
        if (detectedGesture === 'none') {
          const isRightHandRaised = rightWrist.y < rightShoulder.y + 0.08;
          const isLeftHandRaised = leftWrist.y < leftShoulder.y + 0.08;

          if (isRightHandRaised && this.history.length >= 6) {
            const rightHistory = this.history.map(h => h.rightWrist);
            if (this.checkWaving(rightHistory)) {
              detectedGesture = 'wave_right';
              confidence = 0.88;
            }
          }

          if (detectedGesture === 'none' && isLeftHandRaised && this.history.length >= 6) {
            const leftHistory = this.history.map(h => h.leftWrist);
            if (this.checkWaving(leftHistory)) {
              detectedGesture = 'wave_left';
              confidence = 0.88;
            }
          }
        }
      }
    }

    // Trigger gesture immediately on event edge with a clean 400ms lockout cooldown
    if (detectedGesture !== 'none' && this.gestureCooldowns[detectedGesture] <= 0) {
      this.gestureCooldowns[detectedGesture] = 400;
      return { gesture: detectedGesture, confidence };
    }

    return { gesture: 'none', confidence: 0 };
  }

  private distance(p1: Point3D, p2: Point3D): number {
    if (!p1 || !p2) return 999;
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  private checkWaving(history: Point3D[]): boolean {
    const validPoints = history.filter(p => p && (p.visibility === undefined || p.visibility > 0.65));
    if (validPoints.length < 6) return false;

    const xCoords = validPoints.map(p => p.x);
    let directionChanges = 0;
    let lastDir = 0;
    let totalMovementX = 0;

    for (let i = 1; i < xCoords.length; i++) {
      const diff = xCoords[i] - xCoords[i - 1];
      totalMovementX += Math.abs(diff);

      if (Math.abs(diff) > 0.008) {
        const currentDir = diff > 0 ? 1 : -1;
        if (lastDir !== 0 && currentDir !== lastDir) {
          directionChanges++;
        }
        lastDir = currentDir;
      }
    }

    return directionChanges >= 2 && totalMovementX > 0.07;
  }
}
