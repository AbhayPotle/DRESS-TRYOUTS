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
  private history: { leftWrist: Point3D; rightWrist: Point3D }[] = [];
  private maxHistoryLen = 15;
  private lastPinchTimestamp = 0;

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
   * Tracks landmarks over time and evaluates gesture status with zero-latency detection.
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

    // 1. High-Precision MediaPipe Hands Skeleton Recognition (21 joints)
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

        // Check Pinch (thumb tip & index tip proximity)
        const pinchDist = this.distance(thumbTip, indexTip);
        if (pinchDist < handScale * 0.88) {
          isPinching = true;
        }

        // Thumbs Up check
        const isUpright = wrist.y > middleMCP.y;
        const otherFingersClosed =
          indexTip.y > indexMCP.y - handScale * 0.12 &&
          middleTip.y > middleMCP.y - handScale * 0.12 &&
          ringTip.y > ringMCP.y - handScale * 0.12 &&
          pinkyTip.y > pinkyMCP.y - handScale * 0.12;

        if (isUpright && thumbTip.y < thumbMCP.y - handScale * 0.22 && otherFingersClosed) {
          isThumbsUp = true;
        }

        // Peace Sign (V) check
        const isIndexExt = indexTip.y < indexMCP.y - handScale * 0.18;
        const isMiddleExt = middleTip.y < middleMCP.y - handScale * 0.18;
        const isRingFolded = ringTip.y > ringMCP.y - handScale * 0.08;
        const isPinkyFolded = pinkyTip.y > pinkyMCP.y - handScale * 0.08;

        if (isUpright && isIndexExt && isMiddleExt && isRingFolded && isPinkyFolded) {
          isPeace = true;
        }

        // Open Palm check
        const allExt =
          indexTip.y < indexMCP.y - handScale * 0.22 &&
          middleTip.y < middleMCP.y - handScale * 0.22 &&
          ringTip.y < ringMCP.y - handScale * 0.22 &&
          pinkyTip.y < pinkyMCP.y - handScale * 0.22;

        if (isUpright && allExt) {
          isOpenPalm = true;
        }
      }

      if (isPinching) {
        const now = timestamp || Date.now();
        if (now - this.lastPinchTimestamp < 480 && now - this.lastPinchTimestamp > 80) {
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

    // 2. Pose-Based Distance-Invariant Fallback Gesture Recognition (33 joints)
    if (detectedGesture === 'none' && poseLandmarks && poseLandmarks.length >= 23) {
      const leftWrist = poseLandmarks[15];
      const rightWrist = poseLandmarks[16];
      const leftIndex = poseLandmarks[19];
      const rightIndex = poseLandmarks[20];
      const leftThumb = poseLandmarks[21];
      const rightThumb = poseLandmarks[22];
      const leftShoulder = poseLandmarks[11];
      const rightShoulder = poseLandmarks[12];

      if (leftWrist && rightWrist) {
        const shWidth = (leftShoulder && rightShoulder) ? this.distance(leftShoulder, rightShoulder) : 0.25;

        // Fallback Pinch via Pose index/thumb points
        if (leftIndex && leftThumb) {
          const lPinchDist = this.distance(leftIndex, leftThumb);
          if (lPinchDist < shWidth * 0.22) {
            detectedGesture = 'pinch';
            confidence = 0.90;
          }
        }
        if (rightIndex && rightThumb && detectedGesture === 'none') {
          const rPinchDist = this.distance(rightIndex, rightThumb);
          if (rPinchDist < shWidth * 0.22) {
            detectedGesture = 'pinch';
            confidence = 0.90;
          }
        }

        // Hands Together: Wrists close
        const wristDist = this.distance(leftWrist, rightWrist);
        if (wristDist < shWidth * 0.42) {
          detectedGesture = 'hands_together';
          confidence = 0.92;
        }

        // Push to motion history for wave detection
        this.history.push({ leftWrist, rightWrist });
        if (this.history.length > this.maxHistoryLen) {
          this.history.shift();
        }

        // Wave Right & Left Detection
        if (detectedGesture === 'none') {
          const isRightHandRaised = rightShoulder && rightWrist.y < rightShoulder.y + 0.15;
          const isLeftHandRaised = leftShoulder && leftWrist.y < leftShoulder.y + 0.15;

          if (isRightHandRaised && this.history.length >= 5) {
            const rightHistory = this.history.map(h => h.rightWrist);
            if (this.checkWaving(rightHistory)) {
              detectedGesture = 'wave_right';
              confidence = 0.88;
            }
          }

          if (detectedGesture === 'none' && isLeftHandRaised && this.history.length >= 5) {
            const leftHistory = this.history.map(h => h.leftWrist);
            if (this.checkWaving(leftHistory)) {
              detectedGesture = 'wave_left';
              confidence = 0.88;
            }
          }
        }
      }
    }

    // Fast Cooldown Trigger: Immediate response without artificial frame accumulation latency
    if (detectedGesture !== 'none' && this.gestureCooldowns[detectedGesture] <= 0) {
      // Cooldown length (ms): Snappy 320ms for pinch/double-pinch, 400ms for other gestures
      const cooldownMs = (detectedGesture === 'pinch' || detectedGesture === 'double_pinch') ? 320 : 400;
      this.gestureCooldowns[detectedGesture] = cooldownMs;
      return { gesture: detectedGesture, confidence };
    }

    return { gesture: 'none', confidence: 0 };
  }

  private distance(p1: Point3D, p2: Point3D): number {
    if (!p1 || !p2) return 999;
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  private checkWaving(history: Point3D[]): boolean {
    const validPoints = history.filter(p => p && (p.visibility === undefined || p.visibility > 0.40));
    if (validPoints.length < 5) return false;

    const xCoords = validPoints.map(p => p.x);
    let directionChanges = 0;
    let lastDir = 0;
    let totalMovementX = 0;

    for (let i = 1; i < xCoords.length; i++) {
      const diff = xCoords[i] - xCoords[i - 1];
      totalMovementX += Math.abs(diff);

      if (Math.abs(diff) > 0.006) {
        const currentDir = diff > 0 ? 1 : -1;
        if (lastDir !== 0 && currentDir !== lastDir) {
          directionChanges++;
        }
        lastDir = currentDir;
      }
    }

    return directionChanges >= 1 && totalMovementX > 0.05;
  }
}
