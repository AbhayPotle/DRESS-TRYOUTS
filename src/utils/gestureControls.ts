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

  private pinchDetectedTime = 0;
  private pinchActive = false;

  /**
   * Tracks landmarks over time and evaluates gesture status.
   * Returns the detected gesture if its confidence threshold is met and cooldown has expired.
   */
  public update(landmarks: Point3D[], timestamp: number): { gesture: GestureType; confidence: number } {
    // MediaPipe Pose landmarks mapping:
    // 15: Left Wrist, 16: Right Wrist
    // 17: Left Pinky, 18: Right Pinky
    // 19: Left Index, 20: Right Index
    // 21: Left Thumb, 22: Right Thumb
    if (!landmarks || landmarks.length < 23) {
      return { gesture: 'none', confidence: 0 };
    }

    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftIndex = landmarks[19];
    const rightIndex = landmarks[20];
    const leftThumb = landmarks[21];
    const rightThumb = landmarks[22];

    if (!leftWrist || !rightWrist || !leftIndex || !rightIndex || !leftThumb || !rightThumb) {
      return { gesture: 'none', confidence: 0 };
    }

    // Push to history
    this.history.push({
      leftHand: [leftIndex, leftThumb],
      rightHand: [rightIndex, rightThumb],
      leftWrist: [leftWrist],
      rightWrist: [rightWrist]
    });

    if (this.history.length > this.maxHistoryLen) {
      this.history.shift();
    }

    // Decrement cooldowns
    for (const key in this.gestureCooldowns) {
      const g = key as GestureType;
      if (this.gestureCooldowns[g] > 0) {
        this.gestureCooldowns[g] -= 16.6; // assume approx 60 FPS tick (16.6ms)
      }
    }

    let activeGesture: GestureType = 'none';
    let activeConfidence = 0;

    // Enforce strict high visibility check on joints to ignore out-of-frame limbs (sitting modes)
    const isLeftWristVisible = leftWrist.visibility! > 0.82;
    const isRightWristVisible = rightWrist.visibility! > 0.82;

    // 1. Hands Together (Wrists are close)
    const wristDist = this.distance(leftWrist, rightWrist);
    if (wristDist < 0.12 && isLeftWristVisible && isRightWristVisible) {
      activeGesture = 'hands_together';
      activeConfidence = 0.95;
    }

    // 2. Pinch (Index tip close to thumb tip) - Disabled in Pose to leave only precise hand pinch active
    // We bypass this entirely to prevent false triggers from Pose landmarks!

    // 3. Wave Right Hand (Right wrist X oscillates)
    if (activeGesture === 'none' && isRightWristVisible) {
      const isWavingRight = this.checkWaving(this.history.map(h => h.rightWrist[0]));
      if (isWavingRight) {
        activeGesture = 'wave_right';
        activeConfidence = 0.85;
      }
    }

    // 4. Wave Left Hand (Left wrist X oscillates)
    if (activeGesture === 'none' && isLeftWristVisible) {
      const isWavingLeft = this.checkWaving(this.history.map(h => h.leftWrist[0]));
      if (isWavingLeft) {
        activeGesture = 'wave_left';
        activeConfidence = 0.85;
      }
    }

    // 5. Thumbs Up (Thumb is higher than index/wrist, others closed)
    if (activeGesture === 'none') {
      const isThumbsUpRight = isRightWristVisible && rightThumb.y < rightIndex.y - 0.035;
      const isThumbsUpLeft = isLeftWristVisible && leftThumb.y < leftIndex.y - 0.035;
      if (isThumbsUpRight || isThumbsUpLeft) {
        activeGesture = 'thumbs_up';
        activeConfidence = 0.8;
      }
    }

    // 6. Peace Sign (Index and middle fingers are high above wrist, pinky low)
    if (activeGesture === 'none') {
      const isPeaceRight = isRightWristVisible && rightIndex.y < (landmarks[18]?.y ?? 0.8) - 0.045;
      const isPeaceLeft = isLeftWristVisible && leftIndex.y < (landmarks[17]?.y ?? 0.8) - 0.045;
      if (isPeaceRight || isPeaceLeft) {
        activeGesture = 'peace';
        activeConfidence = 0.8;
      }
    }

    // 7. Open Palm (Hand stable, fingers spread out)
    if (activeGesture === 'none') {
      // Open palm can be approximated when index and pinky are extended wide
      const leftPalmSize = landmarks[17] ? this.distance(leftIndex, landmarks[17]) : 0.08;
      const rightPalmSize = landmarks[18] ? this.distance(rightIndex, landmarks[18]) : 0.08;
      if (leftPalmSize > 0.075 || rightPalmSize > 0.075) {
        activeGesture = 'open_palm';
        activeConfidence = 0.75;
      }
    }

    // Handle gesture confidence accumulation
    const requiredFrames = 6; // sustain for 6 frames (~100ms) to trigger
    
    // Reset other gesture confidences slowly
    for (const key in this.gestureConfidence) {
      const g = key as GestureType;
      if (g === activeGesture) {
        this.gestureConfidence[g] = Math.min(10, this.gestureConfidence[g] + 1);
      } else {
        this.gestureConfidence[g] = Math.max(0, this.gestureConfidence[g] - 1);
      }
    }

    // Check if confidence threshold is reached
    if (activeGesture !== 'none' && this.gestureConfidence[activeGesture] >= requiredFrames) {
      // Check cooldown
      if (this.gestureCooldowns[activeGesture] <= 0) {
        // Cooldown trigger and reset
        this.setCooldown(activeGesture, 1500); // 1.5s default cooldown
        this.resetConfidence();
        return { gesture: activeGesture, confidence: activeConfidence };
      }
    }

    return { gesture: 'none', confidence: 0 };
  }

  private distance(p1: Point3D, p2: Point3D): number {
    if (!p1 || !p2) return 999;
    // Calculate strictly in 2D to eliminate noise from estimated Z (depth) coordinate
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

    // Check for rapid oscillation in the X coordinate
    // Sample last 15 coordinates
    const last15 = validPoints.slice(-15);
    const xCoords = last15.map(p => p.x);
    
    // Calculate mean
    const mean = xCoords.reduce((a, b) => a + b, 0) / xCoords.length;
    // Calculate variance
    const variance = xCoords.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / xCoords.length;
    const stdDev = Math.sqrt(variance);

    // Waving has high variance in X-axis while y-axis remains relatively stable
    const yCoords = last15.map(p => p.y);
    const yMean = yCoords.reduce((a, b) => a + b, 0) / yCoords.length;
    const yVariance = yCoords.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) / yCoords.length;
    const yStdDev = Math.sqrt(yVariance);

    return stdDev > 0.04 && yStdDev < 0.03;
  }
}
