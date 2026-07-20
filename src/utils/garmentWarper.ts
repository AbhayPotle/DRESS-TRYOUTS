import { Garment } from './outfitLibrary';
import { ScanMeasurements } from './aiRecommender';

/**
 * Represents a 3D coordinate point captured from computer vision models (e.g. MediaPipe).
 * Includes x, y coordinates normalized between 0.0 and 1.0, depth coordinate z, and confidence visibility score.
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Programmatically adjusts hex color codes for realistic cloth shade mapping.
 * @param hex Hex color code string.
 * @param percent Positive value to lighten, negative value to darken.
 * @returns Modified hex color code.
 */
function adjustColorBrightness(hex: string, percent: number): string {
  let num = parseInt(hex.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00ff) + amt,
    B = (num & 0x0000ff) + amt;
  
  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));

  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Global helper function to blend colors for realistic iridescent light interference and sparkle halos
function mixColor(hex: string, tint: string, amount: number): string {
  try {
    const r1 = parseInt(hex.slice(1,3), 16) || 0;
    const g1 = parseInt(hex.slice(3,5), 16) || 0;
    const b1 = parseInt(hex.slice(5,7), 16) || 0;
    const r2 = parseInt(tint.slice(1,3), 16) || 0;
    const g2 = parseInt(tint.slice(3,5), 16) || 0;
    const b2 = parseInt(tint.slice(5,7), 16) || 0;
    const r = Math.min(255, Math.max(0, Math.round(r1 * (1 - amount) + r2 * amount)));
    const g = Math.min(255, Math.max(0, Math.round(g1 * (1 - amount) + g2 * amount)));
    const b = Math.min(255, Math.max(0, Math.round(b1 * (1 - amount) + b2 * amount)));
    return "#" + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
  } catch (e) {
    return hex;
  }
}

// Cache generated canvas patterns globally to prevent garbage collection stutters (memory leak mitigation)
const patternCache: Record<string, CanvasPattern> = {};

// Generates live programmatic high-resolution fabric texture patterns (16px tile for finer weave)
function getFabricFill(
  ctx: CanvasRenderingContext2D,
  color: string,
  textureType: string,
  shCenter: number,
  shY: number,
  shWidth: number
): string | CanvasPattern | CanvasGradient {


  // Velvet gradient sheen (rich dark center, glowing high-contrast rim/grazing highlights)
  if (textureType === 'velvet') {
    const timeVal = Date.now() * 0.0015;
    const shiftX = Math.sin(timeVal) * (shWidth * 0.1);
    const grad = ctx.createLinearGradient(
      shCenter - shWidth + shiftX, 
      shY, 
      shCenter + shWidth + shiftX, 
      shY + shWidth * 2.5
    );
    const coreColor = adjustColorBrightness(color, -32); // deep rich core
    const edgeColor = adjustColorBrightness(color, 25);  // glowing pile edge highlight
    grad.addColorStop(0, edgeColor);
    grad.addColorStop(0.2, coreColor);
    grad.addColorStop(0.5, color);
    grad.addColorStop(0.8, coreColor);
    grad.addColorStop(1, edgeColor);
    return grad;
  }

  // Silk/Saree gradient sheen (dynamic - calculated per frame for iridescent pearl luster)
  if (textureType === 'silk' || color === '#800020' || color === '#D63031') {
    const timeVal = Date.now() * 0.0018;
    const shiftX = Math.sin(timeVal) * (shWidth * 0.15);
    const grad = ctx.createLinearGradient(
      shCenter - shWidth + shiftX, 
      shY, 
      shCenter + shWidth + shiftX, 
      shY + shWidth * 2.5
    );
    
    // Choose a subtle iridescent tint glaze (cyan/magenta highlight for dark fabrics, gold/pink for light fabrics)
    const isDark = color === '#0A0A0A' || color === '#800020' || color === '#8B0000' || color === '#004F34' || color === '#1D2A44';
    const tintColor = isDark ? '#00F3FF' : '#FFD700'; 
    const blendAmt = 0.08; 
    
    const baseC = color;
    const darkC = mixColor(adjustColorBrightness(color, -26), isDark ? '#1C002B' : '#7D3CFF', 0.10);
    const brightC = mixColor(adjustColorBrightness(color, 45), tintColor, blendAmt * 2.2);
    
    grad.addColorStop(0, darkC);
    grad.addColorStop(0.2, baseC);
    grad.addColorStop(0.4, brightC); // glossy iridescent highlight
    grad.addColorStop(0.6, baseC);
    grad.addColorStop(0.8, mixColor(adjustColorBrightness(color, -16), '#4B0082', 0.04));
    grad.addColorStop(1, darkC);
    return grad;
  }

  // Retrieve pre-woven texture pattern if cached
  const cacheKey = `${color}_${textureType}`;
  if (patternCache[cacheKey]) {
    return patternCache[cacheKey];
  }

  // Create an offscreen canvas to weave the fabric texture pattern (16px instead of 24px for a finer thread count)
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = 16;
  patternCanvas.height = 16;
  const pCtx = patternCanvas.getContext('2d');
  if (!pCtx) return color;

  // Base fabric color
  pCtx.fillStyle = color;
  pCtx.fillRect(0, 0, 16, 16);

  if (textureType === 'denim') {
    // High-contrast twill denim weave with micro cross-thread slubs
    // 1. Fine background horizontal/vertical weave grid
    pCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    pCtx.fillRect(0, 0, 16, 1);
    pCtx.fillRect(0, 0, 1, 16);
    pCtx.fillRect(0, 8, 16, 1);
    pCtx.fillRect(8, 0, 1, 16);
    
    // 2. Main white diagonal twill threads (warp)
    pCtx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    pCtx.lineWidth = 0.85;
    pCtx.beginPath();
    pCtx.moveTo(0, 0); pCtx.lineTo(16, 16);
    pCtx.moveTo(-8, 0); pCtx.lineTo(8, 16);
    pCtx.moveTo(8, 0); pCtx.lineTo(24, 16);
    pCtx.stroke();
    
    // 3. Dark diagonal gap shadow lines (weft)
    pCtx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
    pCtx.lineWidth = 0.95;
    pCtx.beginPath();
    pCtx.moveTo(0, 2); pCtx.lineTo(14, 16);
    pCtx.moveTo(-8, 2); pCtx.lineTo(6, 16);
    pCtx.moveTo(8, 2); pCtx.lineTo(22, 16);
    pCtx.stroke();
  } else if (textureType === 'knitted') {
    // Interlocking V-knit wool stitch columns (two 8px columns in 16x16 tile)
    pCtx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    pCtx.lineWidth = 1.5;
    pCtx.lineCap = 'round';
    for (let c = 0; c < 2; c++) {
      const dx = c * 8;
      for (let dy = 0; dy < 16; dy += 8) {
        // Draw left leg of the V-stitch
        pCtx.beginPath();
        pCtx.moveTo(dx + 1, dy + 1);
        pCtx.lineTo(dx + 4, dy + 6);
        pCtx.stroke();
        
        // Draw right leg of the V-stitch
        pCtx.beginPath();
        pCtx.moveTo(dx + 7, dy + 1);
        pCtx.lineTo(dx + 4, dy + 6);
        pCtx.stroke();
      }
    }
    // Add soft yarn highlights inside the V stitches to catch ambient highlights
    pCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    pCtx.lineWidth = 1.0;
    for (let c = 0; c < 2; c++) {
      const dx = c * 8;
      for (let dy = 0; dy < 16; dy += 8) {
        pCtx.beginPath();
        pCtx.moveTo(dx + 2, dy + 2);
        pCtx.lineTo(dx + 4, dy + 5);
        pCtx.stroke();
      }
    }
  } else if (textureType === 'leather') {
    // Premium pebbled leather grain with non-uniform cellular grain cells
    pCtx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    pCtx.beginPath();
    pCtx.arc(4, 4, 3, 0, Math.PI * 2);
    pCtx.arc(12, 4, 2.5, 0, Math.PI * 2);
    pCtx.arc(5, 12, 2.8, 0, Math.PI * 2);
    pCtx.arc(12, 12, 3.2, 0, Math.PI * 2);
    pCtx.fill();
    
    // Cell highlights (creates a convex 3D bevel on each pebble grain cell)
    pCtx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    pCtx.beginPath();
    pCtx.arc(3.2, 3.2, 1.2, 0, Math.PI * 2);
    pCtx.arc(11.2, 3.2, 1.0, 0, Math.PI * 2);
    pCtx.arc(4.2, 11.2, 1.1, 0, Math.PI * 2);
    pCtx.arc(11.2, 11.2, 1.3, 0, Math.PI * 2);
    pCtx.fill();
  } else if (textureType === 'brocade') {
    // Ornate gold brocade floral damask zari motif weave
    pCtx.strokeStyle = 'rgba(212, 175, 55, 0.26)';
    pCtx.lineWidth = 0.75;
    
    // Diagonal background grid
    pCtx.beginPath();
    pCtx.moveTo(0, 0); pCtx.lineTo(16, 16);
    pCtx.moveTo(16, 0); pCtx.lineTo(0, 16);
    pCtx.stroke();
    
    // Elaborate Central Star Medallion (Damask floral)
    pCtx.fillStyle = 'rgba(212, 175, 55, 0.58)';
    pCtx.strokeStyle = 'rgba(212, 175, 55, 0.68)';
    pCtx.lineWidth = 0.85;
    
    pCtx.beginPath();
    pCtx.arc(8, 8, 1.8, 0, Math.PI * 2);
    pCtx.fill();
    
    // Four diamond petal rays spreading out (North, South, East, West)
    pCtx.beginPath();
    // North petal
    pCtx.moveTo(8, 8); pCtx.quadraticCurveTo(6, 4, 8, 1); pCtx.quadraticCurveTo(10, 4, 8, 8);
    // South petal
    pCtx.moveTo(8, 8); pCtx.quadraticCurveTo(6, 12, 8, 15); pCtx.quadraticCurveTo(10, 12, 8, 8);
    // East petal
    pCtx.moveTo(8, 8); pCtx.quadraticCurveTo(12, 6, 15, 8); pCtx.quadraticCurveTo(12, 10, 8, 8);
    // West petal
    pCtx.moveTo(8, 8); pCtx.quadraticCurveTo(4, 6, 1, 8); pCtx.quadraticCurveTo(4, 10, 8, 8);
    pCtx.stroke();
  } else {
    // Tactile Plain Cotton Weave (micro threads)
    pCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    pCtx.fillRect(0, 0, 16, 0.75);
    pCtx.fillRect(0, 0, 0.75, 16);
    pCtx.fillStyle = 'rgba(0, 0, 0, 0.10)';
    pCtx.fillRect(0, 8, 16, 0.75);
    pCtx.fillRect(8, 0, 0.75, 16);
  }

  const pattern = ctx.createPattern(patternCanvas, 'repeat');
  if (pattern) {
    patternCache[cacheKey] = pattern;
    return pattern;
  }
  return color;
}

// Renders a realistic soft-blurred 3D fold crease (shadow stroke + highlight stroke)
function draw3DCrease(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  ctrlX: number,
  ctrlY: number,
  endX: number,
  endY: number,
  intensity = 1.0
) {
  ctx.save();
  
  // 1. Crease Shadow (dark) - draw a thick low-opacity shadow and a thinner medium-opacity shadow to emulate a soft blur naturally (GPU-accelerated)
  ctx.strokeStyle = `rgba(0, 0, 0, ${0.06 * intensity})`;
  ctx.lineWidth = 5.0;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
  ctx.stroke();

  ctx.strokeStyle = `rgba(0, 0, 0, ${0.11 * intensity})`;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
  ctx.stroke();

  // 2. Crease Highlight (light, offset slightly to catch highlights)
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 * intensity})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(startX + 1.2, startY - 0.8);
  ctx.quadraticCurveTo(ctrlX + 1.2, ctrlY - 0.8, endX + 1.2, endY - 0.8);
  ctx.stroke();

  ctx.restore();
}

// Draws double stitching details (dashed parallel lines)
function drawStitchingLine(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  ctrlX?: number,
  ctrlY?: number
) {
  ctx.save();
  
  // Faint dark stitch line
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([3, 3]);
  
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  if (ctrlX !== undefined && ctrlY !== undefined) {
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
  } else {
    ctx.lineTo(endX, endY);
  }
  ctx.stroke();

  // Parallel light highlight stitch line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(startX + 1.5, startY + 1.5);
  if (ctrlX !== undefined && ctrlY !== undefined) {
    ctx.quadraticCurveTo(ctrlX + 1.5, ctrlY + 1.5, endX + 1.5, endY + 1.5);
  } else {
    ctx.lineTo(endX + 1.5, endY + 1.5);
  }
  ctx.stroke();

  ctx.restore();
}

export function drawGarments(
  ctx: CanvasRenderingContext2D,
  landmarks: Point3D[],
  items: Garment[],
  measurements: ScanMeasurements,
  width: number,
  height: number
) {
  // Clear canvas overlay first
  ctx.clearRect(0, 0, width, height);

  if (!landmarks || landmarks.length < 25) return;

  ctx.save();
  // Flip the canvas context horizontally to align perfectly with the mirrored webcam stream
  ctx.translate(width, 0);
  ctx.scale(-1, 1);

  // Convert normalized landmarks to canvas pixel coordinates safely
  const points = landmarks.map(lm => {
    if (!lm) return { x: 0, y: 0, z: 0, vis: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: lm.z,
      vis: lm.visibility ?? 0
    };
  });

  // Sort garments order
  const sortedItems = [...items].sort((a, b) => {
    const order = { bottom: 1, full: 2, top: 3, outerwear: 4, shoes: 5, accessory: 6 };
    return (order[a.type] ?? 0) - (order[b.type] ?? 0);
  });

  const hasOuterwear = sortedItems.some(item => item.type === 'outerwear');

  // Render each garment
  sortedItems.forEach(item => {
    ctx.save();
    
    if (item.type === 'top') {
      // If a jacket/outerwear is present, skip rendering the shirt underlay to provide a clean single-garment outline
      if (hasOuterwear) {
        ctx.restore();
        return;
      }
      drawTop(ctx, points, item, measurements);
    } else if (item.type === 'bottom') {
      drawBottom(ctx, points, item, measurements);
    } else if (item.type === 'full') {
      drawFullBody(ctx, points, item, measurements);
    } else if (item.type === 'outerwear') {
      drawOuterwear(ctx, points, item, measurements);
    } else if (item.type === 'shoes') {
      drawShoes(ctx, points, item, measurements);
    } else if (item.type === 'accessory') {
      drawAccessory(ctx, points, item, measurements);
    }

    ctx.restore();
  });

  // Apply hand occlusion post-garment rendering
  eraseHandsForOcclusion(ctx, points);

  ctx.restore();
}

