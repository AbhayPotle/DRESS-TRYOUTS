import { Outfit, Garment } from './outfitLibrary';

export interface ScanMeasurements {
  heightCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  shoulderWidthCm: number | null;
  armLengthCm: number | null;
  legLengthCm: number | null;
  bodyType: 'Slim' | 'Athletic' | 'Average' | 'Muscular' | 'Curvy' | 'Plus Size' | 'Tall' | 'Short' | 'Portrait (Sitting)';
}

export interface RecommendationFactors {
  skinTone: {
    hex: string;
    type: 'Cool Undertone' | 'Warm Undertone' | 'Neutral';
    paletteName: string;
    recommendedColors: string[];
  };
  measurements: ScanMeasurements;
  occasion: string;
  weather: 'sunny' | 'rainy' | 'cold' | 'cloudy';
  season: 'Summer' | 'Winter' | 'Autumn' | 'Spring';
  styleVibe?: 'elegant' | 'artistic' | 'casual';
}

/**
 * Calculates human body measurements in cm based on camera height and landmark coordinates ratios.
 * In a real mirror, we assume camera calibration factors relative to the user's distance and screen scale.
 */
export function calculateMeasurements(
  shoulderToShoulderPx: number,
  shoulderToHipPx: number,
  hipToAnklePx: number,
  shoulderToWristPx: number,
  hipWidthPx: number,
  waistWidthPx: number,
  chestWidthPx: number,
  scaleFactor: number
): ScanMeasurements {
  const totalVerticalPx = shoulderToHipPx + hipToAnklePx + (shoulderToHipPx * 0.4); // Add head/neck estimate
  const heightCm = Math.max(140, Math.min(210, Math.round(totalVerticalPx * scaleFactor)));
  const shoulderWidthCm = Math.max(34, Math.min(56, Math.round(shoulderToShoulderPx * scaleFactor * 2.2)));
  const armLengthCm = Math.round(shoulderToWristPx * scaleFactor);
  const legLengthCm = Math.round(hipToAnklePx * scaleFactor);
  
  // Circumferences are approximated using ellipse models (Circumference ≈ π * √((w^2 + d^2)/2))
  const chestCm = Math.max(70, Math.min(135, Math.round(chestWidthPx * scaleFactor * Math.PI * 1.15)));
  const waistCm = Math.max(60, Math.min(130, Math.round(waistWidthPx * scaleFactor * Math.PI * 1.1)));
  const hipCm = Math.max(70, Math.min(145, Math.round(hipWidthPx * scaleFactor * Math.PI * 1.18)));

  // Determine body shape classification
  let bodyType: ScanMeasurements['bodyType'] = 'Average';
  
  const waistToHipRatio = waistCm / hipCm;
  const shoulderToWaistRatio = shoulderWidthCm / waistCm;

  if (heightCm > 185) {
    bodyType = 'Tall';
  } else if (heightCm < 155) {
    bodyType = 'Short';
  } else if (shoulderToWaistRatio > 1.35) {
    bodyType = 'Muscular';
  } else if (waistCm > 100) {
    bodyType = 'Plus Size';
  } else if (waistToHipRatio < 0.72 && genderIsCurvy(waistToHipRatio)) {
    bodyType = 'Curvy';
  } else if (shoulderToWaistRatio > 1.2 && waistCm < 80) {
    bodyType = 'Athletic';
  } else if (waistCm < 70 && heightCm > 165) {
    bodyType = 'Slim';
  }

  return {
    heightCm,
    chestCm,
    waistCm,
    hipCm,
    shoulderWidthCm,
    armLengthCm,
    legLengthCm,
    bodyType
  };
}

function genderIsCurvy(waistToHipRatio: number): boolean {
  // Simple check helper
  return waistToHipRatio < 0.75;
}

/**
 * Samples camera pixels in the center-top facial area to identify skin tone
 * and classify them into Warm/Cool/Neutral palettes.
 */
