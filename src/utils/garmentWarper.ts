import { Garment } from './outfitLibrary';
import { ScanMeasurements } from './aiRecommender';

export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
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
  // This ensures that simple offsets (-10 / +10) scale outwards correctly on both sides!
  ctx.translate(width, 0);
  ctx.scale(-1, 1);

  // Convert normalized landmarks to canvas pixel coordinates (un-mirrored, since context scale handles mirroring)
  const points = landmarks.map(lm => ({
    x: lm.x * width,
    y: lm.y * height,
    z: lm.z,
    vis: lm.visibility ?? 0
  }));

  // Hand landmarks for occlusion:
  // 15/16: wrists, 17/18: pinkies, 19/20: indexes, 21/22: thumbs
  const leftHandPoints = [points[15], points[17], points[19], points[21]];
  const rightHandPoints = [points[16], points[18], points[20], points[22]];

  // Sort garments so we render: 1. Bottoms, 2. Tops, 3. Outerwear, 4. Accessories/Shoes
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

// Post-drawing erasure of hands to show them on top of the garment
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

  // Erase left hand area if visible
  if (leftWrist.vis > 0.5) {
    ctx.beginPath();
    const cx = (leftWrist.x + leftIndex.x + leftThumb.x + leftPinky.x) / 4;
    const cy = (leftWrist.y + leftIndex.y + leftThumb.y + leftPinky.y) / 4;
    const r = Math.max(30, distance(leftWrist, leftIndex) * 1.5);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Erase right hand area if visible
  if (rightWrist.vis > 0.5) {
    ctx.beginPath();
    const cx = (rightWrist.x + rightIndex.x + rightThumb.x + rightPinky.x) / 4;
    const cy = (rightWrist.y + rightIndex.y + rightThumb.y + rightPinky.y) / 4;
    const r = Math.max(30, distance(rightWrist, rightIndex) * 1.5);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawTop(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Landmarks: 11: L Shoulder, 12: R Shoulder, 23: L Hip, 24: R Hip, 13: L Elbow, 14: R Elbow
  const lS = p[11];
  const rS = p[12];
  const lE = p[13];
  const rE = p[14];

  if (lS.vis < 0.4 || rS.vis < 0.4) return;

  const config = item.renderConfig;
  
  // Calculate dynamic fit multiplier based on body type sizing
  let fitMultiplier = 1.0;
  if (m.bodyType === 'Plus Size') fitMultiplier = 1.28;
  else if (m.bodyType === 'Curvy') fitMultiplier = 1.18;
  else if (m.bodyType === 'Muscular') fitMultiplier = 1.14;
  else if (m.bodyType === 'Slim') fitMultiplier = 0.90;

  // Fallback: If hips are out of frame (visibility low), estimate them based on shoulders
  let lH = p[23];
  let rH = p[24];
  if (lH.vis < 0.5 || rH.vis < 0.5) {
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

  // Calculate midpoints for collar and hem
  const shoulderMidX = (lS.x + rS.x) / 2;
  const shoulderMidY = (lS.y + rS.y) / 2;
  const hipMidX = (lH.x + rH.x) / 2;
  const hipMidY = (lH.y + rH.y) / 2;

  // Apply fit scaling to body contours
  const shCenter = (lS.x + rS.x) / 2;
  const hpCenter = (lH.x + rH.x) / 2;

  const scaledLS = { x: shCenter + (lS.x - shCenter) * fitMultiplier, y: lS.y };
  const scaledRS = { x: shCenter + (rS.x - shCenter) * fitMultiplier, y: rS.y };
  const scaledLH = { x: hpCenter + (lH.x - hpCenter) * fitMultiplier, y: lH.y };
  const scaledRH = { x: hpCenter + (rH.x - hpCenter) * fitMultiplier, y: rH.y };

  // Outer sleeve points (adjust with fit sizing)
  const leftSleeveEnd = item.styleTags.includes('Oversized') 
    ? interpolate(scaledLS, lE, 0.65) 
    : interpolate(scaledLS, lE, 0.42);
  const rightSleeveEnd = item.styleTags.includes('Oversized') 
    ? interpolate(scaledRS, rE, 0.65) 
    : interpolate(scaledRS, rE, 0.42);

  // Draw main shirt body
  ctx.beginPath();
  
  // Neck Collar (dip curve)
  ctx.moveTo(scaledRS.x, scaledRS.y);
  ctx.quadraticCurveTo(shoulderMidX, shoulderMidY + 16, scaledLS.x, scaledLS.y);

  // Left sleeve sleeve outer
  ctx.lineTo(leftSleeveEnd.x, leftSleeveEnd.y);
  // Left sleeve sleeve cuff
  const leftUnderarm = { x: scaledLS.x - (scaledLS.x - scaledLH.x) * 0.22, y: scaledLS.y + (scaledLH.y - scaledLS.y) * 0.25 };
  ctx.lineTo(leftUnderarm.x - 12, leftUnderarm.y + 12);
  ctx.lineTo(leftUnderarm.x, leftUnderarm.y);

  // Left side seam down to waist
  ctx.quadraticCurveTo(scaledLH.x - 12, interpolate(scaledLS, scaledLH, 0.6).y, scaledLH.x - 6, scaledLH.y + 6);

  // Bottom Hem
  ctx.quadraticCurveTo(hipMidX, hipMidY + 12, scaledRH.x + 6, scaledRH.y + 6);

  // Right side seam up to underarm
  const rUnder = rightUnderarm(scaledRH, scaledRS);
  ctx.quadraticCurveTo(scaledRH.x + 12, interpolate(scaledRS, scaledRH, 0.6).y, rUnder.x, rUnder.y);
  
  // Right sleeve cuff
  ctx.lineTo(rightSleeveEnd.x + 12, rightSleeveEnd.y + 12);
  ctx.lineTo(rightSleeveEnd.x, rightSleeveEnd.y);
  
  ctx.closePath();

  // Fill shirt
  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Draw stripes or secondary color pattern if configured
  if (config.texture === 'stripes') {
    drawStripes(ctx, scaledLS, scaledRS, scaledLH, scaledRH, config.secondaryColor || '#FFFFFF');
  } else if (config.texture === 'plaid') {
    drawPlaid(ctx, scaledLS, scaledRS, scaledLH, scaledRH, config.baseColor, config.secondaryColor || '#000000');
  }

  // Creases & Shadows (Creases add realistic wrinkles)
  drawTopCreases(ctx, scaledLS, scaledRS, scaledLH, scaledRH, leftUnderarm, rUnder);

  // Logo Text (if applicable)
  if (config.logoText) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8;
    ctx.fillText(config.logoText, shoulderMidX, shoulderMidY + (scaledLH.y - scaledLS.y) * 0.3);
    ctx.restore();
  }
}

function rightUnderarm(rH: any, rS: any) {
  return { x: rS.x - (rS.x - rH.x) * 0.22, y: rS.y + (rH.y - rS.y) * 0.25 };
}

function drawBottom(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Landmarks: 23: L Hip, 24: R Hip, 25: L Knee, 26: R Knee, 27: L Ankle, 28: R Ankle
  let lH = p[23];
  let rH = p[24];

  if (lH.vis < 0.4 || rH.vis < 0.4) return; // Hips are required for pants

  const config = item.renderConfig;
  const isShorts = item.subcategory.includes('Skirts') || item.subcategory.includes('Mini');

  // Dynamic scaling based on waist size
  let fitMultiplier = 1.0;
  if (m.bodyType === 'Plus Size') fitMultiplier = 1.25;
  else if (m.bodyType === 'Curvy') fitMultiplier = 1.18;
  else if (m.bodyType === 'Slim') fitMultiplier = 0.92;

  const hipWidth = distance(lH, rH);
  
  // Fallbacks: If knees or ankles are out of camera frame, estimate positions dynamically
  let lK = p[25];
  let rK = p[26];
  let lA = p[27];
  let rA = p[28];

  if (lK.vis < 0.5) lK = { x: lH.x, y: lH.y + hipWidth * 1.35, vis: 0.9 };
  if (rK.vis < 0.5) rK = { x: rH.x, y: rH.y + hipWidth * 1.35, vis: 0.9 };
  if (lA.vis < 0.5) lA = { x: lK.x, y: lK.y + hipWidth * 1.45, vis: 0.9 };
  if (rA.vis < 0.5) rA = { x: rK.x, y: rK.y + hipWidth * 1.45, vis: 0.9 };

  // Apply scaling relative to hip center
  const hpCenter = (lH.x + rH.x) / 2;
  const scaledLH = { x: hpCenter + (lH.x - hpCenter) * fitMultiplier, y: lH.y };
  const scaledRH = { x: hpCenter + (rH.x - hpCenter) * fitMultiplier, y: rH.y };
  
  const kneeCenter = (lK.x + rK.x) / 2;
  const scaledLK = { x: kneeCenter + (lK.x - kneeCenter) * fitMultiplier, y: lK.y };
  const scaledRK = { x: kneeCenter + (rK.x - kneeCenter) * fitMultiplier, y: rK.y };

  const ankleCenter = (lA.x + rA.x) / 2;
  const scaledLA = { x: ankleCenter + (lA.x - ankleCenter) * fitMultiplier, y: lA.y };
  const scaledRA = { x: ankleCenter + (rA.x - ankleCenter) * fitMultiplier, y: rA.y };

  // Draw Pants/Jeans
  ctx.beginPath();
  
  // Waist line
  ctx.moveTo(scaledRH.x + 6, scaledRH.y - 15);
  ctx.lineTo(scaledLH.x - 6, scaledLH.y - 15);

  // Left Leg outer edge
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
    // Full pants
    // Left leg outer boundary
    ctx.quadraticCurveTo(scaledLH.x - 14, scaledLK.y, scaledLA.x - 10, scaledLA.y);
    // Left cuff
    ctx.lineTo(scaledLA.x + 10, scaledLA.y);
    
    // Crotch junction
    const crotch = { x: (scaledLH.x + scaledRH.x) / 2, y: (scaledLH.y + scaledRH.y) / 2 + (scaledLA.y - scaledLH.y) * 0.22 };
    ctx.quadraticCurveTo(scaledLK.x + 8, scaledLK.y, crotch.x, crotch.y);

    // Right leg inner boundary down to ankle
    ctx.quadraticCurveTo(scaledRK.x - 8, scaledRK.y, scaledRA.x - 10, scaledRA.y);
    // Right cuff
    ctx.lineTo(scaledRA.x + 10, scaledRA.y);

    // Right leg outer boundary up to waist
    ctx.quadraticCurveTo(scaledRH.x + 14, scaledRK.y, scaledRH.x + 6, scaledRH.y - 15);
  }

  ctx.closePath();
  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Denim shading/highlights
  if (config.texture === 'denim') {
    drawDenimDetails(ctx, scaledLH, scaledRH, scaledLK, scaledRK, scaledLA, scaledRA, isShorts);
  } else {
    drawPantsShading(ctx, scaledLH, scaledRH, scaledLK, scaledRK, scaledLA, scaledRA, isShorts);
  }
}

function drawFullBody(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Saree, Lehenga or Dress. Renders over shoulders down to ankles.
  const lS = p[11];
  const rS = p[12];

  if (lS.vis < 0.4 || rS.vis < 0.4) return;

  const config = item.renderConfig;
  const isSaree = item.subcategory.includes('Sarees');
  const isLehenga = item.subcategory.includes('Lehengas');

  if (isSaree) {
    drawSaree(ctx, p, config);
    return;
  }

  // Dynamic fit scaling
  let fitMultiplier = 1.0;
  if (m.bodyType === 'Plus Size') fitMultiplier = 1.25;
  else if (m.bodyType === 'Curvy') fitMultiplier = 1.2;
  else if (m.bodyType === 'Slim') fitMultiplier = 0.9;

  const shWidth = distance(lS, rS);

  // Fallbacks: If hips or legs are out of frame, project them down
  let lH = p[23];
  let rH = p[24];
  let lK = p[25];
  let rK = p[26];
  let lA = p[27];
  let rA = p[28];

  if (lH.vis < 0.5 || rH.vis < 0.5) {
    lH = { x: lS.x - shWidth * 0.1, y: lS.y + shWidth * 1.5, vis: 0.9 };
    rH = { x: rS.x + shWidth * 0.1, y: rS.y + shWidth * 1.5, vis: 0.9 };
  }
  if (lK.vis < 0.5) lK = { x: lH.x, y: lH.y + shWidth * 1.2, vis: 0.9 };
  if (rK.vis < 0.5) rK = { x: rH.x, y: rH.y + shWidth * 1.2, vis: 0.9 };
  if (lA.vis < 0.5) lA = { x: lK.x, y: lK.y + shWidth * 1.3, vis: 0.9 };
  if (rA.vis < 0.5) rA = { x: rK.x, y: rK.y + shWidth * 1.3, vis: 0.9 };

  // Apply scaling
  const shCenter = (lS.x + rS.x) / 2;
  const hpCenter = (lH.x + rH.x) / 2;
  
  const scaledLS = { x: shCenter + (lS.x - shCenter) * fitMultiplier, y: lS.y };
  const scaledRS = { x: shCenter + (rS.x - shCenter) * fitMultiplier, y: rS.y };
  const scaledLH = { x: hpCenter + (lH.x - hpCenter) * fitMultiplier, y: lH.y };
  const scaledRH = { x: hpCenter + (rH.x - hpCenter) * fitMultiplier, y: rH.y };

  // Draw Dress / Lehenga
  ctx.beginPath();
  
  // Shoulders and collar
  const shoulderMidX = (scaledLS.x + scaledRS.x) / 2;
  const shoulderMidY = (scaledLS.y + scaledRS.y) / 2;
  ctx.moveTo(scaledRS.x, scaledRS.y);
  ctx.quadraticCurveTo(shoulderMidX, shoulderMidY + 12, scaledLS.x, scaledLS.y);

  // Left torso down to waist
  ctx.quadraticCurveTo(scaledLS.x - 10, scaledLH.y * 0.7, scaledLH.x - 6, scaledLH.y);

  // Flare out bottom skirt
  const bottomY = lA.vis > 0.5 ? lA.y : lK.y + shWidth * 1.2;
  const leftFlareX = scaledLH.x - (isLehenga ? shWidth * 0.45 : shWidth * 0.2);
  const rightFlareX = scaledRH.x + (isLehenga ? shWidth * 0.45 : shWidth * 0.2);

  ctx.quadraticCurveTo(leftFlareX - 12, (scaledLH.y + bottomY) / 2, leftFlareX, bottomY);
  ctx.quadraticCurveTo((leftFlareX + rightFlareX) / 2, bottomY + 22, rightFlareX, bottomY);
  ctx.quadraticCurveTo(rightFlareX + 12, (scaledRH.y + bottomY) / 2, scaledRH.x + 6, scaledRH.y);

  // Right waist up to shoulder
  ctx.quadraticCurveTo(scaledRS.x + 10, scaledRH.y * 0.7, scaledRS.x, scaledRS.y);
  ctx.closePath();

  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Draw borders
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

  // Shading folds
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

  // 1. Draw blouse (top section)
  ctx.beginPath();
  ctx.moveTo(rS.x, rS.y);
  ctx.lineTo(lS.x, lS.y);
  ctx.lineTo(lS.x - 5, lS.y + 40);
  ctx.lineTo(rS.x + 5, rS.y + 40);
  ctx.closePath();
  ctx.fillStyle = config.secondaryColor || '#D4AF37';
  ctx.fill();

  // 2. Draw Pallu (drape over left shoulder down to ankle)
  ctx.beginPath();
  ctx.moveTo(lS.x - 12, lS.y);
  ctx.quadraticCurveTo((lS.x + rH.x) / 2, (lS.y + rH.y) / 2, rH.x + 12, rH.y + 20);
  ctx.quadraticCurveTo(rH.x + 32, bottomY * 0.75, rH.x + 22, bottomY);
  ctx.quadraticCurveTo(lH.x - 22, bottomY, lH.x - 32, bottomY * 0.8);
  ctx.quadraticCurveTo(lH.x - 18, lH.y, lS.x - 12, lS.y);
  ctx.closePath();
  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Draw gold border (zari)
  ctx.strokeStyle = config.secondaryColor || '#D4AF37';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(lS.x - 12, lS.y);
  ctx.quadraticCurveTo((lS.x + rH.x) / 2, (lS.y + rH.y) / 2, rH.x + 12, rH.y + 20);
  ctx.quadraticCurveTo(rH.x + 32, bottomY * 0.75, rH.x + 22, bottomY);
  ctx.stroke();

  // Draw folds
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(lS.x - 2 - i * 4, lS.y + 10);
    ctx.quadraticCurveTo((lS.x + rH.x) / 2 - i * 5, (lS.y + rH.y) / 2 + i * 10, rH.x + 12 - i * 3, rH.y + 80);
    ctx.stroke();
  }

  ctx.restore();
}

