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

  // Convert normalized landmarks to canvas pixel coordinates
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
    
    // Apply clipping path for hand occlusion
    // If wrists are in front of the torso, we clip/exclude the hand regions from garment drawing
    applyHandOcclusion(ctx, leftHandPoints, rightHandPoints);

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
}

function applyHandOcclusion(ctx: CanvasRenderingContext2D, leftHand: any[], rightHand: any[]) {
  // If hand visibility is good, create a path around the hand and wrist to punch a hole in the clothing overlay
  // so the user's real hand/arm is visible in front.
  ctx.beginPath();
  
  // We want to clip the rest of the canvas but exclude hands. 
  // In Canvas, we can use standard composite operations: draw the garment, then clear hand pixels.
  // Actually, saving hand bounding paths and doing ctx.clip('evenodd') works, but a simpler
  // and highly reliable way is to draw the garment, and then run a destination-out clear path
  // for the hands *after* drawing! This avoids complex clipping math.
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

  // Erase left hand area
  if (leftWrist.vis > 0.5) {
    ctx.beginPath();
    const cx = (leftWrist.x + leftIndex.x + leftThumb.x + leftPinky.x) / 4;
    const cy = (leftWrist.y + leftIndex.y + leftThumb.y + leftPinky.y) / 4;
    // Hand radius
    const r = Math.max(25, distance(leftWrist, leftIndex) * 1.5);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Erase right hand area
  if (rightWrist.vis > 0.5) {
    ctx.beginPath();
    const cx = (rightWrist.x + rightIndex.x + rightThumb.x + rightPinky.x) / 4;
    const cy = (rightWrist.y + rightIndex.y + rightThumb.y + rightPinky.y) / 4;
    const r = Math.max(25, distance(rightWrist, rightIndex) * 1.5);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawTop(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Landmarks: 11: L Shoulder, 12: R Shoulder, 23: L Hip, 24: R Hip, 13: L Elbow, 14: R Elbow
  const lS = p[11];
  const rS = p[12];
  const lH = p[23];
  const rH = p[24];
  const lE = p[13];
  const rE = p[14];

  if (lS.vis < 0.5 || rS.vis < 0.5) return;

  const config = item.renderConfig;
  
  // Calculate midpoints for collar and hem
  const shoulderMidX = (lS.x + rS.x) / 2;
  const shoulderMidY = (lS.y + rS.y) / 2;
  const hipMidX = (lH.x + rH.x) / 2;
  const hipMidY = (lH.y + rH.y) / 2;

  // Sizing adjustments based on measurements:
  // We can scale the width of the shirt by the user's waist/chest measurements
  const chestOffsetMultiplier = (m.bodyType === 'Plus Size' || m.bodyType === 'Curvy') ? 1.2 : 1.05;
  const hemWidth = distance(lH, rH) * chestOffsetMultiplier;
  
  // Outer sleeve points
  const leftSleeveEnd = item.styleTags.includes('Oversized') 
    ? interpolate(lS, lE, 0.6) 
    : interpolate(lS, lE, 0.4);
  const rightSleeveEnd = item.styleTags.includes('Oversized') 
    ? interpolate(rS, rE, 0.6) 
    : interpolate(rS, rE, 0.4);

  // Draw main shirt body
  ctx.beginPath();
  
  // Neck Collar (dip curve)
  ctx.moveTo(rS.x, rS.y);
  ctx.quadraticCurveTo(shoulderMidX, shoulderMidY + 15, lS.x, lS.y);

  // Left sleeve sleeve outer
  ctx.lineTo(leftSleeveEnd.x, leftSleeveEnd.y);
  // Left sleeve sleeve cuff
  const leftUnderarm = { x: lS.x - (lS.x - lH.x) * 0.2, y: lS.y + (lH.y - lS.y) * 0.25 };
  ctx.lineTo(leftUnderarm.x - 10, leftUnderarm.y + 10);
  ctx.lineTo(leftUnderarm.x, leftUnderarm.y);

  // Left side seam down to waist
  ctx.quadraticCurveTo(lH.x - 10, interpolate(lS, lH, 0.6).y, lH.x - 5, lH.y + 5);

  // Bottom Hem
  ctx.quadraticCurveTo(hipMidX, hipMidY + 10, rH.x + 5, rH.y + 5);

  // Right side seam up to underarm
  ctx.quadraticCurveTo(rH.x + 10, interpolate(rS, rH, 0.6).y, rightUnderarm(rH, rS).x, rightUnderarm(rH, rS).y);
  
  const rUnder = rightUnderarm(rH, rS);
  // Right sleeve cuff
  ctx.lineTo(rightSleeveEnd.x + 10, rightSleeveEnd.y + 10);
  ctx.lineTo(rightSleeveEnd.x, rightSleeveEnd.y);
  
  ctx.closePath();

  // Fill shirt
  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Draw stripes or secondary color pattern if configured
  if (config.texture === 'stripes') {
    drawStripes(ctx, lS, rS, lH, rH, config.secondaryColor || '#FFFFFF');
  } else if (config.texture === 'plaid') {
    drawPlaid(ctx, lS, rS, lH, rH, config.baseColor, config.secondaryColor || '#000000');
  }

  // Creases & Shadows (Creases add realistic wrinkles)
  drawTopCreases(ctx, lS, rS, lH, rH, leftUnderarm, rUnder);

  // Logo Text (if applicable)
  if (config.logoText) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8;
    ctx.fillText(config.logoText, shoulderMidX, shoulderMidY + (lH.y - lS.y) * 0.3);
    ctx.restore();
  }

  // Handle hand occlusion post-render
  eraseHandsForOcclusion(ctx, p);
}

function rightUnderarm(rH: any, rS: any) {
  return { x: rS.x - (rS.x - rH.x) * 0.2, y: rS.y + (rH.y - rS.y) * 0.25 };
}

function drawBottom(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Landmarks: 23: L Hip, 24: R Hip, 25: L Knee, 26: R Knee, 27: L Ankle, 28: R Ankle
  const lH = p[23];
  const rH = p[24];
  const lK = p[25];
  const rK = p[26];
  const lA = p[27];
  const rA = p[28];

  if (lH.vis < 0.5 || rH.vis < 0.5) return;

  const config = item.renderConfig;
  const isShorts = item.subcategory.includes('Skirts') || item.subcategory.includes('Mini');

  // Let's draw Pants/Jeans
  ctx.beginPath();
  
  // Waist line
  ctx.moveTo(rH.x + 5, rH.y - 15);
  ctx.lineTo(lH.x - 5, lH.y - 15);

  // Left Leg outer edge
  if (isShorts) {
    const leftThighEnd = interpolate(lH, lK, 0.4);
    const rightThighEnd = interpolate(rH, rK, 0.4);
    const crotch = interpolate(lH, rH, 0.5);
    crotch.y += 15;

    ctx.lineTo(lH.x - 8, lH.y + 10);
    ctx.lineTo(leftThighEnd.x - 5, leftThighEnd.y);
    ctx.lineTo(crotch.x - 5, crotch.y);
    ctx.lineTo(rightThighEnd.x + 5, rightThighEnd.y);
    ctx.lineTo(rH.x + 8, rH.y + 10);
  } else {
    // Full pants
    const kneeL = lK.vis > 0.5 ? lK : interpolate(lH, lA, 0.5);
    const kneeR = rK.vis > 0.5 ? rK : interpolate(rH, rA, 0.5);
    const ankleL = lA.vis > 0.5 ? lA : interpolate(lH, lA, 0.95);
    const ankleR = rA.vis > 0.5 ? rA : interpolate(rH, rA, 0.95);

    // Left leg outer boundary
    ctx.quadraticCurveTo(lH.x - 12, kneeL.y, ankleL.x - 8, ankleL.y);
    // Left cuff
    ctx.lineTo(ankleL.x + 8, ankleL.y);
    
    // Crotch junction
    const crotch = { x: (lH.x + rH.x) / 2, y: (lH.y + rH.y) / 2 + (ankleL.y - lH.y) * 0.22 };
    ctx.quadraticCurveTo(kneeL.x + 6, kneeL.y, crotch.x, crotch.y);

    // Right leg inner boundary down to ankle
    ctx.quadraticCurveTo(kneeR.x - 6, kneeR.y, ankleR.x - 8, ankleR.y);
    // Right cuff
    ctx.lineTo(ankleR.x + 8, ankleR.y);

    // Right leg outer boundary up to waist
    ctx.quadraticCurveTo(rH.x + 12, kneeR.y, rH.x + 5, rH.y - 15);
  }

  ctx.closePath();
  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Denim shading/highlights
  if (config.texture === 'denim') {
    drawDenimDetails(ctx, lH, rH, lK, rK, lA, rA, isShorts);
  } else {
    drawPantsShading(ctx, lH, rH, lK, rK, lA, rA, isShorts);
  }

  eraseHandsForOcclusion(ctx, p);
}

function drawFullBody(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Saree, Lehenga or Dress. Renders over shoulders down to ankles.
  const lS = p[11];
  const rS = p[12];
  const lH = p[23];
  const rH = p[24];
  const lK = p[25];
  const rK = p[26];
  const lA = p[27];
  const rA = p[28];

  if (lS.vis < 0.5 || rS.vis < 0.5) return;

  const config = item.renderConfig;
  const isSaree = item.subcategory.includes('Sarees');
  const isLehenga = item.subcategory.includes('Lehengas');

  if (isSaree) {
    drawSaree(ctx, p, config);
    return;
  }

  // Draw Dress / Lehenga
  ctx.beginPath();
  
  // Shoulders and collar
  const shoulderMidX = (lS.x + rS.x) / 2;
  const shoulderMidY = (lS.y + rS.y) / 2;
  ctx.moveTo(rS.x, rS.y);
  ctx.quadraticCurveTo(shoulderMidX, shoulderMidY + 12, lS.x, lS.y);

  // Left torso down to waist
  ctx.quadraticCurveTo(lS.x - 8, lH.y * 0.7, lH.x - 5, lH.y);

  // Flare out bottom skirt for dresses/lehengas
  const bottomY = lA.vis > 0.5 ? lA.y : (lK.vis > 0.5 ? lK.y + 40 : lH.y + 150);
  const leftFlareX = lH.x - (isLehenga ? 60 : 25);
  const rightFlareX = rH.x + (isLehenga ? 60 : 25);

  ctx.quadraticCurveTo(leftFlareX - 10, (lH.y + bottomY) / 2, leftFlareX, bottomY);
  ctx.quadraticCurveTo((leftFlareX + rightFlareX) / 2, bottomY + 20, rightFlareX, bottomY);
  ctx.quadraticCurveTo(rightFlareX + 10, (rH.y + bottomY) / 2, rH.x + 5, rH.y);

  // Right waist up to shoulder
  ctx.quadraticCurveTo(rS.x + 8, rH.y * 0.7, rS.x, rS.y);
  ctx.closePath();

  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // If lehenga, draw border
  if (isLehenga && config.secondaryColor) {
    ctx.save();
    ctx.strokeStyle = config.secondaryColor;
    ctx.lineWidth = 14;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(leftFlareX, bottomY);
    ctx.quadraticCurveTo((leftFlareX + rightFlareX) / 2, bottomY + 20, rightFlareX, bottomY);
    ctx.stroke();
    ctx.restore();
  }

  // Shading folds
  drawDressCreases(ctx, lS, rS, lH, rH, bottomY, isLehenga);
  
  eraseHandsForOcclusion(ctx, p);
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
  ctx.fillStyle = config.secondaryColor || '#D4AF37'; // Blouse is gold or secondary
  ctx.fill();

  // 2. Draw Pallu (drape over left shoulder down to ankle)
  ctx.beginPath();
  ctx.moveTo(lS.x - 10, lS.y);
  ctx.quadraticCurveTo((lS.x + rH.x) / 2, (lS.y + rH.y) / 2, rH.x + 10, rH.y + 20);
  ctx.quadraticCurveTo(rH.x + 30, bottomY * 0.75, rH.x + 20, bottomY);
  ctx.quadraticCurveTo(lH.x - 20, bottomY, lH.x - 30, bottomY * 0.8);
  ctx.quadraticCurveTo(lH.x - 15, lH.y, lS.x - 10, lS.y);
  ctx.closePath();
  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Draw gold border (zari) on pallu
  ctx.strokeStyle = config.secondaryColor || '#D4AF37';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(lS.x - 10, lS.y);
  ctx.quadraticCurveTo((lS.x + rH.x) / 2, (lS.y + rH.y) / 2, rH.x + 10, rH.y + 20);
  ctx.quadraticCurveTo(rH.x + 30, bottomY * 0.75, rH.x + 20, bottomY);
  ctx.stroke();

  // Draw folds inside saree
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(lS.x - 2 - i * 4, lS.y + 10);
    ctx.quadraticCurveTo((lS.x + rH.x) / 2 - i * 5, (lS.y + rH.y) / 2 + i * 10, rH.x + 10 - i * 3, rH.y + 80);
    ctx.stroke();
  }

  ctx.restore();
  eraseHandsForOcclusion(ctx, p);
}

function drawOuterwear(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Blazer or Jacket. Open down the middle.
  const lS = p[11];
  const rS = p[12];
  const lH = p[23];
  const rH = p[24];
  const lE = p[13];
  const rE = p[14];
  const lW = p[15];
  const rW = p[16];

  if (lS.vis < 0.5 || rS.vis < 0.5) return;

  const config = item.renderConfig;
  const isLeather = config.texture === 'leather';

  // Draw left half of jacket
  ctx.beginPath();
  ctx.moveTo((lS.x + rS.x)/2 - 5, lS.y + 15);
  ctx.lineTo(lS.x, lS.y);
  ctx.lineTo(lW.x - 4, lW.y); // sleeve to wrist
  ctx.lineTo(lH.x - 12, lH.y + 20); // bottom hem
  ctx.lineTo((lH.x + rH.x)/2 - 5, lH.y + 15); // open lapel hem
  ctx.closePath();
  ctx.fillStyle = config.baseColor;
  ctx.fill();

  // Draw right half of jacket
  ctx.beginPath();
  ctx.moveTo((lS.x + rS.x)/2 + 5, lS.y + 15);
  ctx.lineTo(rS.x, rS.y);
  ctx.lineTo(rW.x + 4, rW.y); // sleeve to wrist
  ctx.lineTo(rH.x + 12, rH.y + 20);
  ctx.lineTo((lH.x + rH.x)/2 + 5, lH.y + 15);
  ctx.closePath();
  ctx.fill();

  // Draw shiny leather highlight or structured suit lines
  ctx.strokeStyle = isLeather ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  // highlight on left shoulder
  ctx.moveTo(lS.x, lS.y + 2);
  ctx.lineTo(interpolate(lS, lW, 0.4).x, interpolate(lS, lW, 0.4).y);
  ctx.stroke();

  // Draw lapels (collar fold)
  ctx.strokeStyle = config.secondaryColor || 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(lS.x - 5, lS.y);
  ctx.lineTo((lS.x + rS.x)/2 - 10, lS.y + 35);
  ctx.moveTo(rS.x + 5, rS.y);
  ctx.lineTo((lS.x + rS.x)/2 + 10, lS.y + 35);
  ctx.stroke();

  eraseHandsForOcclusion(ctx, p);
}

function drawAccessory(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  const config = item.renderConfig;
  
  if (item.subcategory === 'Sunglasses') {
    // Landmarks: 0: nose, 2: L eye inner, 5: R eye inner
    const nose = p[0];
    const lE = p[2];
    const rE = p[5];
    if (lE.vis < 0.4 || rE.vis < 0.4) return;

    ctx.save();
    ctx.strokeStyle = config.baseColor;
    ctx.lineWidth = 3;
    ctx.fillStyle = config.secondaryColor || 'rgba(0,40,0,0.6)'; // lens tint

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

    // Reflection glare on glasses
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
    // Wrap left wrist
    const lW = p[15];
    const lE = p[13];
    if (lW.vis < 0.5) return;

    // Draw watch dial centered on left wrist
    ctx.save();
    ctx.fillStyle = config.baseColor; // steel/gold
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(lW.x, lW.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dial face
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(lW.x, lW.y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

function drawShoes(ctx: CanvasRenderingContext2D, p: any[], item: Garment, m: ScanMeasurements) {
  // Ankle (27/28) and Heel/Toe coordinates
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

// Visual Helpers
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
  // Vertical lines
  for (let i = 1; i < segments; i++) {
    const ratio = i / segments;
    const topPt = interpolate(lS, rS, ratio);
    const botPt = interpolate(lH, rH, ratio);
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(botPt.x, botPt.y);
    ctx.stroke();
  }
  // Horizontal lines
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

  // Highlights on chest
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
  // Double-stitch lines (gold/tan)
  ctx.strokeStyle = 'rgba(196, 154, 108, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  
  // Waistband top stitch
  ctx.moveTo(rH.x + 4, rH.y - 11);
  ctx.lineTo(lH.x - 4, lH.y - 11);
  ctx.stroke();

  // Creases around knees (whiskering)
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1.5;
  if (!isShorts && lK.vis > 0.5) {
    // left knee whiskers
    ctx.beginPath();
    ctx.moveTo(lK.x - 8, lK.y - 10);
    ctx.quadraticCurveTo(lK.x, lK.y - 8, lK.x + 8, lK.y - 10);
    ctx.moveTo(lK.x - 6, lK.y + 5);
    ctx.quadraticCurveTo(lK.x, lK.y + 7, lK.x + 6, lK.y + 5);
    // right knee whiskers
    ctx.moveTo(rK.x - 8, rK.y - 10);
    ctx.quadraticCurveTo(rK.x, rK.y - 8, rK.x + 8, rK.y - 10);
    ctx.stroke();
  }

  // Denim vertical lighting gradient
  const grad = ctx.createLinearGradient((lH.x + rH.x)/2, lH.y, (lH.x + rH.x)/2, lA.y);
  grad.addColorStop(0, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(rH.x + 5, rH.y - 15);
  ctx.lineTo(lH.x - 5, lH.y - 15);
  // Re-draw outer edges to clip gradient
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
    // Crease lines down middle of legs (formal trousers style)
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

  // Draw vertical flowing drape lines starting from the waist/hips down to hem
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