function eraseHandsForOcclusion(ctx: CanvasRenderingContext2D, points: any[]) {
  const leftWrist = points[15];
  const leftPinky = points[17];
  const leftIndex = points[19];
  const leftThumb = points[21];
  
  const rightWrist = points[16];
  const rightPinky = points[18];
  const rightIndex = points[20];
  const rightThumb = points[22];

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  // Draw tight mask matching exact hand shape
  if (leftWrist && leftIndex && leftThumb && leftPinky && leftWrist.vis > 0.3) {
    ctx.beginPath();
    ctx.moveTo(leftWrist.x, leftWrist.y);
    ctx.lineTo(leftThumb.x, leftThumb.y);
    ctx.lineTo(leftIndex.x, leftIndex.y);
    ctx.lineTo(leftPinky.x, leftPinky.y);
    ctx.closePath();
    
    // Draw with thick stroke to cover finger thickness cleanly
    ctx.lineWidth = 30;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.fill();
  }

  if (rightWrist && rightIndex && rightThumb && rightPinky && rightWrist.vis > 0.3) {
    ctx.beginPath();
    ctx.moveTo(rightWrist.x, rightWrist.y);
    ctx.lineTo(rightThumb.x, rightThumb.y);
    ctx.lineTo(rightIndex.x, rightIndex.y);
    ctx.lineTo(rightPinky.x, rightPinky.y);
    ctx.closePath();
    
    ctx.lineWidth = 30;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.fill();
  }

  ctx.restore();
}