function drawOuterwear(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Blazer or Jacket. Open down the middle.
  const lS = p[11];
  const rS = p[12];
  const lH = p[23];
  const rH = p[24];
  const lW = p[15];
  const rW = p[16];

  if (lS.vis < 0.4 || rS.vis < 0.4) return;

  const config = item.renderConfig;
  const isLeather = config.texture === 'leather';

  // Draw left half of jacket
  ctx.beginPath();
  ctx.moveTo((lS.x + rS.x)/2 - 5, lS.y + 15);
  ctx.lineTo(lS.x, lS.y);
  ctx.lineTo(lW.x - 5, lW.y);
  ctx.lineTo(lH.x - 14, lH.y + 20);
  ctx.lineTo((lH.x + rH.x)/2 - 5, lH.y + 15);
  ctx.closePath();
  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Draw right half of jacket
  ctx.beginPath();
  ctx.moveTo((lS.x + rS.x)/2 + 5, lS.y + 15);
  ctx.lineTo(rS.x, rS.y);
  ctx.lineTo(rW.x + 5, rW.y);
  ctx.lineTo(rH.x + 14, rH.y + 20);
  ctx.lineTo((lH.x + rH.x)/2 + 5, lH.y + 15);
  ctx.closePath();
  ctx.fill();

  // Details
  ctx.strokeStyle = isLeather ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(lS.x, lS.y + 2);
  ctx.lineTo(interpolate(lS, lW, 0.4).x, interpolate(lS, lW, 0.4).y);
  ctx.stroke();

  // Draw lapels
  ctx.strokeStyle = config.secondaryColor || 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(lS.x - 5, lS.y);
  ctx.lineTo((lS.x + rS.x)/2 - 12, lS.y + 35);
  ctx.moveTo(rS.x + 5, rS.y);
  ctx.lineTo((lS.x + rS.x)/2 + 12, lS.y + 35);
  ctx.stroke();
}

