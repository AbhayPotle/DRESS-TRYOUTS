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

// Generates live programmatic high-resolution fabric texture patterns (16px tile for finer weave)
function getFabricFill(
  ctx: CanvasRenderingContext2D,
  color: string,
  textureType: string,
  shCenter: number,
  shY: number,
  shWidth: number
): string | CanvasPattern | CanvasGradient {
  // Silk/Saree gradient sheen
  if (textureType === 'silk' || color === '#800020' || color === '#D63031') {
    const grad = ctx.createLinearGradient(shCenter - shWidth, shY, shCenter + shWidth, shY + shWidth * 2.5);
    grad.addColorStop(0, adjustColorBrightness(color, -25));
    grad.addColorStop(0.2, color);
    grad.addColorStop(0.4, adjustColorBrightness(color, 35)); // glossy silk highlight
    grad.addColorStop(0.6, color);
    grad.addColorStop(0.8, adjustColorBrightness(color, -15));
    grad.addColorStop(1, adjustColorBrightness(color, -35));
    return grad;
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
    // Finer selvedge twill denim weave
    pCtx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    pCtx.lineWidth = 0.75;
    pCtx.beginPath();
    pCtx.moveTo(0, 0); pCtx.lineTo(16, 16);
    pCtx.moveTo(-8, 0); pCtx.lineTo(8, 16);
    pCtx.moveTo(8, 0); pCtx.lineTo(24, 16);
    pCtx.stroke();
    
    pCtx.strokeStyle = 'rgba(0, 0, 0, 0.13)';
    pCtx.beginPath();
    pCtx.moveTo(0, 1.5); pCtx.lineTo(14.5, 16);
    pCtx.moveTo(-8, 1.5); pCtx.lineTo(6.5, 16);
    pCtx.stroke();
  } else if (textureType === 'knitted') {
    // Ribbed knit stitch lines (16px tile)
    pCtx.fillStyle = 'rgba(0, 0, 0, 0.07)';
    pCtx.fillRect(0, 0, 2, 16);
    pCtx.fillRect(8, 0, 2, 16);
    pCtx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    pCtx.fillRect(4, 0, 2, 16);
    pCtx.fillRect(12, 0, 2, 16);
  } else if (textureType === 'leather') {
    // Pebbled leather grain
    pCtx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    pCtx.fillRect(2, 2, 2.5, 2.5);
    pCtx.fillRect(10, 10, 2.5, 2.5);
    pCtx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    pCtx.fillRect(3, 3, 1, 1);
    pCtx.fillRect(11, 11, 1, 1);
  } else {
    // Standard Plain Cotton Weave (micro threads)
    pCtx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    pCtx.fillRect(0, 0, 16, 0.75);
    pCtx.fillRect(0, 0, 0.75, 16);
    pCtx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    pCtx.fillRect(0, 8, 16, 0.75);
    pCtx.fillRect(8, 0, 0.75, 16);
  }

  const pattern = ctx.createPattern(patternCanvas, 'repeat');
  return pattern || color;
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
  
  // 1. Crease Shadow (dark) with soft blur filter for realism
  ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 * intensity})`;
  ctx.lineWidth = 3.5;
  ctx.filter = 'blur(2px)'; // apply soft-blur filter to shadow
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
  ctx.stroke();

  // Reset filter for highlight
  ctx.filter = 'none';

  // 2. Crease Highlight (light, offset slightly to catch highlights)
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 * intensity})`;
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

  // Render each garment
  sortedItems.forEach(item => {
    ctx.save();
    
    if (item.type === 'top') {
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
  const lS = p[11];
  const rS = p[12];
  const lE = p[13];
  const rE = p[14];

  if (!lS || !rS || lS.vis < 0.15 || rS.vis < 0.15) return;

  const config = item.renderConfig;
  
  // Calculate dynamic point-by-point fitting ratios based on scanned measurements
  const isFemale = item.gender === 'woman' || item.gender === 'girl' || item.subcategory.includes('Crop Tops');
  const baseShoulder = isFemale ? 38 : 44;
  const baseWaist = isFemale ? 68 : 82;

  const shoulderScale = m.shoulderWidthCm ? (m.shoulderWidthCm / baseShoulder) : 1.0;
  const waistScale = m.waistCm ? (m.waistCm / baseWaist) : 1.0;

  const shScale = Math.max(0.78, Math.min(1.35, shoulderScale));
  const wScale = Math.max(0.78, Math.min(1.35, waistScale));

  let lH = p[23];
  let rH = p[24];
  if (!lH || !rH || lH.vis < 0.5 || rH.vis < 0.5) {
    const shWidth = distance(lS, rS);
    lH = {
      x: lS.x - shWidth * 0.08,
      y: lS.y + shWidth * 1.6,
      vis: 0.9
    };
    rH = {
      x: rS.x + shWidth * 0.08,
      y: rS.y + shWidth * 1.6,
      vis: 0.9
    };
  }

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

  const leftSleeveEnd = item.styleTags.includes('Oversized') 
    ? interpolate(scaledLS, lE, 0.65) 
    : interpolate(scaledLS, lE, 0.42);
  const rightSleeveEnd = item.styleTags.includes('Oversized') 
    ? interpolate(scaledRS, rE, 0.65) 
    : interpolate(scaledRS, rE, 0.42);

  ctx.beginPath();
  ctx.moveTo(scaledRS.x, scaledRS.y);
  ctx.quadraticCurveTo(shoulderMidX, shoulderMidY + 16, scaledLS.x, scaledLS.y);
  ctx.lineTo(leftSleeveEnd.x, leftSleeveEnd.y);
  const leftUnderarm = { x: scaledLS.x + (scaledLH.x - scaledLS.x) * 0.22, y: scaledLS.y + (scaledLH.y - scaledLS.y) * 0.25 };
  ctx.lineTo(leftUnderarm.x + 12, leftUnderarm.y + 12);
  ctx.lineTo(leftUnderarm.x, leftUnderarm.y);
  ctx.quadraticCurveTo(scaledLH.x + 10, interpolate(scaledLS, scaledLH, 0.6).y, scaledLH.x + 16, scaledLH.y + 6);
  ctx.quadraticCurveTo(hipMidX, hipMidY + 12, scaledRH.x - 16, scaledRH.y + 6);
  const rUnder = rightUnderarm(scaledRH, scaledRS);
  ctx.quadraticCurveTo(scaledRH.x - 10, interpolate(scaledRS, scaledRH, 0.6).y, rUnder.x, rUnder.y);
  ctx.lineTo(rightSleeveEnd.x - 12, rightSleeveEnd.y + 12);
  ctx.lineTo(rightSleeveEnd.x, rightSleeveEnd.y);
  ctx.closePath();

  // Apply realistic fabric texture pattern
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', shoulderMidX, scaledLS.y, distance(scaledLS, scaledRS));
  ctx.fill();

  // Apply soft edge ambient outlines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Stitching Details (collars, sleeves, hems)
  drawStitchingLine(ctx, scaledRS.x, scaledRS.y, scaledLS.x, scaledLS.y, shoulderMidX, shoulderMidY + 16);
  drawStitchingLine(ctx, leftSleeveEnd.x, leftSleeveEnd.y, leftUnderarm.x + 12, leftUnderarm.y + 12);
  drawStitchingLine(ctx, rightSleeveEnd.x, rightSleeveEnd.y, rUnder.x - 12, rUnder.y + 12);
  drawStitchingLine(ctx, scaledLH.x + 16, scaledLH.y + 6, scaledRH.x - 16, scaledRH.y + 6, hipMidX, hipMidY + 12);

  // Secondary details
  if (config.texture === 'stripes') {
    drawStripes(ctx, scaledLS, scaledRS, scaledLH, scaledRH, config.secondaryColor || '#FFFFFF');
  } else if (config.texture === 'plaid') {
    drawPlaid(ctx, scaledLS, scaledRS, scaledLH, scaledRH, config.baseColor, config.secondaryColor || '#000000');
  }

  // Realistic Specular Shading overlay
  drawTopShading(ctx, scaledLS, scaledRS, scaledLH, scaledRH);

  // Creases & Shadows (Creases add realistic wrinkles)
  drawTopCreases(ctx, scaledLS, scaledRS, scaledLH, scaledRH, leftUnderarm, rUnder);

  if (config.logoText) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '800 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.logoText, shoulderMidX, shoulderMidY + (scaledLH.y - scaledLS.y) * 0.3);
    ctx.restore();
  }
}

function drawTopShading(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any) {
  ctx.save();
  
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

  // 3. Ambient occlusion shading along the sides
  const gradSides = ctx.createLinearGradient(lS.x, lS.y, rS.x, rS.y);
  gradSides.addColorStop(0, 'rgba(0,0,0,0.22)');
  gradSides.addColorStop(0.18, 'rgba(0,0,0,0)');
  gradSides.addColorStop(0.5, 'rgba(255,255,255,0.12)'); // Chest specular bulge highlight
  gradSides.addColorStop(0.82, 'rgba(0,0,0,0)');
  gradSides.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = gradSides;
  
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillRect(lS.x - 100, lS.y - 10, rS.x - lS.x + 200, (lH.y - lS.y) + 150);
  
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
  const hipScale = m.hipCm ? (m.hipCm / baseHip) : 1.0;
  const hScale = Math.max(0.78, Math.min(1.35, hipScale));

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
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', hpCenter, scaledLH.y, hipWidth);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Stitch bottom hems of trousers
  if (!isShorts) {
    drawStitchingLine(ctx, scaledLA.x - 10, scaledLA.y - 4, scaledLA.x + 10, scaledLA.y - 4);
    drawStitchingLine(ctx, scaledRA.x - 10, scaledRA.y - 4, scaledRA.x + 10, scaledRA.y - 4);
  }

  // Denim shading/highlights
  if (config.texture === 'denim') {
    drawDenimDetails(ctx, scaledLH, scaledRH, scaledLK, scaledRK, scaledLA, scaledRA, isShorts);
  } else {
    drawPantsShading(ctx, scaledLH, scaledRH, scaledLK, scaledRK, scaledLA, scaledRA, isShorts);
  }
}

function drawFullBody(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  const lS = p[11];
  const rS = p[12];

  if (!lS || !rS || lS.vis < 0.15 || rS.vis < 0.15) return;

  const config = item.renderConfig;
  const isSaree = item.subcategory.includes('Sarees');
  const isLehenga = item.subcategory.includes('Lehengas');

  if (isSaree) {
    drawSaree(ctx, p, config);
    return;
  }

  // Calculate dynamic point-by-point fitting ratios based on scanned measurements
  const isFemale = item.gender === 'woman' || item.gender === 'girl' || isLehenga;
  const baseShoulder = isFemale ? 38 : 44;
  const baseHip = isFemale ? 94 : 96;

  const shoulderScale = m.shoulderWidthCm ? (m.shoulderWidthCm / baseShoulder) : 1.0;
  const hipScale = m.hipCm ? (m.hipCm / baseHip) : 1.0;

  const shScale = Math.max(0.78, Math.min(1.35, shoulderScale));
  const hScale = Math.max(0.78, Math.min(1.35, hipScale));

  const shWidth = distance(lS, rS);

  let lH = p[23];
  let rH = p[24];
  let lK = p[25];
  let rK = p[26];
  let lA = p[27];
  let rA = p[28];

  if (!lH || !rH || lH.vis < 0.5 || rH.vis < 0.5) {
    lH = { x: lS.x - shWidth * 0.1, y: lS.y + shWidth * 1.5, vis: 0.9 };
    rH = { x: rS.x + shWidth * 0.1, y: rS.y + shWidth * 1.5, vis: 0.9 };
  }
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

  ctx.beginPath();
  const shoulderMidX = (scaledLS.x + scaledRS.x) / 2;
  const shoulderMidY = (scaledLS.y + scaledRS.y) / 2;
  ctx.moveTo(scaledRS.x, scaledRS.y);
  ctx.quadraticCurveTo(shoulderMidX, shoulderMidY + 12, scaledLS.x, scaledLS.y);
  ctx.quadraticCurveTo(scaledLS.x - 10, scaledLH.y * 0.7, scaledLH.x - 6, scaledLH.y);

  const bottomY = lA.vis > 0.5 ? lA.y : lK.y + shWidth * 1.2;
  const leftFlareX = scaledLH.x - (isLehenga ? shWidth * 0.45 : shWidth * 0.2);
  const rightFlareX = scaledRH.x + (isLehenga ? shWidth * 0.45 : shWidth * 0.2);

  ctx.quadraticCurveTo(leftFlareX - 12, (scaledLH.y + bottomY) / 2, leftFlareX, bottomY);
  ctx.quadraticCurveTo((leftFlareX + rightFlareX) / 2, bottomY + 22, rightFlareX, bottomY);
  ctx.quadraticCurveTo(rightFlareX + 12, (scaledRH.y + bottomY) / 2, scaledRH.x + 6, scaledRH.y);
  ctx.quadraticCurveTo(scaledRS.x + 10, scaledRH.y * 0.7, scaledRS.x, scaledRS.y);
  ctx.closePath();

  // Weave texture or silk sheen gradient
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', shoulderMidX, scaledLS.y, shWidth);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Stitching Details
  drawStitchingLine(ctx, scaledRS.x, scaledRS.y, scaledLS.x, scaledLS.y, shoulderMidX, shoulderMidY + 12);
  drawStitchingLine(ctx, leftFlareX, bottomY - 4, rightFlareX, bottomY - 4, (leftFlareX + rightFlareX) / 2, bottomY + 18);

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

  // 3D Shading
  drawTopShading(ctx, scaledLS, scaledRS, scaledLH, scaledRH);
  drawDressCreases(ctx, scaledLS, scaledRS, scaledLH, scaledRH, bottomY, isLehenga);
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

  // Left Jacket Half
  ctx.beginPath();
  ctx.moveTo((lS.x + rS.x)/2 - 5, lS.y + 15);
  ctx.lineTo(lS.x, lS.y);
  ctx.lineTo(lW.x - 5, lW.y);
  ctx.lineTo(lH.x - 14, lH.y + 20);
  ctx.lineTo((lH.x + rH.x)/2 - 5, lH.y + 15);
  ctx.closePath();
  ctx.fillStyle = getFabricFill(ctx, config.baseColor, config.texture || 'plain', (lS.x + rS.x)/2, lS.y, distance(lS, rS));
  ctx.fill();

  // Right Jacket Half
  ctx.beginPath();
  ctx.moveTo((lS.x + rS.x)/2 + 5, lS.y + 15);
  ctx.lineTo(rS.x, rS.y);
  ctx.lineTo(rW.x + 5, rW.y);
  ctx.lineTo(rH.x + 14, rH.y + 20);
  ctx.lineTo((lH.x + rH.x)/2 + 5, lH.y + 15);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Outerwear double-stitching
  drawStitchingLine(ctx, lS.x, lS.y, lW.x - 5, lW.y);
  drawStitchingLine(ctx, rS.x, rS.y, rW.x + 5, rW.y);

  // Specular reflection lines for leather
  if (isLeather) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lS.x, lS.y + 3);
    ctx.lineTo(interpolate(lS, lW, 0.35).x, interpolate(lS, lW, 0.35).y);
    ctx.stroke();
  }

  // Lapels
  ctx.strokeStyle = config.secondaryColor || 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(lS.x - 5, lS.y);
  ctx.lineTo((lS.x + rS.x)/2 - 12, lS.y + 35);
  ctx.moveTo(rS.x + 5, rS.y);
  ctx.lineTo((lS.x + rS.x)/2 + 12, lS.y + 35);
  ctx.stroke();

  // Integration Shading
  drawTopShading(ctx, lS, rS, lH, rH);
}

function drawAccessory(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  const config = item.renderConfig;
  
  if (item.subcategory === 'Sunglasses') {
    const nose = p[0];
    const lE = p[2];
    const rE = p[5];
    if (!lE || !rE || lE.vis < 0.15 || rE.vis < 0.15) return;

    ctx.save();
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
  // Gold stitch lines
  ctx.strokeStyle = 'rgba(196, 154, 108, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(rH.x + 4, rH.y - 11);
  ctx.lineTo(lH.x - 4, lH.y - 11);
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
    
    draw3DCrease(ctx, startPt.x, startPt.y, startPt.x + (endX - startPt.x) * 0.4, (startPt.y + bottomY) / 2, endX, bottomY, 1.1);
  }
}