export function analyzeSkinTone(r: number, g: number, b: number): RecommendationFactors['skinTone'] {
  const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  
  // Calculate warm/cool bias based on RGB components
  // Warm tones typically have higher red and gold/yellow values. Cool has higher pink/blue/fair grey undertones.
  const redGreenRatio = r / (g || 1);
  const blueGreenRatio = b / (g || 1);
  
  let type: RecommendationFactors['skinTone']['type'] = 'Neutral';
  let paletteName = 'Modern Neutral';
  let recommendedColors = ['#000000', '#FFFFFF', '#6C7A89', '#95A5A6', '#D4AC0D'];

  if (redGreenRatio > 1.15) {
    type = 'Warm Undertone';
    paletteName = 'Autumn Earth Tones';
    recommendedColors = [
      '#8B4513', // SaddleBrown
      '#D2B48C', // Tan
      '#4F5D2F', // Olive Green
      '#D4AF37', // Gold
      '#E07A5F', // Terracotta
      '#1D4438'  // Deep Forest
    ];
  } else if (blueGreenRatio > 0.95 || redGreenRatio < 1.05) {
    type = 'Cool Undertone';
    paletteName = 'Winter Jewel Tones';
    recommendedColors = [
      '#10254C', // Royal Blue
      '#800020', // Burgundy
      '#4A154B', // Plum
      '#004D4D', // Teal
      '#FAFAFA', // Pure White
      '#C0C0C0'  // Silver
    ];
  } else {
    type = 'Neutral';
    paletteName = 'Soft Spring Pastels';
    recommendedColors = [
      '#93B5C6', // Soft Blue
      '#E6D5B8', // Sand
      '#FFC4DD', // Blush Pink
      '#ADC2A9', // Sage Green
      '#EBEBEB', // Light Grey
      '#4A4A4A'  // Charcoal
    ];
  }

  return {
    hex,
    type,
    paletteName,
    recommendedColors
  };
}

/**
 * Ranks and recommends outfits from the library based on user's metrics,
 * occasion, weather, and computed style matches.
 */