function drawAccessory(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  const config = item.renderConfig;
  
  if (item.subcategory === 'Sunglasses') {
    const nose = p[0];
    const lE = p[2];
    const rE = p[5];
    if (lE.vis < 0.4 || rE.vis < 0.4) return;

    ctx.save();
    ctx.strokeStyle = config.baseColor;
    ctx.lineWidth = 3;
    ctx.fillStyle = config.secondaryColor || 'rgba(0,40,0,0.6)';

    const lensRadius = distance(lE, rE) * 0.45;

    // Left Lens
    ctx.beginPath();
    ctx.arc(lE.x, lE.y + 2, lensRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right Lens
    ctx.beginPath();
    ctx.arc(rE.x, rE.y + 2, lensRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bridge
    ctx.beginPath();
    ctx.moveTo(lE.x + lensRadius, lE.y + 2);
    ctx.lineTo(rE.x - lensRadius, rE.y + 2);
    ctx.stroke();

    // Glare
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lE.x - lensRadius + 5, lE.y + 5);
    ctx.lineTo(lE.x + 5, lE.y - lensRadius + 5);
    ctx.moveTo(rE.x - lensRadius + 5, rE.y + 5);
    ctx.lineTo(rE.x + 5, rE.y - lensRadius + 5);
    ctx.stroke();
    
    ctx.restore();
  }

  if (item.subcategory === 'Watches') {
    const lW = p[15];
    if (lW.vis < 0.5) return;

    ctx.save();
    ctx.fillStyle = config.baseColor;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(lW.x, lW.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Face
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
  if (lA.vis < 0.5 && rA.vis < 0.5) return;

  const config = item.renderConfig;

  ctx.save();
  ctx.fillStyle = config.baseColor;
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  
  if (lA.vis > 0.5) {
    ctx.beginPath();
    ctx.ellipse(lA.x, lA.y + 12, 14, 8, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();
  }
  if (rA.vis > 0.5) {
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

function drawTopCreases(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any, leftUnderarm: any, rUnder: any) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1.5;

  // Chest creases
  ctx.beginPath();
  ctx.moveTo(leftUnderarm.x + 10, leftUnderarm.y + 10);
  ctx.quadraticCurveTo((lS.x + rH.x)/2, (leftUnderarm.y + rH.y)/2, (lS.x + rS.x)/2 - 10, (lH.y + lS.y)/2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rUnder.x - 10, rUnder.y + 10);
  ctx.quadraticCurveTo((rS.x + lH.x)/2, (rUnder.y + lH.y)/2, (lS.x + rS.x)/2 + 10, (rH.y + rS.y)/2);
  ctx.stroke();

  // Highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo((lS.x + rS.x)/2, lS.y + 25);
  ctx.lineTo((lH.x + rH.x)/2, lH.y - 15);
  ctx.stroke();

  ctx.restore();
}

function drawDenimDetails(ctx: CanvasRenderingContext2D, lH: any, rH: any, lK: any, rK: any, lA: any, rA: any, isShorts: boolean) {
  ctx.save();
  ctx.strokeStyle = 'rgba(196, 154, 108, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  
  ctx.moveTo(rH.x + 4, rH.y - 11);
  ctx.lineTo(lH.x - 4, lH.y - 11);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1.5;
  if (!isShorts && lK.vis > 0.5) {
    ctx.beginPath();
    ctx.moveTo(lK.x - 8, lK.y - 10);
    ctx.quadraticCurveTo(lK.x, lK.y - 8, lK.x + 8, lK.y - 10);
    ctx.moveTo(lK.x - 6, lK.y + 5);
    ctx.quadraticCurveTo(lK.x, lK.y + 7, lK.x + 6, lK.y + 5);
    
    ctx.moveTo(rK.x - 8, rK.y - 10);
    ctx.quadraticCurveTo(rK.x, rK.y - 8, rK.x + 8, rK.y - 10);
    ctx.stroke();
  }

  // Gradient
  const grad = ctx.createLinearGradient((lH.x + rH.x)/2, lH.y, (lH.x + rH.x)/2, lA.y);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
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
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 2;
  
  if (!isShorts) {
    ctx.beginPath();
    ctx.moveTo(lH.x - 1, lH.y + 10);
    ctx.lineTo(lA.x, lA.y - 5);
    ctx.moveTo(rH.x + 1, rH.y + 10);
    ctx.lineTo(rA.x, rA.y - 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDressCreases(ctx: CanvasRenderingContext2D, lS: any, rS: any, lH: any, rH: any, bottomY: number, isLehenga: boolean) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;

  const segments = isLehenga ? 8 : 5;
  for (let i = 1; i < segments; i++) {
    const ratio = i / segments;
    const startPt = interpolate(lH, rH, ratio);
    const endX = lH.x - (isLehenga ? 50 : 20) + (rH.x - lH.x + (isLehenga ? 100 : 40)) * ratio;
    
    ctx.beginPath();
    ctx.moveTo(startPt.x, startPt.y);
    ctx.quadraticCurveTo(startPt.x + (endX - startPt.x) * 0.4, (startPt.y + bottomY) / 2, endX, bottomY);
    ctx.stroke();
  }
  ctx.restore();
}
