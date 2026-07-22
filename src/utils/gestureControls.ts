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
 * into discrete high-level user navigation gestures with zero false-positive triggers.
 */
export class GestureDetector {
  private history: { leftWrist: Point3D; rightWrist: Point3D }[] = [];
  private maxHistoryLen = 15;
  private lastPinchTimestamp = 0;
  private consecutiveFrameCounter: Record<GestureType, number> = {
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
   * Tracks landmarks over time and evaluates gesture status with strict false-positive prevention.
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

    // 1. High-Precision MediaPipe Hands Skeleton Recognition ONLY (Prevents noise false triggers)
    if (handLandmarks && handLandmarks.length > 0) {
      let isPinching = false;
      let isThumbsUp = false;
      let isPeace = false;
      let isOpenPalm = false;

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

        // Check Pinch (thumb tip & index tip must touch closely)
        const pinchDist = this.distance(thumbTip, indexTip);
        if (pinchDist < handScale * 0.52) {
          isPinching = true;
        }

        // Thumbs Up check (hand upright, thumb extended up, other fingers folded down)
        const isUpright = wrist.y > middleMCP.y;
        const otherFingersClosed =
          indexTip.y > indexMCP.y - handScale * 0.08 &&
          middleTip.y > middleMCP.y - handScale * 0.08 &&
          ringTip.y > ringMCP.y - handScale * 0.08 &&
          pinkyTip.y > pinkyMCP.y - handScale * 0.08;

        if (isUpright && thumbTip.y < thumbMCP.y - handScale * 0.28 && otherFingersClosed) {
          isThumbsUp = true;
        }

        // Peace Sign (V) check (index & middle extended up, ring & pinky folded down)
        const isIndexExt = indexTip.y < indexMCP.y - handScale * 0.20;
        const isMiddleExt = middleTip.y < middleMCP.y - handScale * 0.20;
        const isRingFolded = ringTip.y > ringMCP.y - handScale * 0.08;
        const isPinkyFolded = pinkyTip.y > pinkyMCP.y - handScale * 0.08;

        if (isUpright && isIndexExt && isMiddleExt && isRingFolded && isPinkyFolded) {
          isPeace = true;
        }

        // Open Palm check (all 4 fingers extended upright)
        const allExt =
          indexTip.y < indexMCP.y - handScale * 0.25 &&
          middleTip.y < middleMCP.y - handScale * 0.25 &&
          ringTip.y < ringMCP.y - handScale * 0.25 &&
          pinkyTip.y < pinkyMCP.y - handScale * 0.25;

        if (isUpright && allExt) {
          isOpenPalm = true;
        }
      }

      if (isPinching) {
        const now = timestamp || Date.now();
        if (now - this.lastPinchTimestamp < 480 && now - this.lastPinchTimestamp > 120) {
          detectedGesture = 'double_pinch';
          confidence = 0.99;
          this.lastPinchTimestamp = 0;
        } else {
          detectedGesture = 'pinch';
          confidence = 0.96;
          this.lastPinchTimestamp = now;
        }
      } else if (isThumbsUp) {
        detectedGesture = 'thumbs_up';
        confidence = 0.95;
      } else if (isPeace) {
        detectedGesture = 'peace';
        confidence = 0.95;
      } else if (isOpenPalm) {
        detectedGesture = 'open_palm';
        confidence = 0.92;
      }
    }

    // 2. Pose-Based Hand Waving & Wrists Close (Strictly requires hands raised above waist!)
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

        // Wave Right & Left Detection (Hand MUST be raised above shoulder level!)
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

    // Frame Hysteresis: Require 2 consecutive frames of gesture detection to prevent accidental single-frame noise triggers
    for (const key in this.consecutiveFrameCounter) {
      const g = key as GestureType;
      if (g === detectedGesture && g !== 'none') {
        this.consecutiveFrameCounter[g] += 1;
      } else {
        this.consecutiveFrameCounter[g] = 0;
      }
    }

    const minConsecutiveFrames = (detectedGesture === 'pinch' || detectedGesture === 'double_pinch') ? 1 : 2;

    if (
      detectedGesture !== 'none' &&
      this.consecutiveFrameCounter[detectedGesture] >= minConsecutiveFrames &&
      this.gestureCooldowns[detectedGesture] <= 0
    ) {
      const cooldownMs = (detectedGesture === 'pinch' || detectedGesture === 'double_pinch') ? 500 : 700;
      this.gestureCooldowns[detectedGesture] = cooldownMs;
      this.consecutiveFrameCounter[detectedGesture] = 0;
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