function drawTop(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  let lS = { ...p[11] };
  let rS = { ...p[12] };
  const lE = p[13];
  const rE = p[14];

  if (!p[11] || !p[12] || p[11].vis < 0.15 || p[12].vis < 0.15) return;

  // Real-time shoulder width auto-correction using face pupil reference for close-up sitting scans
  const detectedShWidth = distance(lS, rS);
  const eyeDist = (p[2] && p[5] && p[2].vis > 0.4 && p[5].vis > 0.4) ? distance(p[2], p[5]) : 0;
  const isSitting = m.bodyType?.includes('Sitting') || !p[23] || p[23].vis < 0.3;
  const isFaceCutOff = !p[0] || p[0].vis < 0.4 || !p[2] || p[2].vis < 0.4;
  
  let targetShWidth = detectedShWidth;
  if (isSitting && isFaceCutOff) {
    // Extreme close-up: force wide shoulders to cover screen bounds
    const canvasWidth = ctx.canvas?.width || 1280;
    targetShWidth = canvasWidth * 0.86;
  } else if (eyeDist > 0) {
    const expectedShWidth = eyeDist * 5.9; // average shoulder to pupil width ratio
    const collapseRatio = Math.max(0, Math.min(1, (expectedShWidth - detectedShWidth) / (expectedShWidth * 0.3)));
    const blendRatio = 0.4 + 0.6 * collapseRatio; // ranges from 0.4 (low-pass stabilizer) to 1.0 (full correction)
    targetShWidth = detectedShWidth * (1 - blendRatio) + expectedShWidth * blendRatio;
  }

  // Apply smooth shoulder scale
  if (Math.abs(targetShWidth - detectedShWidth) > 1) {
    const shCenter = (lS.x + rS.x) / 2;
    const shCenterY = (lS.y + rS.y) / 2;
    const scale = targetShWidth / detectedShWidth;
    lS.x = shCenter + (lS.x - shCenter) * scale;
    lS.y = shCenterY + (lS.y - shCenterY) * scale;
    rS.x = shCenter + (rS.x - shCenter) * scale;
    rS.y = shCenterY + (rS.y - shCenterY) * scale;
  }

  const config = item.renderConfig;
  
  // Calculate dynamic point-by-point fitting ratios based on scanned measurements
  const isFemale = item.gender === 'woman' || item.gender === 'girl' || item.subcategory.includes('Crop Tops');
  const baseShoulder = isFemale ? 38 : 44;
  const baseWaist = isFemale ? 68 : 82;

  const shoulderScale = m.shoulderWidthCm ? (m.shoulderWidthCm / baseShoulder) : 1.0;
  const estimatedWaist = m.chestCm ? m.chestCm * 0.81 : (m.shoulderWidthCm ? m.shoulderWidthCm * 1.8 : baseWaist);
  const waistScale = (m.waistCm ? m.waistCm : estimatedWaist) / baseWaist;

  const shScale = Math.max(0.74, Math.min(1.65, shoulderScale));
  const wScale = Math.max(0.74, Math.min(1.65, waistScale));

  let lH = p[23];
  let rH = p[24];
  const shWidth = distance(lS, rS);

  const fallbackLH = { x: lS.x - shWidth * 0.08, y: lS.y + shWidth * 1.25 };
  const fallbackRH = { x: rS.x + shWidth * 0.08, y: rS.y + shWidth * 1.25 };
  
  const hipConfidence = (lH && rH) ? Math.min(lH.vis, rH.vis) : 0;
  const isSittingProfile = m.bodyType?.includes('Sitting');
  const blendFactor = isSittingProfile ? 0 : Math.max(0, Math.min(1, (hipConfidence - 0.35) / 0.25)); // 0 if confidence < 0.35, 1 if > 0.6
  
  lH = {
    x: fallbackLH.x * (1 - blendFactor) + (lH ? lH.x : fallbackLH.x) * blendFactor,
    y: fallbackLH.y * (1 - blendFactor) + (lH ? lH.y : fallbackLH.y) * blendFactor,
    vis: 0.9
  };
  rH = {
    x: fallbackRH.x * (1 - blendFactor) + (rH ? rH.x : fallbackRH.x) * blendFactor,
    y: fallbackRH.y * (1 - blendFactor) + (rH ? rH.y : fallbackRH.y) * blendFactor,
    vis: 0.9
  };

  const shoulderMidX = (lS.x + rS.x) / 2;
  const shoulderMidY = (lS.y + rS.y) / 2;
  const hipMidX = (lH.x + rH.x) / 2;
  const hipMidY = (lH.y + rH.y) / 2;

  const shCenter = (lS.x + rS.x) / 2;
  const hpCenter = (lH.x + rH.x) / 2;

  const scaledLS = { x: shCenter + (lS.x - shCenter) * shScale, y: lS.y };
  const scaledRS = { x: shCenter + (rS.x - shCenter) * shScale, y: rS.y };
  const scaledLH = { x: hpCenter + (lH.x - hpCenter) * wScale, y: lH.y };
  const scaledRH = { x: hpCenter + (rH.x - hpCenter) * wScale, y: rH.y };

  const tags = item.styleTags || [];
  const nameLower = item.name.toLowerCase();
  const subcatLower = item.subcategory.toLowerCase();

  const isVNeck = tags.includes('V-Neck') || nameLower.includes('v-neck') || nameLower.includes('polo') || nameLower.includes('henley') || nameLower.includes('mandarin') || subcatLower.includes('polo');
  const isOffShoulder = tags.includes('Off-Shoulder') || nameLower.includes('off-shoulder') || subcatLower.includes('off-shoulder');

  // shWidth is already defined above
  const isSittingMode = isSitting || !p[23] || p[23].vis < 0.3;
  const isExtremeCloseUp = isSittingMode && isFaceCutOff;
  const neckYOffset = shWidth * (isExtremeCloseUp ? 0.32 : isSittingMode ? 0.20 : 0.11); // Shift up higher in portrait mode to sit perfectly on collarbone
  
  // Drop shoulder anchor points lower for off-shoulder styles to expose the collarbone
  const offShoulderOffset = isOffShoulder ? shWidth * 0.12 : 0;
  const raisedLS = { x: scaledLS.x, y: scaledLS.y - neckYOffset + offShoulderOffset };
  const raisedRS = { x: scaledRS.x, y: scaledRS.y - neckYOffset + offShoulderOffset };
  const raisedMidY = (raisedLS.y + raisedRS.y) / 2;
  const neckDipY = isVNeck ? (raisedMidY + shWidth * 0.15) : (raisedMidY + shWidth * 0.05);

  let leftSleeveOuter = { ...raisedLS };
  let leftSleeveInner = { ...raisedLS };
  let rightSleeveOuter = { ...raisedRS };
  let rightSleeveInner = { ...raisedRS };

  const sleeveLen = item.styleTags.includes('Oversized') ? shWidth * 0.28 : shWidth * 0.18;
  const cuffOffset = shWidth * (item.styleTags.includes('Oversized') ? 0.135 : 0.095);

  // Symmetrical fallback coordinates
  const fallbackLeftOuter = { 
    x: raisedLS.x - sleeveLen, 
    y: raisedLS.y + sleeveLen * 0.45 
  };
  const fallbackLeftInner = { 
    x: fallbackLeftOuter.x + shWidth * 0.02, 
    y: fallbackLeftOuter.y + cuffOffset 
  };

  const fallbackRightOuter = { 
    x: raisedRS.x + sleeveLen, 
    y: raisedRS.y + sleeveLen * 0.45 
  };
  const fallbackRightInner = { 
    x: fallbackRightOuter.x - shWidth * 0.02, 
    y: fallbackRightOuter.y + cuffOffset 
  };

  if (lE) {
    const leftElbowConf = Math.max(0, Math.min(1, (lE.vis - 0.25) / 0.3));
    const activeLeftOuter = item.styleTags.includes('Oversized') 
      ? interpolate(raisedLS, lE, 0.65) 
      : interpolate(raisedLS, lE, 0.42);
    
    // Perpendicular down vector
    const dx = lE.x - raisedLS.x;
    const dy = lE.y - raisedLS.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const sign = ny >= 0 ? 1 : -1;
    const activeLeftInner = {
      x: activeLeftOuter.x + nx * cuffOffset * sign,
      y: activeLeftOuter.y + ny * cuffOffset * sign
    };

    leftSleeveOuter = {
      x: activeLeftOuter.x * leftElbowConf + fallbackLeftOuter.x * (1 - leftElbowConf),
      y: activeLeftOuter.y * leftElbowConf + fallbackLeftOuter.y * (1 - leftElbowConf)
    };
    leftSleeveInner = {
      x: activeLeftInner.x * leftElbowConf + fallbackLeftInner.x * (1 - leftElbowConf),
      y: activeLeftInner.y * leftElbowConf + fallbackLeftInner.y * (1 - leftElbowConf)
    };
  } else {
    leftSleeveOuter = fallbackLeftOuter;
    leftSleeveInner = fallbackLeftInner;
  }

  if (rE) {
    const rightElbowConf = Math.max(0, Math.min(1, (rE.vis - 0.25) / 0.3));
    const activeRightOuter = item.styleTags.includes('Oversized') 
      ? interpolate(raisedRS, rE, 0.65) 
      : interpolate(raisedRS, rE, 0.42);
    
    // Perpendicular down vector
    const dx = rE.x - raisedRS.x;
    const dy = rE.y - raisedRS.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    const nx = dy / dist;
    const ny = -dx / dist;
    const sign = ny >= 0 ? 1 : -1;
    const activeRightInner = {
      x: activeRightOuter.x + nx * cuffOffset * sign,
      y: activeRightOuter.y + ny * cuffOffset * sign
    };

    rightSleeveOuter = {
      x: activeRightOuter.x * rightElbowConf + fallbackRightOuter.x * (1 - rightElbowConf),
      y: activeRightOuter.y * rightElbowConf + fallbackRightOuter.y * (1 - rightElbowConf)
    };
    rightSleeveInner = {
      x: activeRightInner.x * rightElbowConf + fallbackRightInner.x * (1 - rightElbowConf),
      y: activeRightInner.y * rightElbowConf + fallbackRightInner.y * (1 - rightElbowConf)
    };
  } else {
    rightSleeveOuter = fallbackRightOuter;
    rightSleeveInner = fallbackRightInner;
  }

  const collarWidth = shWidth * 0.28; // collar width is 28% of shoulder width
  const neckBaseL = { x: shoulderMidX - collarWidth / 2, y: raisedMidY - shWidth * 0.01 };
  const neckBaseR = { x: shoulderMidX + collarWidth / 2, y: raisedMidY - shWidth * 0.01 };

  // 1. Draw inside back collar underlay (shadow representing T-shirt interior back)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(neckBaseR.x, neckBaseR.y);
  ctx.quadraticCurveTo(shoulderMidX, raisedMidY - shWidth * 0.05, neckBaseL.x, neckBaseL.y);
  ctx.quadraticCurveTo(shoulderMidX, raisedMidY + shWidth * 0.01, neckBaseR.x, neckBaseR.y);
  ctx.closePath();
  ctx.fillStyle = adjustColorBrightness(config.baseColor, -35); // Darker inside shadow
  ctx.fill();
  ctx.restore();

  // 2. Draw front body path (cutout around front collar, leaving a neck hole)
  ctx.beginPath();
  ctx.moveTo(neckBaseR.x, neckBaseR.y);
  ctx.lineTo(raisedRS.x, raisedRS.y);
  ctx.lineTo(rightSleeveOuter.x, rightSleeveOuter.y);
  ctx.lineTo(rightSleeveInner.x, rightSleeveInner.y);
  const rUnder = rightUnderarm(scaledRH, raisedRS);
  ctx.lineTo(rUnder.x, rUnder.y);
  ctx.quadraticCurveTo(scaledRH.x - 10, interpolate(raisedRS, scaledRH, 0.6).y, scaledRH.x - 16, scaledRH.y + 6);
  ctx.quadraticCurveTo(hipMidX, hipMidY + 12, scaledLH.x + 16, scaledLH.y + 6);
  const leftUnderarm = { x: raisedLS.x + (scaledLH.x - raisedLS.x) * 0.22, y: raisedLS.y + (scaledLH.y - raisedLS.y) * 0.25 };
  ctx.quadraticCurveTo(scaledLH.x + 10, interpolate(raisedLS, scaledLH, 0.6).y, leftUnderarm.x, leftUnderarm.y);
  ctx.lineTo(leftSleeveInner.x, leftSleeveInner.y);
  ctx.lineTo(leftSleeveOuter.x, leftSleeveOuter.y);
  ctx.lineTo(raisedLS.x, raisedLS.y);
  ctx.lineTo(neckBaseL.x, neckBaseL.y);
  // Curve or straight lines defining the front dip of the neckband
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY);
    ctx.lineTo(neckBaseR.x, neckBaseR.y);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY, neckBaseR.x, neckBaseR.y);
  }
  ctx.closePath();

  // Apply realistic fabric texture pattern + drop shadow to ground the garment
  ctx.save();
  const isGlow = tags.includes('Glow') || tags.includes('Glitter') || tags.includes('Sequin');
  ctx.shadowColor = isGlow ? (config.secondaryColor || 'rgba(212, 175, 55, 0.88)') : 'rgba(0, 0, 0, 0.22)';
  ctx.shadowBlur = isGlow ? 24 : 16;
  ctx.shadowOffsetY = isGlow ? 0 : 8;
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', shoulderMidX, raisedLS.y, distance(raisedLS, raisedRS));
  ctx.fill();
  ctx.restore();

  // 3D Drop-Shadow cast from collar onto chest
  ctx.save();
  ctx.lineWidth = 11.0;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y + 1);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY + 1.5);
    ctx.lineTo(neckBaseR.x, neckBaseR.y + 1);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY + 1.5, neckBaseR.x, neckBaseR.y + 1);
  }
  ctx.stroke();
  ctx.restore();

  // Draw crew neckband collar trim with double-stitching details
  ctx.save();
  ctx.lineWidth = 7.5;
  ctx.strokeStyle = adjustColorBrightness(config.baseColor, -14); // contrast crew neckband
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY);
    ctx.lineTo(neckBaseR.x, neckBaseR.y);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY, neckBaseR.x, neckBaseR.y);
  }
  ctx.stroke();
  
  // Double-stitching line
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y + 1);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY + 1);
    ctx.lineTo(neckBaseR.x, neckBaseR.y + 1);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY + 1, neckBaseR.x, neckBaseR.y + 1);
  }
  ctx.stroke();
  ctx.restore();

  // Apply soft edge ambient outlines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw sleeve armhole seams for realism
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.065)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(raisedLS.x, raisedLS.y);
  ctx.quadraticCurveTo(raisedLS.x - shWidth * 0.05, (raisedLS.y + leftUnderarm.y) / 2, leftUnderarm.x, leftUnderarm.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(raisedRS.x, raisedRS.y);
  ctx.quadraticCurveTo(raisedRS.x + shWidth * 0.05, (raisedRS.y + rUnder.y) / 2, rUnder.x, rUnder.y);
  ctx.stroke();

  // Draw women's bust contour volumetric shading
  if (isFemale) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.055)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(shoulderMidX - shWidth * 0.18, raisedMidY + shWidth * 0.28);
    ctx.quadraticCurveTo(shoulderMidX - shWidth * 0.09, raisedMidY + shWidth * 0.35, shoulderMidX, raisedMidY + shWidth * 0.31);
    ctx.quadraticCurveTo(shoulderMidX + shWidth * 0.09, raisedMidY + shWidth * 0.35, shoulderMidX + shWidth * 0.18, raisedMidY + shWidth * 0.28);
    ctx.stroke();
    
    const bustShadow = ctx.createLinearGradient(shoulderMidX, raisedMidY + shWidth * 0.30, shoulderMidX, raisedMidY + shWidth * 0.44);
    bustShadow.addColorStop(0, 'rgba(0,0,0,0.06)');
    bustShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bustShadow;
    ctx.fillRect(shoulderMidX - shWidth * 0.25, raisedMidY + shWidth * 0.30, shWidth * 0.50, shWidth * 0.14);
    ctx.restore();
  }

  // Draw left/right underarm fabric creases/wrinkles for realism
  ctx.save();
  ctx.lineWidth = 1.8;
  
  // Left Underarm fold
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)'; // crease shadow
  ctx.beginPath();
  ctx.moveTo(leftUnderarm.x + 12, leftUnderarm.y + 12);
  ctx.quadraticCurveTo(shoulderMidX - shWidth * 0.1, (raisedLS.y + scaledLH.y) / 2 + 10, shoulderMidX - shWidth * 0.08, (raisedLS.y + scaledLH.y) / 2 + 35);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.085)'; // crease highlight
  ctx.beginPath();
  ctx.moveTo(leftUnderarm.x + 14, leftUnderarm.y + 10);
  ctx.quadraticCurveTo(shoulderMidX - shWidth * 0.1, (raisedLS.y + scaledLH.y) / 2 + 7, shoulderMidX - shWidth * 0.08, (raisedLS.y + scaledLH.y) / 2 + 32);
  ctx.stroke();

  // Right Underarm fold
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.beginPath();
  ctx.moveTo(rUnder.x - 12, rUnder.y + 12);
  ctx.quadraticCurveTo(shoulderMidX + shWidth * 0.1, (raisedRS.y + scaledRH.y) / 2 + 10, shoulderMidX + shWidth * 0.08, (raisedRS.y + scaledRH.y) / 2 + 35);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.085)';
  ctx.beginPath();
  ctx.moveTo(rUnder.x - 14, rUnder.y + 10);
  ctx.quadraticCurveTo(shoulderMidX + shWidth * 0.1, (raisedRS.y + scaledRH.y) / 2 + 7, shoulderMidX + shWidth * 0.08, (raisedRS.y + scaledRH.y) / 2 + 32);
  ctx.stroke();
  
  ctx.restore();

  // 3. Draw front ribbed collarband overlay
  ctx.save();
  ctx.strokeStyle = adjustColorBrightness(config.baseColor, -12);
  ctx.lineWidth = Math.max(3, shWidth * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY);
    ctx.lineTo(neckBaseR.x, neckBaseR.y);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY, neckBaseR.x, neckBaseR.y);
  }
  ctx.stroke();
  ctx.restore();

  // Draw front collar band contact shadow
  ctx.save();
  const collarShadowGrad = ctx.createLinearGradient(shoulderMidX, raisedMidY + shWidth * 0.05, shoulderMidX, raisedMidY + shWidth * 0.15);
  collarShadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
  collarShadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = collarShadowGrad;
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y + 3);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY + 3);
    ctx.lineTo(neckBaseR.x, neckBaseR.y + 3);
    ctx.lineTo(shoulderMidX, neckDipY + 12);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY + 3, neckBaseR.x, neckBaseR.y + 3);
    ctx.quadraticCurveTo(shoulderMidX, neckDipY + 12, neckBaseL.x, neckBaseL.y + 12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Stitching Details (collars, sleeves, hems)
  if (isVNeck) {
    drawStitchingLine(ctx, neckBaseL.x, neckBaseL.y, neckBaseR.x, neckBaseR.y, shoulderMidX, raisedMidY + shWidth * 0.15 + 2);
  } else {
    drawStitchingLine(ctx, neckBaseL.x, neckBaseL.y, neckBaseR.x, neckBaseR.y, shoulderMidX, raisedMidY + shWidth * 0.05 + 2);
  }
  // Draw thick folded sleeve cuff hems
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = Math.max(5, shWidth * 0.024);
  ctx.lineCap = 'butt';
  
  // Left Sleeve Hem (across cuff opening)
  ctx.beginPath();
  ctx.moveTo(leftSleeveOuter.x, leftSleeveOuter.y);
  ctx.lineTo(leftSleeveInner.x, leftSleeveInner.y);
  ctx.stroke();

  // Right Sleeve Hem (across cuff opening)
  ctx.beginPath();
  ctx.moveTo(rightSleeveOuter.x, rightSleeveOuter.y);
  ctx.lineTo(rightSleeveInner.x, rightSleeveInner.y);
  ctx.stroke();
  ctx.restore();

  // Double stitching line on cuffs (parallel to the hem)
  const leftStitchOuter1 = interpolate(leftSleeveOuter, raisedLS, 0.05);
  const leftStitchInner1 = interpolate(leftSleeveInner, leftUnderarm, 0.05);
  const leftStitchOuter2 = interpolate(leftSleeveOuter, raisedLS, 0.08);
  const leftStitchInner2 = interpolate(leftSleeveInner, leftUnderarm, 0.08);
  
  drawStitchingLine(ctx, leftStitchOuter1.x, leftStitchOuter1.y, leftStitchInner1.x, leftStitchInner1.y);
  drawStitchingLine(ctx, leftStitchOuter2.x, leftStitchOuter2.y, leftStitchInner2.x, leftStitchInner2.y);

  const rightStitchOuter1 = interpolate(rightSleeveOuter, raisedRS, 0.05);
  const rightStitchInner1 = interpolate(rightSleeveInner, rUnder, 0.05);
  const rightStitchOuter2 = interpolate(rightSleeveOuter, raisedRS, 0.08);
  const rightStitchInner2 = interpolate(rightSleeveInner, rUnder, 0.08);

  drawStitchingLine(ctx, rightStitchOuter1.x, rightStitchOuter1.y, rightStitchInner1.x, rightStitchInner1.y);
  drawStitchingLine(ctx, rightStitchOuter2.x, rightStitchOuter2.y, rightStitchInner2.x, rightStitchInner2.y);

  // Double-stitching lines at the bottom hem of the top
  drawStitchingLine(ctx, scaledLH.x + 16, scaledLH.y + 5, scaledRH.x - 16, scaledRH.y + 5, hipMidX, hipMidY + 11);
  drawStitchingLine(ctx, scaledLH.x + 16, scaledLH.y + 8, scaledRH.x - 16, scaledRH.y + 8, hipMidX, hipMidY + 14);

  // Draw luxury gold buttons down center placket for cardigans/jackets/shirts
  const isButtoned = subcatLower.includes('jacket') || subcatLower.includes('coat') || nameLower.includes('blazer') || nameLower.includes('cardigan') || nameLower.includes('shirt') || tags.includes('Formal');
  if (isButtoned) {
    ctx.save();
    const numButtons = 3;
    for (let i = 0; i < numButtons; i++) {
      const ratio = 0.35 + i * 0.22;
      const btnX = shoulderMidX;
      const btnY = raisedMidY + (hipMidY - raisedMidY) * ratio;
      
      // Outer drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.arc(btnX + 1.2, btnY + 1.5, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Shiny gold button with 3D radial highlights
      const btnGrad = ctx.createRadialGradient(btnX - 1.5, btnY - 1.5, 0.5, btnX, btnY, 4.5);
      btnGrad.addColorStop(0, '#FFFFFF'); // Hot spot
      btnGrad.addColorStop(0.3, '#E5A93B'); // Midtone gold
      btnGrad.addColorStop(0.9, '#8C5B00'); // Shadow gold
      btnGrad.addColorStop(1, '#533700'); // Deep rim shadow
      
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.arc(btnX, btnY, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // Subtle metallic highlight ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(btnX, btnY, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Secondary details
  if (config.texture === 'stripes') {
    drawStripes(ctx, raisedLS, raisedRS, scaledLH, scaledRH, config.secondaryColor || '#FFFFFF');
  } else if (config.texture === 'plaid') {
    drawPlaid(ctx, raisedLS, raisedRS, scaledLH, scaledRH, config.baseColor, config.secondaryColor || '#000000');
  } else if (config.texture === 'artistic') {
    drawArtisticPatterns(ctx, raisedLS, raisedRS, scaledLH, scaledRH, config.secondaryColor || '#EC4899');
  } else if (config.texture === 'sequins') {
    drawSequinSparkles(ctx, raisedLS, raisedRS, scaledLH, scaledRH, scaledLH.y + 6, config.baseColor);
  }

  // Draw luxury gold embroidery borders along collar if tagged
  const isLuxury = tags.includes('Luxury') || tags.includes('Brocade') || tags.includes('Runway') || config.secondaryColor === '#D4AF37';
  if (isLuxury) {
    ctx.save();
    const goldGrad = ctx.createLinearGradient(raisedLS.x, raisedLS.y, raisedRS.x, raisedRS.y);
    goldGrad.addColorStop(0, '#D4AF37');
    goldGrad.addColorStop(0.25, '#FFDF00');
    goldGrad.addColorStop(0.5, '#B8860B');
    goldGrad.addColorStop(0.75, '#FFDF00');
    goldGrad.addColorStop(1, '#D4AF37');
    
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(212, 175, 55, 0.45)';
    ctx.shadowBlur = 6;
    
    ctx.beginPath();
    ctx.moveTo(neckBaseL.x, neckBaseL.y);
    if (isVNeck) {
      ctx.lineTo(shoulderMidX, neckDipY);
      ctx.lineTo(neckBaseR.x, neckBaseR.y);
    } else {
      ctx.quadraticCurveTo(shoulderMidX, neckDipY, neckBaseR.x, neckBaseR.y);
    }
    ctx.stroke();

    // Gold embroidery along the bottom hem of the shirt
    ctx.beginPath();
    ctx.moveTo(scaledLH.x + 16, scaledLH.y + 6);
    ctx.quadraticCurveTo(hipMidX, hipMidY + 12, scaledRH.x - 16, scaledRH.y + 6);
    ctx.stroke();

    ctx.restore();
  }

  // Realistic Specular Shading overlay
  drawTopShading(ctx, raisedLS, raisedRS, scaledLH, scaledRH);

  // Creases & Shadows (Creases add realistic wrinkles)
  drawTopCreases(ctx, raisedLS, raisedRS, scaledLH, scaledRH, leftUnderarm, rUnder);

  if (config.logoText) {
    ctx.save();
    // Translate to center of chest, then scale horizontally by -1 to counter-mirror logo letters so they read straight
    ctx.translate(shoulderMidX, shoulderMidY + (scaledLH.y - scaledLS.y) * 0.3);
    ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '800 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.logoText, 0, 0);
    ctx.restore();
  }
}

function drawTopShading(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop'; // Restrict all specular highlights and shadows strictly within the garment bounds!
  
  const shMidX = (lS.x + rS.x) / 2;
  const shMidY = (lS.y + rS.y) / 2;
  const bodyW = distance(lS, rS);

  // 1. Soft integration shadow under chin/neck area
  const gradNeck = ctx.createRadialGradient(shMidX, shMidY, 5, shMidX, shMidY, bodyW * 0.22);
  gradNeck.addColorStop(0, 'rgba(0, 0, 0, 0.32)');
  gradNeck.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradNeck;
  ctx.beginPath();
  ctx.moveTo(rS.x, rS.y);
  ctx.quadraticCurveTo(shMidX, shMidY + 20, lS.x, lS.y);
  ctx.lineTo(lS.x, lS.y + bodyW * 0.25);
  ctx.lineTo(rS.x, rS.y + bodyW * 0.25);
  ctx.closePath();
  ctx.fill();

  // 2. Specular lighting reflections on shoulders (overhead store lighting)
  const leftShoulderGrad = ctx.createRadialGradient(lS.x, lS.y + 10, 5, lS.x, lS.y + 10, bodyW * 0.35);
  leftShoulderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  leftShoulderGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = leftShoulderGrad;
  ctx.beginPath();
  ctx.arc(lS.x, lS.y + 10, bodyW * 0.35, 0, Math.PI * 2);
  ctx.fill();

  const rightShoulderGrad = ctx.createRadialGradient(rS.x, rS.y + 10, 5, rS.x, rS.y + 10, bodyW * 0.35);
  rightShoulderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  rightShoulderGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = rightShoulderGrad;
  ctx.beginPath();
  ctx.arc(rS.x, rS.y + 10, bodyW * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 3. Side ambient occlusion shadowing along left/right torso edges for 3D depth
  const leftOcclusion = ctx.createLinearGradient(lS.x, shMidY, lS.x + bodyW * 0.18, shMidY);
  leftOcclusion.addColorStop(0, 'rgba(0,0,0,0.22)');
  leftOcclusion.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = leftOcclusion;
  ctx.fillRect(lS.x - 20, shMidY - 30, bodyW * 0.22, (lH.y - shMidY) + 100);

  const rightOcclusion = ctx.createLinearGradient(rS.x, shMidY, rS.x - bodyW * 0.18, shMidY);
  rightOcclusion.addColorStop(0, 'rgba(0,0,0,0.22)');
  rightOcclusion.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rightOcclusion;
  ctx.fillRect(rS.x + 20, shMidY - 30, -bodyW * 0.22, (lH.y - shMidY) + 100);

  // 4. Dynamic diagonal sheen sweep (shimmers on movement)
  const timeVal = Date.now() * 0.0012;
  const sweepX = shMidX + Math.sin(timeVal) * (bodyW * 0.35);
  const sweepGrad = ctx.createLinearGradient(sweepX - 45, shMidY, sweepX + 45, shMidY);
  sweepGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sweepGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.11)'); // center sheen line
  sweepGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sweepGrad;
  
  ctx.save();
  ctx.translate(shMidX, shMidY);
  ctx.rotate(0.22); // slight diagonal tilt
  ctx.fillRect(-bodyW, -bodyW, bodyW * 2, bodyW * 2);
  ctx.restore();
  
  ctx.restore();
}

function drawSkirtShading(ctx: CanvasRenderingContext2D, lH: any, rH: any, bottomY: number, isLehenga: boolean) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop'; // Clean clipping to the skirt borders!

  const hpCenter = (lH.x + rH.x) / 2;
  const hpWidth = Math.abs(rH.x - lH.x);
  
  // 1. Specular highlight down the center crest of the skirt (3D cylindrical volume)
  const gradHighlight = ctx.createLinearGradient(lH.x - hpWidth * 0.5, lH.y, rH.x + hpWidth * 0.5, lH.y);
  gradHighlight.addColorStop(0, 'rgba(0, 0, 0, 0.12)'); // left edge shadow
  gradHighlight.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
  gradHighlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)'); // center bulge highlight
  gradHighlight.addColorStop(0.65, 'rgba(0, 0, 0, 0)');
  gradHighlight.addColorStop(1, 'rgba(0, 0, 0, 0.12)'); // right edge shadow
  
  ctx.fillStyle = gradHighlight;
  ctx.fillRect(lH.x - hpWidth * 1.5, lH.y - 10, hpWidth * 4.0, bottomY - lH.y + 40);

  // 2. Hem shadow (soft darkening at the bottom hem representing contact shadows near floor)
  const gradHem = ctx.createLinearGradient(hpCenter, lH.y, hpCenter, bottomY);
  gradHem.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradHem.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
  gradHem.addColorStop(1, 'rgba(0, 0, 0, 0.25)'); // soft dark bottom hem shadow
  
  ctx.fillStyle = gradHem;
  ctx.fillRect(lH.x - hpWidth * 1.5, lH.y - 10, hpWidth * 4.0, bottomY - lH.y + 40);

  // 3. Draw vertical pleat crease folds cascading down
  const numPleats = isLehenga ? 8 : 5;
  for (let i = 1; i < numPleats; i++) {
    const ratio = i / numPleats;
    
    // Start along the waistline
    const startX = lH.x + (rH.x - lH.x) * ratio;
    const startY = lH.y + 4;
    
    // Flare outward towards the hem bottom
    const bottomWidth = hpWidth * (isLehenga ? 1.96 : 1.4);
    const bottomStart = hpCenter - bottomWidth / 2;
    const endX = bottomStart + bottomWidth * ratio;
    const endY = bottomY - 4;
    
    // Wave controls for natural curve folds
    const ctrlX = (startX + endX) / 2 + Math.sin(ratio * Math.PI) * 12;
    const ctrlY = (startY + endY) / 2;
    
    // Light-direction casting shadow (creates deep 3D pleated volume folding)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.09)';
    ctx.lineWidth = 14.0;
    ctx.beginPath();
    ctx.moveTo(startX + 2.5, startY);
    ctx.quadraticCurveTo(ctrlX + 5, ctrlY, endX + 7, endY);
    ctx.stroke();
    ctx.restore();

    draw3DCrease(ctx, startX, startY, ctrlX, ctrlY, endX, endY, 0.75);
  }

  ctx.restore();
}

function drawBottom(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  let lH = p[23];
  let rH = p[24];

  if (!lH || !rH || lH.vis < 0.15 || rH.vis < 0.15) return;

  const config = item.renderConfig;
  const isShorts = item.subcategory.includes('Skirts') || item.subcategory.includes('Mini') || item.subcategory.includes('Shorts');

  // Calculate dynamic fit hips scale
  const isFemale = item.gender === 'woman' || item.gender === 'girl' || item.subcategory.includes('Skirts');
  const baseHip = isFemale ? 94 : 96;
  const estimatedHip = m.chestCm ? m.chestCm * 1.08 : (m.shoulderWidthCm ? m.shoulderWidthCm * 2.3 : baseHip);
  const hipScale = (m.hipCm ? m.hipCm : estimatedHip) / baseHip;
  const hScale = Math.max(0.74, Math.min(1.65, hipScale));

  const hipWidth = distance(lH, rH);
  
  let lK = p[25];
  let rK = p[26];
  let lA = p[27];
  let rA = p[28];

  if (!lK || lK.vis < 0.5) lK = { x: lH.x, y: lH.y + hipWidth * 1.35, vis: 0.9 };
  if (!rK || rK.vis < 0.5) rK = { x: rH.x, y: rH.y + hipWidth * 1.35, vis: 0.9 };
  if (!lA || lA.vis < 0.5) lA = { x: lK.x, y: lK.y + hipWidth * 1.45, vis: 0.9 };
  if (!rA || rA.vis < 0.5) rA = { x: rK.x, y: rK.y + hipWidth * 1.45, vis: 0.9 };

  const hpCenter = (lH.x + rH.x) / 2;
  const scaledLH = { x: hpCenter + (lH.x - hpCenter) * hScale, y: lH.y };
  const scaledRH = { x: hpCenter + (rH.x - hpCenter) * hScale, y: rH.y };
  
  const kneeCenter = (lK.x + rK.x) / 2;
  const scaledLK = { x: kneeCenter + (lK.x - kneeCenter) * hScale * 0.95, y: lK.y };
  const scaledRK = { x: kneeCenter + (rK.x - kneeCenter) * hScale * 0.95, y: rK.y };

  const ankleCenter = (lA.x + rA.x) / 2;
  const scaledLA = { x: ankleCenter + (lA.x - ankleCenter) * hScale * 0.9, y: lA.y };
  const scaledRA = { x: ankleCenter + (rA.x - ankleCenter) * hScale * 0.9, y: rA.y };

  ctx.beginPath();
  ctx.moveTo(scaledRH.x + 6, scaledRH.y - 15);
  ctx.lineTo(scaledLH.x - 6, scaledLH.y - 15);

  if (isShorts) {
    const leftThighEnd = interpolate(scaledLH, scaledLK, 0.4);
    const rightThighEnd = interpolate(scaledRH, scaledRK, 0.4);
    const crotch = interpolate(scaledLH, scaledRH, 0.5);
    crotch.y += 16;

    ctx.lineTo(scaledLH.x - 10, scaledLH.y + 10);
    ctx.lineTo(leftThighEnd.x - 6, leftThighEnd.y);
    ctx.lineTo(crotch.x - 6, crotch.y);
    ctx.lineTo(rightThighEnd.x + 6, rightThighEnd.y);
    ctx.lineTo(scaledRH.x + 10, scaledRH.y + 10);
  } else {
    ctx.quadraticCurveTo(scaledLH.x - 14, scaledLK.y, scaledLA.x - 10, scaledLA.y);
    ctx.lineTo(scaledLA.x + 10, scaledLA.y);
    const crotch = { x: (scaledLH.x + scaledRH.x) / 2, y: (scaledLH.y + scaledRH.y) / 2 + (scaledLA.y - scaledLH.y) * 0.22 };
    ctx.quadraticCurveTo(scaledLK.x + 8, scaledLK.y, crotch.x, crotch.y);
    ctx.quadraticCurveTo(scaledRK.x - 8, scaledRK.y, scaledRA.x - 10, scaledRA.y);
    ctx.lineTo(scaledRA.x + 10, scaledRA.y);
    ctx.quadraticCurveTo(scaledRH.x + 14, scaledRK.y, scaledRH.x + 6, scaledRH.y - 15);
  }

  ctx.closePath();

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.20)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', hpCenter, scaledLH.y, hipWidth);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Stitch bottom hems of trousers (double-stitching detail)
  if (!isShorts) {
    drawStitchingLine(ctx, scaledLA.x - 10, scaledLA.y - 3, scaledLA.x + 10, scaledLA.y - 3);
    drawStitchingLine(ctx, scaledLA.x - 10, scaledLA.y - 6, scaledLA.x + 10, scaledLA.y - 6);
    
    drawStitchingLine(ctx, scaledRA.x - 10, scaledRA.y - 3, scaledRA.x + 10, scaledRA.y - 3);
    drawStitchingLine(ctx, scaledRA.x - 10, scaledRA.y - 6, scaledRA.x + 10, scaledRA.y - 6);
  }

  // Denim shading/highlights
  if (config.texture === 'denim') {
    drawDenimDetails(ctx, scaledLH, scaledRH, scaledLK, scaledRK, scaledLA, scaledRA, isShorts);
  } else {
    drawPantsShading(ctx, scaledLH, scaledRH, scaledLK, scaledRK, scaledLA, scaledRA, isShorts);
  }
}