export function getAIRecommendations(
  outfits: Outfit[],
  factors: RecommendationFactors
): Outfit[] {
  return outfits
    .map(outfit => {
      let score = 0;

      // 1. Weather / Occasion Match (Weight: 40 points)
      if (outfit.category.toLowerCase() === factors.occasion.toLowerCase()) {
        score += 25;
      }
      
      // Match seasonal styles
      if (factors.season === 'Summer' && ['Casual', 'Vacation', 'Travel'].includes(outfit.category)) {
        score += 10;
      } else if (factors.season === 'Winter' && ['Winter', 'Streetwear'].includes(outfit.category)) {
        score += 10;
      }

      // 2. Color Palette Match (Weight: 30 points)
      // Check if the outfit contains items that match the user's recommended skin-tone colors
      let colorMatches = 0;
      outfit.items.forEach(item => {
        const itemColor = item.renderConfig.baseColor.toUpperCase();
        const isMatch = factors.skinTone.recommendedColors.some(recColor => {
          // simple check if color hex is similar or matches
          return recColor.toUpperCase() === itemColor;
        });
        if (isMatch) colorMatches++;
      });
      score += (colorMatches / outfit.items.length) * 30;

      // 3. Body Type Optimization (Weight: 30 points)
      // Recommend structured outfits for different shapes
      const styleTags = outfit.styleTags.map(t => t.toLowerCase());
      if (factors.measurements.bodyType === 'Slim' || factors.measurements.bodyType === 'Short') {
        // Slim/Short users look great in Slim Fit, Tailored, cropped items
        if (styleTags.includes('slim fit') || styleTags.includes('tailored') || styleTags.includes('crop')) {
          score += 15;
        }
      } else if (factors.measurements.bodyType === 'Muscular' || factors.measurements.bodyType === 'Tall') {
        // Muscular/Tall users look great in Oversized, Box Fit, Baggy cargo styles
        if (styleTags.includes('oversized') || styleTags.includes('baggy') || styleTags.includes('boxy')) {
          score += 15;
        }
      } else if (factors.measurements.bodyType === 'Plus Size' || factors.measurements.bodyType === 'Curvy') {
        // Curvy/Plus Size users look amazing in wide leg, relaxed fits, elegant drapes (Sarees/A-line/Empire)
        if (styleTags.includes('wide leg') || styleTags.includes('relaxed') || styleTags.includes('silk') || styleTags.includes('traditional')) {
          score += 15;
        }
      }

      // Slightly penalize heavy outerwear in hot summer weather
      if (factors.weather === 'sunny' && styleTags.includes('winter') || styleTags.includes('puffer') || styleTags.includes('leather')) {
        score -= 15;
      }

      // 4. Style Personality Vibe Match (Weight: 35 points!)
      if (factors.styleVibe) {
        const styleTags = outfit.styleTags.map(t => t.toLowerCase());
        const catLower = outfit.category.toLowerCase();
        if (factors.styleVibe === 'elegant') {
          // Elegant/Classic vibe looks for tailored, traditional, formal, blazer, silk, luxury, classic, suit, shirt
          const matches = ['traditional', 'formal', 'wedding', 'silk', 'leather', 'tailored', 'blazer', 'luxury', 'classic', 'suit', 'tuxedo', 'gown', 'saree', 'lehenga', 'shirt'];
          const matchCount = styleTags.filter(t => matches.includes(t)).length;
          if (matchCount > 0) score += 25 + Math.min(20, matchCount * 6);
          if (catLower === 'traditional' || catLower === 'formal' || catLower === 'luxury' || catLower === 'business') score += 15;
          
          // Strongly penalize casual hoodies, t-shirts, joggers, and shorts for elegant/classic recommendations
          const hasCasualItem = outfit.items.some(item => {
            const sub = item.subcategory.toLowerCase();
            const name = item.name.toLowerCase();
            return sub.includes('t-shirt') || sub.includes('hoodie') || sub.includes('jogger') || sub.includes('shorts') || name.includes('tee') || name.includes('hoodie');
          });
          if (hasCasualItem) {
            score -= 45;
          }
        } else if (factors.styleVibe === 'artistic') {
          // Artistic vibe looks for tie-dye, floral, creative, colorful, streetwear, oversized, boho
          const matches = ['artistic', 'floral', 'tie-dye', 'pattern', 'oversized', 'streetwear', 'colorful', 'boho'];
          const matchCount = styleTags.filter(t => matches.includes(t)).length;
          if (matchCount > 0) score += 20 + Math.min(15, matchCount * 5);
          if (catLower === 'streetwear' || catLower === 'vacation') score += 10;
        } else if (factors.styleVibe === 'casual') {
          // Casual vibe looks for casual, denim, cotton, relaxed, staples, minimal
          const matches = ['casual', 'denim', 'cotton', 'relaxed', 'staples', 'minimalist', 'utility', 'polo'];
          const matchCount = styleTags.filter(t => matches.includes(t)).length;
          if (matchCount > 0) score += 20 + Math.min(15, matchCount * 5);
          if (catLower === 'casual' || catLower === 'sporty') score += 10;
        }
      }

      return { outfit, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.outfit);
}

export function getRecommendedSize(m: ScanMeasurements, gender: 'male' | 'female' | string): 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' {
  const isFemale = gender.includes('woman') || gender.includes('girl') || gender.includes('female');
  const chest = m.chestCm || 92;
  
  if (isFemale) {
    if (chest < 82) return 'XS';
    if (chest < 88) return 'S';
    if (chest < 96) return 'M';
    if (chest < 104) return 'L';
    if (chest < 112) return 'XL';
    return 'XXL';
  } else {
    if (chest < 90) return 'XS';
    if (chest < 96) return 'S';
    if (chest < 104) return 'M';
    if (chest < 112) return 'L';
    if (chest < 120) return 'XL';
    return 'XXL';
  }
}