function drawFullBody(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  let lS = { ...p[11] };
  let rS = { ...p[12] };

  if (!p[11] || !p[12] || p[11].vis < 0.15 || p[12].vis < 0.15) return;

  const config = item.renderConfig;
  const isSaree = item.subcategory.includes('Sarees');
  const isLehenga = item.subcategory.includes('Lehengas');

  if (isSaree) {
    drawSaree(ctx, p, config);
    return;
  }

  // Real-time shoulder width auto-correction using face pupil reference for close-up sitting scans
  const detectedShWidth = distance(lS, rS);
  const eyeDist = (p[2] && p[5] && p[2].vis > 0.4 && p[5].vis > 0.4) ? distance(p[2], p[5]) : 0;
  const isSitting = m.bodyType?.includes('Sitting') || !p[23] || p[23].vis < 0.3;
  const isFaceCutOff = !p[0] || p[0].vis < 0.4 || !p[2] || p[2].vis < 0.4;
  
  let targetShWidth = detectedShWidth;
  if (isSitting && isFaceCutOff) {
    // Extreme close-up: force wide shoulders to cover screen bounds
    const canvasWidth = ctx.canvas?.width || 1280;
    targetShWidth = canvasWidth * 0.86;
  } else if (eyeDist > 0) {
    const expectedShWidth = eyeDist * 5.9; // average shoulder to pupil width ratio
    const collapseRatio = Math.max(0, Math.min(1, (expectedShWidth - detectedShWidth) / (expectedShWidth * 0.3)));
    const blendRatio = 0.4 + 0.6 * collapseRatio; // ranges from 0.4 (low-pass stabilizer) to 1.0 (full correction)
    targetShWidth = detectedShWidth * (1 - blendRatio) + expectedShWidth * blendRatio;
  }

  // Apply smooth shoulder scale
  if (Math.abs(targetShWidth - detectedShWidth) > 1) {
    const shCenter = (lS.x + rS.x) / 2;
    const shCenterY = (lS.y + rS.y) / 2;
    const scale = targetShWidth / detectedShWidth;
    lS.x = shCenter + (lS.x - shCenter) * scale;
    lS.y = shCenterY + (lS.y - shCenterY) * scale;
    rS.x = shCenter + (rS.x - shCenter) * scale;
    rS.y = shCenterY + (rS.y - shCenterY) * scale;
  }

  // Calculate dynamic point-by-point fitting ratios based on scanned measurements
  const isFemale = item.gender === 'woman' || item.gender === 'girl' || isLehenga;
  const baseShoulder = isFemale ? 38 : 44;
  const baseHip = isFemale ? 94 : 96;

  const shoulderScale = m.shoulderWidthCm ? (m.shoulderWidthCm / baseShoulder) : 1.0;
  const estimatedHip = m.chestCm ? m.chestCm * 1.08 : (m.shoulderWidthCm ? m.shoulderWidthCm * 2.3 : baseHip);
  const hipScale = (m.hipCm ? m.hipCm : estimatedHip) / baseHip;

  const shScale = Math.max(0.74, Math.min(1.65, shoulderScale));
  const hScale = Math.max(0.74, Math.min(1.65, hipScale));

  const shWidth = distance(lS, rS);

  let lH = p[23];
  let rH = p[24];
  let lK = p[25];
  let rK = p[26];
  let lA = p[27];
  let rA = p[28];

  const fallbackLH = { x: lS.x - shWidth * 0.1, y: lS.y + shWidth * 1.25 };
  const fallbackRH = { x: rS.x + shWidth * 0.1, y: rS.y + shWidth * 1.25 };
  
  const hipConfidence = (lH && rH) ? Math.min(lH.vis, rH.vis) : 0;
  const isSittingProfile = m.bodyType?.includes('Sitting');
  const blendFactor = isSittingProfile ? 0 : Math.max(0, Math.min(1, (hipConfidence - 0.35) / 0.25)); // 0 if confidence < 0.35, 1 if > 0.6
  
  lH = {
    x: fallbackLH.x * (1 - blendFactor) + (lH ? lH.x : fallbackLH.x) * blendFactor,
    y: fallbackLH.y * (1 - blendFactor) + (lH ? lH.y : fallbackLH.y) * blendFactor,
    vis: 0.9
  };
  rH = {
    x: fallbackRH.x * (1 - blendFactor) + (rH ? rH.x : fallbackRH.x) * blendFactor,
    y: fallbackRH.y * (1 - blendFactor) + (rH ? rH.y : fallbackRH.y) * blendFactor,
    vis: 0.9
  };

  if (!lK || lK.vis < 0.5) lK = { x: lH.x, y: lH.y + shWidth * 1.2, vis: 0.9 };
  if (!rK || rK.vis < 0.5) rK = { x: rH.x, y: rH.y + shWidth * 1.2, vis: 0.9 };
  if (!lA || lA.vis < 0.5) lA = { x: lK.x, y: lK.y + shWidth * 1.3, vis: 0.9 };
  if (!rA || rA.vis < 0.5) rA = { x: rK.x, y: rK.y + shWidth * 1.3, vis: 0.9 };

  const shCenter = (lS.x + rS.x) / 2;
  const hpCenter = (lH.x + rH.x) / 2;
  
  const scaledLS = { x: shCenter + (lS.x - shCenter) * shScale, y: lS.y };
  const scaledRS = { x: shCenter + (rS.x - shCenter) * shScale, y: rS.y };
  const scaledLH = { x: hpCenter + (lH.x - hpCenter) * hScale, y: lH.y };
  const scaledRH = { x: hpCenter + (rH.x - hpCenter) * hScale, y: rH.y };

  const tags = item.styleTags || [];
  const nameLower = item.name.toLowerCase();
  const subcatLower = item.subcategory.toLowerCase();

  const isMini = tags.includes('Mini') || tags.includes('Cocktail') || nameLower.includes('mini') || subcatLower.includes('mini');
  const isBodycon = tags.includes('Bodycon') || nameLower.includes('bodycon') || subcatLower.includes('bodycon');
  const isVNeck = tags.includes('V-Neck') || nameLower.includes('v-neck') || nameLower.includes('wrap') || nameLower.includes('plunging');
  const isOffShoulder = tags.includes('Off-Shoulder') || nameLower.includes('off-shoulder');

  const isSittingMode = isSitting || !p[23] || p[23].vis < 0.3;
  const isExtremeCloseUp = isSittingMode && isFaceCutOff;
  const neckYOffset = shWidth * (isExtremeCloseUp ? 0.32 : isSittingMode ? 0.20 : 0.11); // Shift up higher in portrait mode to sit perfectly on collarbone
  
  // Drop shoulder anchor points lower for off-shoulder styles to expose the collarbone
  const offShoulderOffset = isOffShoulder ? shWidth * 0.12 : 0;
  const raisedLS = { x: scaledLS.x, y: scaledLS.y - neckYOffset + offShoulderOffset };
  const raisedRS = { x: scaledRS.x, y: scaledRS.y - neckYOffset + offShoulderOffset };
  const raisedMidY = (raisedLS.y + raisedRS.y) / 2;
  const neckDipY = isVNeck ? (raisedMidY + shWidth * 0.15) : (raisedMidY + shWidth * 0.04);

  const shoulderMidX = (raisedLS.x + raisedRS.x) / 2;
  const collarWidth = shWidth * 0.28;
  const neckBaseL = { x: shoulderMidX - collarWidth / 2, y: raisedMidY - shWidth * 0.01 };
  const neckBaseR = { x: shoulderMidX + collarWidth / 2, y: raisedMidY - shWidth * 0.01 };

  // Calculate dynamic waist parameters for custom fitting
  const baseWaist = isFemale ? 68 : 84;
  const waistScale = m.waistCm ? (m.waistCm / baseWaist) : 1.0;
  const wScale = Math.max(0.74, Math.min(1.65, waistScale));

  const torsoHeight = scaledLH.y - raisedMidY;
  const waistY = raisedMidY + torsoHeight * 0.52;
  const waistWidth = shWidth * (isBodycon ? 0.35 : 0.40) * wScale;
  const leftWaist = { x: shoulderMidX - waistWidth, y: waistY };
  const rightWaist = { x: shoulderMidX + waistWidth, y: waistY };

  // Check if dress has sleeves
  const hasSleeves = subcatLower.includes('wrap') || nameLower.includes('wrap') || nameLower.includes('maxi') || tags.includes('Long Sleeve') || tags.includes('Short Sleeve') || subcatLower.includes('lehenga') || subcatLower.includes('saree');

  let leftSleeveOuter = { ...raisedLS };
  let leftSleeveInner = { ...raisedLS };
  let rightSleeveOuter = { ...raisedRS };
  let rightSleeveInner = { ...raisedRS };

  const sleeveLen = tags.includes('Short Sleeve') ? shWidth * 0.14 : shWidth * 0.22;
  const cuffOffset = shWidth * (tags.includes('Short Sleeve') ? 0.08 : 0.115);

  const fallbackLeftOuter = { 
    x: raisedLS.x - sleeveLen, 
    y: raisedLS.y + sleeveLen * 0.45 
  };
  const fallbackLeftInner = { 
    x: fallbackLeftOuter.x + shWidth * 0.02, 
    y: fallbackLeftOuter.y + cuffOffset 
  };

  const fallbackRightOuter = { 
    x: raisedRS.x + sleeveLen, 
    y: raisedRS.y + sleeveLen * 0.45 
  };
  const fallbackRightInner = { 
    x: fallbackRightOuter.x - shWidth * 0.02, 
    y: fallbackRightOuter.y + cuffOffset 
  };

  const lE = p[13];
  const rE = p[14];

  if (hasSleeves) {
    if (lE) {
      const leftElbowConf = Math.max(0, Math.min(1, (lE.vis - 0.25) / 0.3));
      const activeLeftOuter = interpolate(raisedLS, lE, 0.45);
      
      const dx = lE.x - raisedLS.x;
      const dy = lE.y - raisedLS.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;
      const sign = ny >= 0 ? 1 : -1;
      const activeLeftInner = {
        x: activeLeftOuter.x + nx * cuffOffset * sign,
        y: activeLeftOuter.y + ny * cuffOffset * sign
      };

      leftSleeveOuter = {
        x: activeLeftOuter.x * leftElbowConf + fallbackLeftOuter.x * (1 - leftElbowConf),
        y: activeLeftOuter.y * leftElbowConf + fallbackLeftOuter.y * (1 - leftElbowConf)
      };
      leftSleeveInner = {
        x: activeLeftInner.x * leftElbowConf + fallbackLeftInner.x * (1 - leftElbowConf),
        y: activeLeftInner.y * leftElbowConf + fallbackLeftInner.y * (1 - leftElbowConf)
      };
    } else {
      leftSleeveOuter = fallbackLeftOuter;
      leftSleeveInner = fallbackLeftInner;
    }

    if (rE) {
      const rightElbowConf = Math.max(0, Math.min(1, (rE.vis - 0.25) / 0.3));
      const activeRightOuter = interpolate(raisedRS, rE, 0.45);
      
      const dx = rE.x - raisedRS.x;
      const dy = rE.y - raisedRS.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const nx = dy / dist;
      const ny = -dx / dist;
      const sign = ny >= 0 ? 1 : -1;
      const activeRightInner = {
        x: activeRightOuter.x + nx * cuffOffset * sign,
        y: activeRightOuter.y + ny * cuffOffset * sign
      };

      rightSleeveOuter = {
        x: activeRightOuter.x * rightElbowConf + fallbackRightOuter.x * (1 - rightElbowConf),
        y: activeRightOuter.y * rightElbowConf + fallbackRightOuter.y * (1 - rightElbowConf)
      };
      rightSleeveInner = {
        x: activeRightInner.x * rightElbowConf + fallbackRightInner.x * (1 - rightElbowConf),
        y: activeRightInner.y * rightElbowConf + fallbackRightInner.y * (1 - rightElbowConf)
      };
    } else {
      rightSleeveOuter = fallbackRightOuter;
      rightSleeveInner = fallbackRightInner;
    }
  }

  // 1. Draw inside back collar underlay (shadow representing interior back)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(neckBaseR.x, neckBaseR.y);
  ctx.quadraticCurveTo(shoulderMidX, raisedMidY - shWidth * 0.04, neckBaseL.x, neckBaseL.y);
  ctx.quadraticCurveTo(shoulderMidX, raisedMidY + shWidth * 0.01, neckBaseR.x, neckBaseR.y);
  ctx.closePath();
  ctx.fillStyle = adjustColorBrightness(config.baseColor, -35); // Darker inside shadow
  ctx.fill();
  ctx.restore();

  // 2. Draw front body path (cutout around front collar, leaving a neck hole)
  ctx.beginPath();
  ctx.moveTo(neckBaseR.x, neckBaseR.y);
  ctx.lineTo(raisedRS.x, raisedRS.y);
  
  if (hasSleeves) {
    ctx.lineTo(rightSleeveOuter.x, rightSleeveOuter.y);
    ctx.lineTo(rightSleeveInner.x, rightSleeveInner.y);
    const rUnder = rightUnderarm(scaledRH, raisedRS);
    ctx.lineTo(rUnder.x, rUnder.y);
    ctx.quadraticCurveTo(rUnder.x + 4, (rUnder.y + rightWaist.y) / 2, rightWaist.x, rightWaist.y);
    ctx.quadraticCurveTo(rightWaist.x + 4, (rightWaist.y + scaledRH.y) / 2, scaledRH.x + 6, scaledRH.y);
  } else {
    ctx.quadraticCurveTo(raisedRS.x + 4, (raisedRS.y + rightWaist.y) / 2, rightWaist.x, rightWaist.y);
    ctx.quadraticCurveTo(rightWaist.x + 4, (rightWaist.y + scaledRH.y) / 2, scaledRH.x + 6, scaledRH.y);
  }

  // Set dress length based on mini vs maxi cuts
  const ankleConfidence = lA ? lA.vis : 0;
  const standLength = ankleConfidence > 0.45 ? lA.y : lK.y + shWidth * 1.2;
  const sitLength = lH.y + shWidth * 0.65;
  const sitBlend = isSittingProfile ? 1 : Math.max(0, Math.min(1, (0.6 - hipConfidence) / 0.3)); // fully sit length if hips not visible
  
  let bottomY = standLength * (1 - sitBlend) + sitLength * sitBlend;
  if (isMini) {
    bottomY = lK.y + shWidth * 0.15; // end just below knee for cocktail length
  }

  // Adjust flared skirts vs pencil bodycon skirts
  let flareAmount = shWidth * 0.2; // standard A-line
  if (isLehenga) {
    flareAmount = shWidth * 0.48; // traditional lehenga wide flare
  } else if (isBodycon) {
    flareAmount = shWidth * 0.03; // sleek pencil bodycon fit
  } else if (tags.includes('Maxi') || subcatLower.includes('maxi')) {
    flareAmount = shWidth * 0.35; // maxi flared skirt
  }

  const leftFlareX = scaledLH.x - flareAmount;
  const rightFlareX = scaledRH.x + flareAmount;

  ctx.quadraticCurveTo(rightFlareX + 12, (scaledRH.y + bottomY) / 2, rightFlareX, bottomY);
  ctx.quadraticCurveTo((leftFlareX + rightFlareX) / 2, bottomY + 22, leftFlareX, bottomY);
  ctx.quadraticCurveTo(leftFlareX - 12, (scaledLH.y + bottomY) / 2, leftFlareX, bottomY);

  if (hasSleeves) {
    const leftUnderarm = { x: raisedLS.x + (scaledLH.x - raisedLS.x) * 0.22, y: raisedLS.y + (scaledLH.y - raisedLS.y) * 0.25 };
    ctx.quadraticCurveTo(scaledLH.x + 4, (leftWaist.y + scaledLH.y) / 2, leftWaist.x, leftWaist.y);
    ctx.quadraticCurveTo(leftUnderarm.x - 4, (leftUnderarm.y + leftWaist.y) / 2, leftUnderarm.x, leftUnderarm.y);
    ctx.lineTo(leftSleeveInner.x, leftSleeveInner.y);
    ctx.lineTo(leftSleeveOuter.x, leftSleeveOuter.y);
    ctx.lineTo(raisedLS.x, raisedLS.y);
  } else {
    ctx.quadraticCurveTo(leftWaist.x - 4, (leftWaist.y + scaledLH.y) / 2, leftWaist.x, leftWaist.y);
    ctx.quadraticCurveTo(raisedLS.x - 4, (raisedLS.y + leftWaist.y) / 2, raisedLS.x, raisedLS.y);
  }

  ctx.lineTo(neckBaseL.x, neckBaseL.y);
  
  // Curve defining the front dip of the neckband
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY);
    ctx.lineTo(neckBaseR.x, neckBaseR.y);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY, neckBaseR.x, neckBaseR.y);
  }
  ctx.closePath();

  // Apply realistic fabric texture pattern + drop shadow to ground the garment
  ctx.save();
  const isGlow = tags.includes('Glow') || tags.includes('Glitter') || tags.includes('Sequin');
  ctx.shadowColor = isGlow ? (config.secondaryColor || 'rgba(212, 175, 55, 0.88)') : 'rgba(0, 0, 0, 0.22)';
  ctx.shadowBlur = isGlow ? 24 : 16;
  ctx.shadowOffsetY = isGlow ? 0 : 8;
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', shoulderMidX, raisedLS.y, shWidth);
  ctx.fill();
  ctx.restore();

  // 3D Drop-Shadow cast from collar onto chest
  ctx.save();
  ctx.lineWidth = 11.0;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y + 1);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY + 1.5);
    ctx.lineTo(neckBaseR.x, neckBaseR.y + 1);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY + 1.5, neckBaseR.x, neckBaseR.y + 1);
  }
  ctx.stroke();
  ctx.restore();

  // Draw crew neckband collar trim with double-stitching details
  ctx.save();
  ctx.lineWidth = 7.5;
  ctx.strokeStyle = adjustColorBrightness(config.baseColor, -14); // contrast crew neckband
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY);
    ctx.lineTo(neckBaseR.x, neckBaseR.y);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY, neckBaseR.x, neckBaseR.y);
  }
  ctx.stroke();
  
  // Double-stitching line
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y + 1);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY + 1);
    ctx.lineTo(neckBaseR.x, neckBaseR.y + 1);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY + 1, neckBaseR.x, neckBaseR.y + 1);
  }
  ctx.stroke();
  ctx.restore();

  // Apply soft edge ambient outlines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw sleeve armhole seams for realism
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.065)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(raisedLS.x, raisedLS.y);
  ctx.quadraticCurveTo(raisedLS.x - shWidth * 0.05, (raisedLS.y + scaledLH.y) / 2, scaledLH.x - 8, (raisedLS.y + scaledLH.y) / 2 + 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(raisedRS.x, raisedRS.y);
  ctx.quadraticCurveTo(raisedRS.x + shWidth * 0.05, (raisedRS.y + scaledRH.y) / 2, scaledRH.x + 8, (raisedRS.y + scaledRH.y) / 2 + 10);
  ctx.stroke();

  // Draw women's bust contour volumetric shading
  if (isFemale) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.055)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(shoulderMidX - shWidth * 0.18, raisedMidY + shWidth * 0.28);
    ctx.quadraticCurveTo(shoulderMidX - shWidth * 0.09, raisedMidY + shWidth * 0.35, shoulderMidX, raisedMidY + shWidth * 0.31);
    ctx.quadraticCurveTo(shoulderMidX + shWidth * 0.09, raisedMidY + shWidth * 0.35, shoulderMidX + shWidth * 0.18, raisedMidY + shWidth * 0.28);
    ctx.stroke();
    
    const bustShadow = ctx.createLinearGradient(shoulderMidX, raisedMidY + shWidth * 0.30, shoulderMidX, raisedMidY + shWidth * 0.44);
    bustShadow.addColorStop(0, 'rgba(0,0,0,0.06)');
    bustShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bustShadow;
    ctx.fillRect(shoulderMidX - shWidth * 0.25, raisedMidY + shWidth * 0.30, shWidth * 0.50, shWidth * 0.14);
    ctx.restore();
  }

  // Draw left/right underarm fabric creases/wrinkles for realism
  ctx.save();
  ctx.lineWidth = 1.8;
  
  // Left Underarm fold
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)'; // crease shadow
  ctx.beginPath();
  ctx.moveTo(scaledLH.x - 8, (raisedLS.y + scaledLH.y) / 2 + 10);
  ctx.quadraticCurveTo(shoulderMidX - shWidth * 0.1, (raisedLS.y + scaledLH.y) / 2 + 20, shoulderMidX - shWidth * 0.08, (raisedLS.y + scaledLH.y) / 2 + 45);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.085)'; // crease highlight
  ctx.beginPath();
  ctx.moveTo(scaledLH.x - 6, (raisedLS.y + scaledLH.y) / 2 + 8);
  ctx.quadraticCurveTo(shoulderMidX - shWidth * 0.1, (raisedLS.y + scaledLH.y) / 2 + 17, shoulderMidX - shWidth * 0.08, (raisedLS.y + scaledLH.y) / 2 + 42);
  ctx.stroke();

  // Right Underarm fold
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.beginPath();
  ctx.moveTo(scaledRH.x + 8, (raisedRS.y + scaledRH.y) / 2 + 10);
  ctx.quadraticCurveTo(shoulderMidX + shWidth * 0.1, (raisedRS.y + scaledRH.y) / 2 + 20, shoulderMidX + shWidth * 0.08, (raisedRS.y + scaledRH.y) / 2 + 45);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.085)';
  ctx.beginPath();
  ctx.moveTo(scaledRH.x + 6, (raisedRS.y + scaledRH.y) / 2 + 8);
  ctx.quadraticCurveTo(shoulderMidX + shWidth * 0.1, (raisedRS.y + scaledRH.y) / 2 + 17, shoulderMidX + shWidth * 0.08, (raisedRS.y + scaledRH.y) / 2 + 42);
  ctx.stroke();
  
  ctx.restore();

  // 3. Draw front ribbed collarband overlay
  ctx.save();
  ctx.strokeStyle = adjustColorBrightness(config.baseColor, -12);
  ctx.lineWidth = Math.max(3, shWidth * 0.03);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY);
    ctx.lineTo(neckBaseR.x, neckBaseR.y);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY, neckBaseR.x, neckBaseR.y);
  }
  ctx.stroke();
  ctx.restore();

  // Draw front collar band contact shadow
  ctx.save();
  const collarShadowGrad = ctx.createLinearGradient(shoulderMidX, raisedMidY + shWidth * 0.05, shoulderMidX, raisedMidY + shWidth * 0.15);
  collarShadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
  collarShadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = collarShadowGrad;
  ctx.beginPath();
  ctx.moveTo(neckBaseL.x, neckBaseL.y + 3);
  if (isVNeck) {
    ctx.lineTo(shoulderMidX, neckDipY + 3);
    ctx.lineTo(neckBaseR.x, neckBaseR.y + 3);
    ctx.lineTo(shoulderMidX, neckDipY + 12);
  } else {
    ctx.quadraticCurveTo(shoulderMidX, neckDipY + 3, neckBaseR.x, neckBaseR.y + 3);
    ctx.quadraticCurveTo(shoulderMidX, neckDipY + 12, neckBaseL.x, neckBaseL.y + 12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Stitching Details
  if (isVNeck) {
    drawStitchingLine(ctx, neckBaseL.x, neckBaseL.y, neckBaseR.x, neckBaseR.y, shoulderMidX, raisedMidY + shWidth * 0.15 + 2);
  } else {
    drawStitchingLine(ctx, neckBaseL.x, neckBaseL.y, neckBaseR.x, neckBaseR.y, shoulderMidX, raisedMidY + shWidth * 0.04 + 2);
  }
  drawStitchingLine(ctx, leftFlareX, bottomY - 4, rightFlareX, bottomY - 4, (leftFlareX + rightFlareX) / 2, bottomY + 18);

  // Draw luxury gold buttons down center placket for cardigans/jackets/shirts
  const isButtoned = subcatLower.includes('jacket') || subcatLower.includes('coat') || nameLower.includes('blazer') || nameLower.includes('cardigan') || nameLower.includes('shirt') || tags.includes('Formal');
  if (isButtoned) {
    ctx.save();
    const hipMidY = (lH.y + rH.y) / 2;
    const numButtons = 3;
    for (let i = 0; i < numButtons; i++) {
      const ratio = 0.35 + i * 0.22;
      const btnX = shoulderMidX;
      const btnY = raisedMidY + (hipMidY - raisedMidY) * ratio;
      
      // Outer drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.arc(btnX + 1.2, btnY + 1.5, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Shiny gold button with 3D radial highlights
      const btnGrad = ctx.createRadialGradient(btnX - 1.5, btnY - 1.5, 0.5, btnX, btnY, 4.5);
      btnGrad.addColorStop(0, '#FFFFFF'); // Hot spot
      btnGrad.addColorStop(0.3, '#E5A93B'); // Midtone gold
      btnGrad.addColorStop(0.9, '#8C5B00'); // Shadow gold
      btnGrad.addColorStop(1, '#533700'); // Deep rim shadow
      
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.arc(btnX, btnY, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // Subtle metallic highlight ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(btnX, btnY, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw luxury satin waist sashes & gold buckles for flared gowns and dresses
  const hasSash = tags.includes('Maxi') || tags.includes('Luxury') || tags.includes('Party') || item.category === 'Party' || subcatLower.includes('lehenga');
  if (hasSash && !isLehenga) {
    ctx.save();
    
    const sashHeight = shWidth * 0.08;
    
    // 1. Draw Sash Band Path
    ctx.beginPath();
    ctx.moveTo(scaledLH.x - 2, scaledLH.y - sashHeight / 2);
    ctx.lineTo(scaledRH.x + 2, scaledRH.y - sashHeight / 2);
    ctx.lineTo(scaledRH.x + 1, scaledRH.y + sashHeight / 2);
    ctx.lineTo(scaledLH.x - 1, scaledLH.y + sashHeight / 2);
    ctx.closePath();
    
    // Volumetric satin gradient highlight (shining in the middle, darker on sides)
    const sashGrad = ctx.createLinearGradient(scaledLH.x, scaledLH.y, scaledRH.x, scaledRH.y);
    sashGrad.addColorStop(0, adjustColorBrightness(config.baseColor, -25));
    sashGrad.addColorStop(0.35, adjustColorBrightness(config.baseColor, 15));
    sashGrad.addColorStop(0.5, adjustColorBrightness(config.baseColor, 28));
    sashGrad.addColorStop(0.65, adjustColorBrightness(config.baseColor, 15));
    sashGrad.addColorStop(1, adjustColorBrightness(config.baseColor, -25));
    
    ctx.fillStyle = sashGrad;
    ctx.fill();
    
    // Sash borders for outline definition
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 2. Draw central metallic gold buckle
    const buckleX = (scaledLH.x + scaledRH.x) / 2;
    const buckleY = (scaledLH.y + scaledLH.y) / 2;
    
    // Buckle shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(buckleX - 8, buckleY - 6.5, 16, 13);
    
    // Gold buckle body
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(buckleX - 7, buckleY - 5.5, 14, 11);
    
    // Inner rectangle cutout to look like a real clasp buckle
    ctx.fillStyle = adjustColorBrightness(config.baseColor, -10);
    ctx.fillRect(buckleX - 4, buckleY - 2.5, 8, 5);
    
    // Gold border outline
    ctx.strokeStyle = '#FFDF00';
    ctx.lineWidth = 1;
    ctx.strokeRect(buckleX - 7, buckleY - 5.5, 14, 11);
    
    ctx.restore();
  }

  if (isLehenga && config.secondaryColor) {
    ctx.save();
    ctx.strokeStyle = config.secondaryColor;
    ctx.lineWidth = 14;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(leftFlareX, bottomY);
    ctx.quadraticCurveTo((leftFlareX + rightFlareX) / 2, bottomY + 22, rightFlareX, bottomY);
    ctx.stroke();
    ctx.restore();
  }

  if (config.texture === 'artistic') {
    drawArtisticPatterns(ctx, raisedLS, raisedRS, scaledLH, scaledRH, config.secondaryColor || '#EC4899');
  } else if (config.texture === 'sequins') {
    drawSequinSparkles(ctx, raisedLS, raisedRS, scaledLH, scaledRH, bottomY, config.baseColor);
  }

  // Draw luxury gold/silver embroidery borders along collar, hem, and cuffs if tagged
  const isLuxury = tags.includes('Luxury') || tags.includes('Brocade') || tags.includes('Runway') || config.secondaryColor === '#D4AF37' || config.secondaryColor === '#C0C0C0' || nameLower.includes('glitz') || nameLower.includes('haze');
  if (isLuxury) {
    ctx.save();
    
    // Choose between gold and silver metallic gradients
    const isSilver = config.secondaryColor === '#C0C0C0' || nameLower.includes('glitz') || nameLower.includes('haze');
    let metallicGrad = ctx.createLinearGradient(raisedLS.x, raisedLS.y, raisedRS.x, raisedRS.y);
    
    if (isSilver) {
      metallicGrad.addColorStop(0, '#A6A6A6');
      metallicGrad.addColorStop(0.25, '#FAFAFA');
      metallicGrad.addColorStop(0.5, '#7F7F7F');
      metallicGrad.addColorStop(0.75, '#FAFAFA');
      metallicGrad.addColorStop(1, '#A6A6A6');
    } else {
      metallicGrad.addColorStop(0, '#D4AF37');
      metallicGrad.addColorStop(0.25, '#FFDF00');
      metallicGrad.addColorStop(0.5, '#B8860B');
      metallicGrad.addColorStop(0.75, '#FFDF00');
      metallicGrad.addColorStop(1, '#D4AF37');
    }
    
    ctx.strokeStyle = metallicGrad;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = isSilver ? 'rgba(250, 250, 250, 0.45)' : 'rgba(212, 175, 55, 0.45)';
    ctx.shadowBlur = 8;
    
    // 1. Gold/Silver embroidery along the collar
    ctx.beginPath();
    ctx.moveTo(neckBaseL.x, neckBaseL.y);
    if (isVNeck) {
      ctx.lineTo(shoulderMidX, neckDipY);
      ctx.lineTo(neckBaseR.x, neckBaseR.y);
    } else {
      ctx.quadraticCurveTo(shoulderMidX, neckDipY, neckBaseR.x, neckBaseR.y);
    }
    ctx.stroke();

    // 2. Gold/Silver embroidery along the bottom hem line
    ctx.beginPath();
    ctx.moveTo(leftFlareX, bottomY);
    ctx.quadraticCurveTo((leftFlareX + rightFlareX) / 2, bottomY + 22, rightFlareX, bottomY);
    ctx.stroke();

    // 3. Gold/Silver embroidery along the sleeve cuffs
    if (hasSleeves) {
      ctx.beginPath();
      ctx.moveTo(leftSleeveOuter.x, leftSleeveOuter.y);
      ctx.lineTo(leftSleeveInner.x, leftSleeveInner.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightSleeveOuter.x, rightSleeveOuter.y);
      ctx.lineTo(rightSleeveInner.x, rightSleeveInner.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 3D Shading
  drawTopShading(ctx, raisedLS, raisedRS, scaledLH, scaledRH);
  drawSkirtShading(ctx, scaledLH, scaledRH, bottomY, isLehenga);
  drawDressCreases(ctx, raisedLS, raisedRS, scaledLH, scaledRH, bottomY, isLehenga);

  // Draw embroidered designer signature emblem monogram for luxury garments
  if (isLuxury) {
    ctx.save();
    const isSilver = config.secondaryColor === '#C0C0C0' || nameLower.includes('glitz') || nameLower.includes('haze');
    ctx.fillStyle = isSilver ? 'rgba(250, 250, 250, 0.48)' : 'rgba(212, 175, 55, 0.58)';
    ctx.font = 'italic bold 7px Georgia, serif';
    ctx.textAlign = 'center';
    
    // Draw monogram at the lower hem flare corner (left side)
    const labelX = leftFlareX + (rightFlareX - leftFlareX) * 0.15;
    const labelY = bottomY - 32;
    
    ctx.fillText("AG", labelX, labelY);
    ctx.strokeStyle = isSilver ? 'rgba(250, 250, 250, 0.32)' : 'rgba(212, 175, 55, 0.38)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.arc(labelX, labelY - 2.2, 5.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSaree(ctx: CanvasRenderingContext2D, p: any[], config: any) {
  const lS = p[11];
  const rS = p[12];
  const lH = p[23];
  const rH = p[24];
  const lK = p[25];
  const rK = p[26];
  const lA = p[27];
  const rA = p[28];

  const bottomY = lA.vis > 0.5 ? lA.y : lK.y + 60;
  
  ctx.save();

  // 1. Draw Blouse (gold/secondary metallic)
  ctx.beginPath();
  ctx.moveTo(rS.x, rS.y);
  ctx.lineTo(lS.x, lS.y);
  ctx.lineTo(lS.x - 5, lS.y + 40);
  ctx.lineTo(rS.x + 5, rS.y + 40);
  ctx.closePath();
  ctx.fillStyle = getFabricFill(ctx, config.secondaryColor || '#D4AF37', 'silk', (lS.x + rS.x)/2, lS.y, distance(lS, rS));
  ctx.fill();

  // 2. Draw Pallu (Luxurious silk drape)
  ctx.beginPath();
  ctx.moveTo(lS.x - 12, lS.y);
  ctx.quadraticCurveTo((lS.x + rH.x) / 2, (lS.y + rH.y) / 2, rH.x + 12, rH.y + 20);
  ctx.quadraticCurveTo(rH.x + 32, bottomY * 0.75, rH.x + 22, bottomY);
  ctx.quadraticCurveTo(lH.x - 22, bottomY, lH.x - 32, bottomY * 0.8);
  ctx.quadraticCurveTo(lH.x - 18, lH.y, lS.x - 12, lS.y);
  ctx.closePath();
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, 'silk', (lS.x + rS.x)/2, lS.y, distance(lS, rS));
  ctx.fill();

  // Gold zari border
  ctx.strokeStyle = config.secondaryColor || '#D4AF37';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(lS.x - 12, lS.y);
  ctx.quadraticCurveTo((lS.x + rH.x) / 2, (lS.y + rH.y) / 2, rH.x + 12, rH.y + 20);
  ctx.quadraticCurveTo(rH.x + 32, bottomY * 0.75, rH.x + 22, bottomY);
  ctx.stroke();

  // 3D folds in drape
  for (let i = 0; i < 5; i++) {
    const sX = lS.x - 2 - i * 4;
    const sY = lS.y + 10;
    const cX = (lS.x + rH.x) / 2 - i * 5;
    const cY = (lS.y + rH.y) / 2 + i * 10;
    const eX = rH.x + 12 - i * 3;
    const eY = rH.y + 80;
    draw3DCrease(ctx, sX, sY, cX, cY, eX, eY, 1.2);
  }

  ctx.restore();
}

function drawOuterwear(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  const lS = p[11];
  const rS = p[12];
  const lH = p[23];
  const rH = p[24];
  const lW = p[15];
  const rW = p[16];

  if (!lS || !rS || lS.vis < 0.15 || rS.vis < 0.15) return;

  const config = item.renderConfig;
  const isLeather = config.texture === 'leather';

  const shWidth = distance(lS, rS);
  const neckYOffset = shWidth * 0.11; // Shift up to match T-shirt neck base
  const raisedLS = { x: lS.x, y: lS.y - neckYOffset };
  const raisedRS = { x: rS.x, y: rS.y - neckYOffset };
  const raisedMidY = (raisedLS.y + raisedRS.y) / 2;

  const isLeftWristVisible = lW && lW.vis > 0.45;
  const isRightWristVisible = rW && rW.vis > 0.45;

  let leftWrist = { ...lW };
  let rightWrist = { ...rW };

  if (!isLeftWristVisible || !isRightWristVisible) {
    // Sitting mode fallback: draw sleeves ending near the side of the body/mid forearm
    const sleeveLen = shWidth * 0.8;
    leftWrist = {
      x: raisedLS.x - sleeveLen * 0.35,
      y: raisedLS.y + sleeveLen
    };
    rightWrist = {
      x: raisedRS.x + sleeveLen * 0.35,
      y: raisedRS.y + sleeveLen
    };
  }

  // Left Jacket Half
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = -4;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.moveTo((raisedLS.x + raisedRS.x)/2 - 5, raisedMidY + shWidth * 0.05); // Collar center
  ctx.lineTo(raisedLS.x, raisedLS.y); // Shoulder
  ctx.lineTo(leftWrist.x - 5, leftWrist.y); // Outer wrist
  ctx.lineTo(leftWrist.x + 8, leftWrist.y + 8); // Inner wrist
  
  // Draw back to underarm to form the sleeve outline
  const leftUnderarm = { 
    x: raisedLS.x + (lH.x - raisedLS.x) * 0.22, 
    y: raisedLS.y + (lH.y - raisedLS.y) * 0.25 
  };
  ctx.lineTo(leftUnderarm.x + 6, leftUnderarm.y + 6); // Underarm
  ctx.lineTo(lH.x - 14, lH.y + 20); // Hip
  ctx.lineTo((lH.x + rH.x)/2 - 5, lH.y + 15); // Bottom center
  ctx.closePath();
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', (raisedLS.x + raisedRS.x)/2, raisedLS.y, shWidth);
  ctx.fill();
  ctx.restore();

  // Right Jacket Half
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.moveTo((raisedLS.x + raisedRS.x)/2 + 5, raisedMidY + shWidth * 0.05); // Collar center
  ctx.lineTo(raisedRS.x, raisedRS.y); // Shoulder
  ctx.lineTo(rightWrist.x + 5, rightWrist.y); // Outer wrist
  ctx.lineTo(rightWrist.x - 8, rightWrist.y + 8); // Inner wrist
  
  const rUnder = rightUnderarm(rH, raisedRS);
  ctx.lineTo(rUnder.x - 6, rUnder.y + 6); // Underarm
  ctx.lineTo(rH.x + 14, rH.y + 20); // Hip
  ctx.lineTo((lH.x + rH.x)/2 + 5, lH.y + 15); // Bottom center
  ctx.closePath();
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', (raisedLS.x + raisedRS.x)/2, raisedLS.y, shWidth);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Outerwear double-stitching
  drawStitchingLine(ctx, raisedLS.x, raisedLS.y, leftWrist.x - 5, leftWrist.y);
  drawStitchingLine(ctx, raisedRS.x, raisedRS.y, rightWrist.x + 5, rightWrist.y);

  // Specular reflection lines for leather
  if (isLeather) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(raisedLS.x, raisedLS.y + 3);
    ctx.lineTo(interpolate(raisedLS, leftWrist, 0.35).x, interpolate(raisedLS, leftWrist, 0.35).y);
    ctx.stroke();
  }

  // Lapels
  ctx.strokeStyle = config.secondaryColor || 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(raisedLS.x - 5, raisedLS.y);
  ctx.lineTo((raisedLS.x + raisedRS.x)/2 - 12, raisedMidY + shWidth * 0.12);
  ctx.moveTo(raisedRS.x + 5, raisedRS.y);
  ctx.lineTo((raisedLS.x + raisedRS.x)/2 + 12, raisedMidY + shWidth * 0.12);
  ctx.stroke();

  // Integration Shading
  drawTopShading(ctx, raisedLS, raisedRS, lH, rH);
}

function drawAccessory(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  const config = item.renderConfig;
  
  if (item.subcategory === 'Sunglasses') {
    const nose = p[0];
    const lE = p[2];
    const rE = p[5];
    if (!lE || !rE || lE.vis < 0.15 || rE.vis < 0.15) return;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.strokeStyle = config.baseColor;
    ctx.lineWidth = 3;
    ctx.fillStyle = config.secondaryColor || 'rgba(0,40,0,0.6)';

    const lensRadius = distance(lE, rE) * 0.45;
    
    // Calculate vertical glasses placement blending eye level and nose bridge level
    const midEyeY = (lE.y + rE.y) / 2;
    const glassY = nose && nose.vis > 0.3 ? (nose.y * 0.38 + midEyeY * 0.62) : (midEyeY + 12);

    ctx.beginPath();
    ctx.arc(lE.x, glassY, lensRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rE.x, glassY, lensRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lE.x + lensRadius, glassY);
    ctx.lineTo(rE.x - lensRadius, glassY);
    ctx.stroke();

    // Specular shine highlights on lenses
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lE.x - lensRadius + 5, glassY + 3);
    ctx.lineTo(lE.x + 5, glassY - lensRadius + 5);
    ctx.moveTo(rE.x - lensRadius + 5, glassY + 3);
    ctx.lineTo(rE.x + 5, glassY - lensRadius + 5);
    ctx.stroke();
    
    ctx.restore();
  }

  if (item.subcategory === 'Watches') {
    const lW = p[15];
    if (!lW || lW.vis < 0.5) return;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = config.baseColor;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(lW.x, lW.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(lW.x, lW.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

function drawShoes(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  const lA = p[27];
  const rA = p[28];
  if (!lA || !rA || (lA.vis < 0.15 && rA.vis < 0.15)) return;

  const config = item.renderConfig;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = config.baseColor;
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  
  if (lA.vis > 0.15) {
    ctx.beginPath();
    ctx.ellipse(lA.x, lA.y + 12, 14, 8, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (rA.vis > 0.15) {
    ctx.beginPath();
    ctx.ellipse(rA.x, rA.y + 12, 14, 8, -Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function interpolate(p1: any, p2: any, ratio: number) {
  return {
    x: p1.x + (p2.x - p1.x) * ratio,
    y: p1.y + (p2.y - p1.y) * ratio
  };
}

function distance(p1: any, p2: any): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function drawStripes(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.3;
  
  const segments = 8;
  for (let i = 1; i < segments; i++) {
    const ratio = i / segments;
    const topPt = interpolate(lS, rS, ratio);
    const botPt = interpolate(lH, rH, ratio);
    
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(botPt.x, botPt.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlaid(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any, baseColor: string, stripeColor: string) {
  ctx.save();
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.25;
  
  const segments = 10;
  for (let i = 1; i < segments; i++) {
    const ratio = i / segments;
    const topPt = interpolate(lS, rS, ratio);
    const botPt = interpolate(lH, rH, ratio);
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(botPt.x, botPt.y);
    ctx.stroke();
  }
  for (let i = 1; i < segments; i++) {
    const ratio = i / segments;
    const leftPt = interpolate(lS, lH, ratio);
    const rightPt = interpolate(rS, rH, ratio);
    ctx.beginPath();
    ctx.moveTo(leftPt.x, leftPt.y);
    ctx.lineTo(rightPt.x, rightPt.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawArtisticPatterns(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any, secondaryColor: string) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop'; // Restrict drawing within the garment boundaries!
  
  const midS = { x: (lS.x + rS.x)/2, y: (lS.y + rS.y)/2 };
  const midH = { x: (lH.x + rH.x)/2, y: (lH.y + rH.y)/2 };

  // Draw flowing, wavy artistic brushstrokes of modern colors
  const colors = [secondaryColor || '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];
  ctx.globalAlpha = 0.55;
  ctx.lineCap = 'round';

  colors.forEach((col, idx) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = 14 + idx * 4;

    const startX = lS.x + (rS.x - lS.x) * (0.15 + idx * 0.22);
    const startY = lS.y + 10;
    const endX = lH.x + (rH.x - lH.x) * (0.2 + idx * 0.18);
    const endY = lH.y - 20;

    const ctrlX = midS.x + (idx % 2 === 0 ? -40 : 40);
    const ctrlY = (startY + endY) / 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.stroke();
  });

  ctx.restore();
}

function drawSequinSparkles(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any, bottomY: number, baseColor: string) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop'; // restrict within garment boundaries!

  const startX = Math.min(lS.x, lH.x) - 40;
  const endX = Math.max(rS.x, rH.x) + 40;
  const startY = Math.min(lS.y, rS.y);
  const endY = bottomY;
  const density = 14; // spacing between sequins

  for (let y = startY; y < endY; y += density) {
    // Alternate horizontal offsets slightly for a packing layout
    const isOdd = Math.floor(y / density) % 2 === 1;
    const offsetX = isOdd ? density / 2 : 0;

    for (let x = startX + offsetX; x < endX; x += density) {
      // Add a subtle wave offset to simulate natural folding fabric curves
      const waveX = Math.sin(y * 0.04 + x * 0.015) * 5;
      const px = x + waveX;
      const py = y;

      // Shimmer reflection oscillations based on current timestamp and coordinates
      const timeVal = Date.now() * 0.0035;
      const shineVal = Math.sin(px * 0.08 + py * 0.06 + timeVal);
      const opacity = 0.5 + shineVal * 0.5;

      // Sequin scale body
      ctx.fillStyle = adjustColorBrightness(baseColor, shineVal * 22);
      ctx.beginPath();
      ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Reflective white metallic 4-point star lens flare sparkle with color-matched outer glow halo
      if (shineVal > 0.52) {
        const rayLen = 4.5 + shineVal * 3.5;
        
        // 1. Color-matched outer glow halo rays
        ctx.strokeStyle = mixColor(baseColor, '#FFFFFF', 0.58);
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(px - (rayLen * 0.7), py);
        ctx.lineTo(px + (rayLen * 0.7), py);
        ctx.moveTo(px, py - (rayLen * 0.7));
        ctx.lineTo(px, py + (rayLen * 0.7));
        ctx.stroke();

        // 2. Bright white core rays
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.95})`;
        ctx.lineWidth = 0.95;
        ctx.beginPath();
        // Horizontal ray
        ctx.moveTo(px - rayLen, py);
        ctx.lineTo(px + rayLen, py);
        // Vertical ray
        ctx.moveTo(px, py - rayLen);
        ctx.lineTo(px, py + rayLen);
        ctx.stroke();

        // Glowing core center
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function rightUnderarm(rH: any, rS: any) {
  return { x: rS.x - (rS.x - rH.x) * 0.22, y: rS.y + (rH.y - rS.y) * 0.25 };
}

function drawTopCreases(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any, leftUnderarm: any, rUnder: any) {
  const shMidY = (lS.y + rS.y) / 2;
  const hpMidY = (lH.y + rH.y) / 2;
  const midY = (shMidY + hpMidY) / 2;

  // Wrinkles radiating from left/right armpits
  draw3DCrease(ctx, leftUnderarm.x + 8, leftUnderarm.y + 8, (lS.x + rH.x)/2 - 10, midY - 20, (lS.x + rS.x)/2 - 20, midY, 1.2);
  draw3DCrease(ctx, leftUnderarm.x + 12, leftUnderarm.y + 35, (lS.x + rH.x)/2 - 20, midY + 10, (lS.x + rS.x)/2 - 30, midY + 30, 0.85);
  
  draw3DCrease(ctx, rUnder.x - 8, rUnder.y + 8, (rS.x + lH.x)/2 + 10, midY - 20, (lS.x + rS.x)/2 + 20, midY, 1.2);
  draw3DCrease(ctx, rUnder.x - 12, rUnder.y + 35, (rS.x + lH.x)/2 + 20, midY + 10, (lS.x + rS.x)/2 + 30, midY + 30, 0.85);

  // Soft folds across waist (helps show leaning/bending)
  const dy = Math.abs(lH.y - lS.y);
  if (dy < 250) {
    draw3DCrease(ctx, lH.x + 30, lH.y - 45, (lH.x + rH.x)/2, lH.y - 35, rH.x - 30, lH.y - 45, 1.3);
    draw3DCrease(ctx, lH.x + 40, lH.y - 75, (lH.x + rH.x)/2, lH.y - 65, rH.x - 40, lH.y - 75, 0.95);
    draw3DCrease(ctx, lH.x + 25, lH.y - 110, (lH.x + rH.x)/2, lH.y - 100, rH.x - 25, lH.y - 110, 0.7);
  }
}

function drawDenimDetails(ctx: CanvasRenderingContext2D, lH: any, rH: any, lK: any, rK: any, lA: any, rA: any, isShorts: boolean) {
  ctx.save();
  // Gold stitch lines (Waistband stitch)
  ctx.strokeStyle = 'rgba(196, 154, 108, 0.42)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(rH.x + 4, rH.y - 11);
  ctx.lineTo(lH.x - 4, lH.y - 11);
  ctx.stroke();

  // Scoop pockets detailing (copper orange denim thread)
  const hipW = Math.abs(rH.x - lH.x);
  
  // Left pocket scoop
  ctx.beginPath();
  ctx.moveTo(lH.x - 2, lH.y - 10);
  ctx.quadraticCurveTo(lH.x + hipW * 0.15, lH.y - 12, lH.x + hipW * 0.22, lH.y + 12);
  ctx.stroke();

  // Right pocket scoop
  ctx.beginPath();
  ctx.moveTo(rH.x + 2, rH.y - 10);
  ctx.quadraticCurveTo(rH.x - hipW * 0.15, rH.y - 12, rH.x - hipW * 0.22, rH.y + 12);
  ctx.stroke();

  // J-curve fly zipper stitch line
  ctx.beginPath();
  const cX = (lH.x + rH.x) / 2;
  const cY = (lH.y + rH.y) / 2;
  ctx.moveTo(cX, cY - 10);
  ctx.lineTo(cX, cY + 22);
  ctx.quadraticCurveTo(cX - 8, cY + 26, cX - 12, cY + 16);
  ctx.stroke();

  // 3D wrinkles around knees (whiskers)
  if (!isShorts && lK.vis > 0.5) {
    draw3DCrease(ctx, lK.x - 12, lK.y - 12, lK.x, lK.y - 8, lK.x + 12, lK.y - 12, 1.3);
    draw3DCrease(ctx, lK.x - 10, lK.y + 6, lK.x, lK.y + 9, lK.x + 10, lK.y + 6, 0.95);
    
    draw3DCrease(ctx, rK.x - 12, rK.y - 12, rK.x, rK.y - 8, rK.x + 12, rK.y - 12, 1.3);
    draw3DCrease(ctx, rK.x - 10, rK.y + 6, rK.x, rK.y + 9, rK.x + 10, rK.y + 6, 0.95);
  }

  // Shadow between legs (gives pants a 3D divided silhouette rather than flat color block)
  const grad = ctx.createLinearGradient((lH.x + rH.x)/2, lH.y, (lH.x + rH.x)/2, lA.y);
  grad.addColorStop(0, 'rgba(255,255,255,0.06)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(rH.x + 5, rH.y - 15);
  ctx.lineTo(lH.x - 5, lH.y - 15);
  ctx.quadraticCurveTo(lH.x - 12, lK.y, lA.x - 8, lA.y);
  ctx.lineTo(lA.x + 8, lA.y);
  const crotch = { x: (lH.x + rH.x) / 2, y: (lH.y + rH.y) / 2 + (lA.y - lH.y) * 0.22 };
  ctx.quadraticCurveTo(lK.x + 6, lK.y, crotch.x, crotch.y);
  ctx.quadraticCurveTo(rK.x - 6, rK.y, rA.x - 8, rA.y);
  ctx.lineTo(rA.x + 8, rA.y);
  ctx.quadraticCurveTo(rH.x + 12, rK.y, rH.x + 5, rH.y - 15);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPantsShading(ctx: CanvasRenderingContext2D, lH: any, rH: any, lK: any, rK: any, lA: any, rA: any, isShorts: boolean) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2.2;
  
  if (!isShorts) {
    // Crease lines down middle
    ctx.beginPath();
    ctx.moveTo(lH.x - 1, lH.y + 12);
    ctx.lineTo(lA.x, lA.y - 6);
    ctx.moveTo(rH.x + 1, rH.y + 12);
    ctx.lineTo(rA.x, rA.y - 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDressCreases(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any, bottomY: number, isLehenga: boolean) {
  // Draw 3D drapery folds flowing down from waist
  const segments = isLehenga ? 8 : 5;
  for (let i = 1; i < segments; i++) {
    const ratio = i / segments;
    const startPt = interpolate(lH, rH, ratio);
    const endX = lH.x - (isLehenga ? 50 : 20) + (rH.x - lH.x + (isLehenga ? 100 : 40)) * ratio;
    
    // Draw fabric shadow fold (darks)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.085)';
    ctx.lineWidth = isLehenga ? 2.5 : 1.8;
    draw3DCrease(ctx, startPt.x - 2, startPt.y, startPt.x + (endX - startPt.x) * 0.4 - 2, (startPt.y + bottomY) / 2, endX - 2, bottomY, 1.25);
    ctx.restore();
    
    // Draw fabric highlight fold (lights)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.lineWidth = isLehenga ? 2.0 : 1.3;
    draw3DCrease(ctx, startPt.x + 2, startPt.y, startPt.x + (endX - startPt.x) * 0.4 + 2, (startPt.y + bottomY) / 2, endX + 2, bottomY, 1.25);
    ctx.restore();
  }
}

export function drawScanningHUD(
  ctx: CanvasRenderingContext2D,
  landmarks: Point3D[],
  measurements: ScanMeasurements,
  width: number,
  height: number
) {
  if (!landmarks || landmarks.length < 25) return;

  ctx.save();
  // Flip coordinate space to align with mirrored webcam stream
  ctx.translate(width, 0);
  ctx.scale(-1, 1);

  // Convert points
  const points = landmarks.map(lm => {
    if (!lm) return { x: 0, y: 0, z: 0, vis: 0 };
    return {
      x: lm.x * width,
      y: lm.y * height,
      z: lm.z,
      vis: lm.visibility ?? 0
    };
  });

  const lS = points[11];
  const rS = points[12];
  const lE = points[13];
  const rE = points[14];
  const lW = points[15];
  const rW = points[16];
  const lH = points[23];
  const rH = points[24];

  // Draw glowing joint nodes
  const nodes = [lS, rS, lE, rE, lW, rW, lH, rH];
  ctx.lineWidth = 1.5;
  nodes.forEach(node => {
    if (node && node.vis > 0.3) {
      // Glow ring
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // Helper to draw a dashed measurement bridge line with text label
  const drawBridge = (p1: { x: number, y: number }, p2: { x: number, y: number }, label: string, value: number | null) => {
    if (!p1 || !p2) return;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();

    // Text Label Box
    if (value !== null && value !== undefined) {
      ctx.save();
      // Mirror the text context back so text renders readable (not backwards!)
      ctx.translate(midX, midY - 14);
      ctx.scale(-1, 1);
      
      const text = `${label}: ${value} cm`;
      ctx.font = 'bold 9px monospace';
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-textWidth/2 - 6, -8, textWidth + 12, 14);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-textWidth/2 - 6, -8, textWidth + 12, 14);

      ctx.fillStyle = '#22D3EE'; // cyan-400
      ctx.textAlign = 'center';
      ctx.fillText(text, 0, 2);
      ctx.restore();
    }
  };

  // Draw measurement lines
  if (lS && rS && lS.vis > 0.3 && rS.vis > 0.3) {
    drawBridge(lS, rS, 'SHOULDERS', measurements.shoulderWidthCm);
  }
  if (lS && rS && lH && rH) {
    const chestL = interpolate(lS, lH, 0.28);
    const chestR = interpolate(rS, rH, 0.28);
    drawBridge(chestL, chestR, 'CHEST', measurements.chestCm);

    const waistL = interpolate(lS, lH, 0.68);
    const waistR = interpolate(rS, rH, 0.68);
    drawBridge(waistL, waistR, 'WAIST', measurements.waistCm);
  }
  if (lH && rH && lH.vis > 0.3 && rH.vis > 0.3) {
    drawBridge(lH, rH, 'HIPS', measurements.hipCm);
  }

  // Draw Scanner Active Tag (un-mirrored in the top right)
  ctx.save();
  ctx.translate(width - 165, 24);
  ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, 0, 145, 45);
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(0, 0, 145, 45);

  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = '#22D3EE';
  ctx.fillText('• CV BODY SCANNER', 10, 16);
  ctx.fillStyle = '#94A3B8';
  ctx.fillText(`Type: ${measurements.bodyType || 'Active'}`, 10, 28);
  ctx.fillText(`Calib: ${measurements.heightCm ? '100% OK' : 'Estimate'}`, 10, 38);
  ctx.restore();

  ctx.restore();
}
