export interface Garment {
  id: string;
  name: string;
  type: 'top' | 'bottom' | 'full' | 'outerwear' | 'shoes' | 'accessory';
  category: string; // Casual, Streetwear, Luxury, Business, Traditional, Y2K, etc.
  subcategory: string;
  gender: 'man' | 'woman' | 'boy' | 'girl' | 'unisex';
  colors: string[]; // Hex codes or color names
  price: number;
  rating: number;
  styleTags: string[];
  description: string;
  // Vector render coordinates mapping relative to pose keypoints
  renderConfig: {
    baseColor: string;
    secondaryColor?: string;
    texture?: 'plain' | 'denim' | 'stripes' | 'plaid' | 'leather' | 'knitted' | 'gold' | 'silver' | 'silk' | 'brocade' | 'artistic' | 'sequins';
    opacity?: number;
    logoText?: string;
    patternScale?: number;
  };
}

export interface Outfit {
  id: string;
  name: string;
  gender: 'man' | 'woman' | 'boy' | 'girl';
  category: string;
  styleTags: string[];
  items: Garment[];
  description: string;
  totalPrice: number;
}

// Base Garment templates that can be combined and customized
export const BASE_GARMENTS: Garment[] = [
  // --- MEN'S TOPS ---
  {
    id: 'm_top_oversized_black',
    name: 'Oversized Heavyweight Tee',
    type: 'top',
    category: 'Streetwear',
    subcategory: 'T-Shirts',
    gender: 'man',
    colors: ['#0A0A0A', '#FFFFFF', '#4A4A4A', '#2D3A2F'],
    price: 49,
    rating: 4.8,
    styleTags: ['Oversized', 'Heavyweight', 'Box Fit', 'Minimalist'],
    description: 'A boxy, heavyweight cotton tee designed for supreme comfort and streetwear style.',
    renderConfig: { baseColor: '#0A0A0A', texture: 'plain', logoText: 'ESSENTIAL' }
  },
  {
    id: 'm_top_oxford_blue',
    name: 'Oxford Slim Fit Shirt',
    type: 'top',
    category: 'Business',
    subcategory: 'Shirts',
    gender: 'man',
    colors: ['#D6E4F0', '#FFFFFF', '#1F3C88'],
    price: 79,
    rating: 4.6,
    styleTags: ['Slim Fit', 'Classic', 'Office', 'Elegant'],
    description: 'Tailored premium cotton Oxford shirt suitable for smart-casual and formal styling.',
    renderConfig: { baseColor: '#93B5C6', texture: 'plain' }
  },
  {
    id: 'm_top_cuban_printed',
    name: 'Cuban Collar Printed Shirt',
    type: 'top',
    category: 'Vacation',
    subcategory: 'Shirts',
    gender: 'man',
    colors: ['#E3B7A3', '#D3E4CD', '#ADC2A9'],
    price: 65,
    rating: 4.7,
    styleTags: ['Relaxed Fit', 'Cuban Collar', 'Linen', 'Summer'],
    description: 'Breathable linen blend shirt with a retro Cuban collar and soft botanical prints.',
    renderConfig: { baseColor: '#E6D5B8', secondaryColor: '#4A5B4E', texture: 'stripes' }
  },
  {
    id: 'm_top_flannel_red',
    name: 'Classic Plaid Flannel',
    type: 'top',
    category: 'Casual',
    subcategory: 'Shirts',
    gender: 'man',
    colors: ['#B20606', '#000000', '#1C6DD0'],
    price: 55,
    rating: 4.5,
    styleTags: ['Regular Fit', 'Plaid', 'Grunge', 'Winter'],
    description: 'Thick, warm cotton flannel shirt with a timeless red and black plaid pattern.',
    renderConfig: { baseColor: '#8B0000', secondaryColor: '#000000', texture: 'plaid' }
  },
  {
    id: 'm_top_kurta_white',
    name: 'Linen Kurta',
    type: 'top',
    category: 'Traditional',
    subcategory: 'Kurta',
    gender: 'man',
    colors: ['#FFFFFF', '#E6C45E', '#1D4438'],
    price: 70,
    rating: 4.9,
    styleTags: ['Linen', 'Festive', 'Traditional', 'Ethnic'],
    description: 'Premium white linen kurta with detailed embroidery around the collar.',
    renderConfig: { baseColor: '#F5F5F5', secondaryColor: '#D4AF37', texture: 'plain' }
  },
  {
    id: 'm_top_henley_grey',
    name: 'Henley Long-Sleeve Shirt',
    type: 'top',
    category: 'Casual',
    subcategory: 'Shirts',
    gender: 'man',
    colors: ['#636E72', '#2D3436', '#B2BEC3'],
    price: 45,
    rating: 4.6,
    styleTags: ['Henley', 'Regular Fit', 'Ribbed', 'Waffle Knit'],
    description: 'A cozy cotton Henley shirt featuring a classic 3-button placket and ribbed fabric.',
    renderConfig: { baseColor: '#636E72', texture: 'knitted' }
  },
  {
    id: 'm_top_polo_navy',
    name: 'Classic Polo Collar Tee',
    type: 'top',
    category: 'Business',
    subcategory: 'T-Shirts',
    gender: 'man',
    colors: ['#0F81C4', '#FFFFFF', '#0A0A0A'],
    price: 49,
    rating: 4.7,
    styleTags: ['Polo', 'Pique', 'Sporty', 'Smart Casual'],
    description: 'Timeless pique knit polo shirt featuring contrasting collar tipping and custom branding.',
    renderConfig: { baseColor: '#0F4C81', secondaryColor: '#FFFFFF', texture: 'plain' }
  },
  {
    id: 'm_top_hawaiian_floral',
    name: 'Hawaiian Floral Summer Shirt',
    type: 'top',
    category: 'Vacation',
    subcategory: 'Shirts',
    gender: 'man',
    colors: ['#FF7675', '#0984E3', '#00B894'],
    price: 52,
    rating: 4.8,
    styleTags: ['Floral', 'Hawaiian', 'Vacation', 'Summer'],
    description: 'Vibrant tropical flower pattern camp shirt designed to keep you cool under the sun.',
    renderConfig: { baseColor: '#D63031', secondaryColor: '#FDCB6E', texture: 'stripes' }
  },
  {
    id: 'm_top_mandarin_white',
    name: 'Mandarin Collar Linen Shirt',
    type: 'top',
    category: 'Luxury',
    subcategory: 'Shirts',
    gender: 'man',
    colors: ['#FFFFFF', '#DFE6E9', '#2C3E50'],
    price: 75,
    rating: 4.9,
    styleTags: ['Mandarin Collar', 'Linen', 'Luxury', 'Clean Fit'],
    description: 'A sophisticated collarless shirt tailored from breathable linen for an effortless resort feel.',
    renderConfig: { baseColor: '#FAFAFA', texture: 'plain' }
  },

  // --- MEN'S BOTTOMS ---
  {
    id: 'm_bot_cargo_olive',
    name: 'Loose Fit Cargo Pants',
    type: 'bottom',
    category: 'Streetwear',
    subcategory: 'Pants',
    gender: 'man',
    colors: ['#3A5035', '#0E0E0E', '#C0A080'],
    price: 89,
    rating: 4.7,
    styleTags: ['Baggy', 'Cargo', 'Techwear', 'Utility'],
    description: 'Durable cotton-twill cargo pants featuring multi-pocket utility utility straps.',
    renderConfig: { baseColor: '#4F5D2F', texture: 'plain' }
  },
  {
    id: 'm_bot_denim_straight',
    name: 'Classic Straight Leg Jeans',
    type: 'bottom',
    category: 'Casual',
    subcategory: 'Jeans',
    gender: 'man',
    colors: ['#2B4C7E', '#1A1A1A', '#607274'],
    price: 99,
    rating: 4.8,
    styleTags: ['Straight', 'Raw Denim', 'Vintage', 'Everyday'],
    description: 'High-quality Japanese selvedge denim jeans cut in a clean, straight profile.',
    renderConfig: { baseColor: '#2C5E8A', texture: 'denim' }
  },
  {
    id: 'm_bot_chinos_khaki',
    name: 'Slim Fit Stretch Chinos',
    type: 'bottom',
    category: 'Business',
    subcategory: 'Pants',
    gender: 'man',
    colors: ['#C3B091', '#2C3E50', '#7F8C8D'],
    price: 69,
    rating: 4.6,
    styleTags: ['Slim Fit', 'Chinos', 'Smart Casual', 'Office'],
    description: 'Versatile stretch cotton chinos with a modern tapered leg and clean finish.',
    renderConfig: { baseColor: '#D2B48C', texture: 'plain' }
  },

  // --- MEN'S OUTERWEAR ---
  {
    id: 'm_out_leather_biker',
    name: 'Classic Leather Biker Jacket',
    type: 'outerwear',
    category: 'Luxury',
    subcategory: 'Jackets',
    gender: 'man',
    colors: ['#111111', '#4A3B32'],
    price: 299,
    rating: 4.9,
    styleTags: ['Leather', 'Biker', 'Vintage', 'Premium'],
    description: 'Heavyweight full-grain leather jacket with metallic zippers and asymmetric lapels.',
    renderConfig: { baseColor: '#1A1A1A', texture: 'leather' }
  },
  {
    id: 'm_out_blazer_navy',
    name: 'Tailored Wool Blazer',
    type: 'outerwear',
    category: 'Luxury',
    subcategory: 'Jackets',
    gender: 'man',
    colors: ['#0B1B3D', '#2B2B2B'],
    price: 189,
    rating: 4.8,
    styleTags: ['Tailored', 'Blazer', 'Formal', 'Office'],
    description: 'Sartorial single-breasted blazer in structured wool-blend fabric with gold buttons.',
    renderConfig: { baseColor: '#10254C', secondaryColor: '#D4AF37', texture: 'plain' }
  },

  // --- WOMEN'S TOPS ---
  {
    id: 'w_top_crop_white',
    name: 'Ribbed Knit Crop Top',
    type: 'top',
    category: 'Casual',
    subcategory: 'Crop Tops',
    gender: 'woman',
    colors: ['#FFFFFF', '#0A0A0A', '#E0A899', '#B5C99A'],
    price: 29,
    rating: 4.7,
    styleTags: ['Crop', 'Ribbed', 'Knit', 'Y2K'],
    description: 'Sleek, body-hugging ribbed knit halter top perfect for layering or warm days.',
    renderConfig: { baseColor: '#FAFAFA', texture: 'knitted' }
  },
  {
    id: 'w_top_oversized_shirt',
    name: 'Boyfriend Linen Shirt',
    type: 'top',
    category: 'Vacation',
    subcategory: 'Oversized Shirts',
    gender: 'woman',
    colors: ['#FFFFFF', '#D9D7F1', '#FFD3B6'],
    price: 59,
    rating: 4.8,
    styleTags: ['Oversized', 'Linen', 'Minimalist', 'Summer'],
    description: 'Lightweight linen shirt featuring an ultra-relaxed, airy silhouette.',
    renderConfig: { baseColor: '#EBEBEB', texture: 'plain' }
  },
  {
    id: 'w_top_kurti_floral',
    name: 'Chanderi Silk Kurti',
    type: 'top',
    category: 'Traditional',
    subcategory: 'Kurtis',
    gender: 'woman',
    colors: ['#E84545', '#903749', '#FFD369'],
    price: 69,
    rating: 4.9,
    styleTags: ['Floral', 'Silk', 'Traditional', 'Festive'],
    description: 'Elegant silk kurti with intricate floral motifs and gold zari border details.',
    renderConfig: { baseColor: '#D63031', secondaryColor: '#FFD700', texture: 'plain' }
  },
  {
    id: 'w_top_silk_satin',
    name: 'Silk Satin Wrap Blouse',
    type: 'top',
    category: 'Luxury',
    subcategory: 'Blouses',
    gender: 'woman',
    colors: ['#E84393', '#FFFFFF', '#2D3436'],
    price: 68,
    rating: 4.8,
    styleTags: ['Silk', 'Satin', 'Luxury', 'Elegant'],
    description: 'Luxurious silk satin blouse featuring a wrap bodice and elegant cuffed bishop sleeves.',
    renderConfig: { baseColor: '#D63031', texture: 'silk' }
  },
  {
    id: 'w_top_tiedye_pink',
    name: 'Tie-Dye Summer Tee',
    type: 'top',
    category: 'Casual',
    subcategory: 'T-Shirts',
    gender: 'woman',
    colors: ['#FF7675', '#74B9FF', '#FFEAA7'],
    price: 32,
    rating: 4.5,
    styleTags: ['Tie-Dye', 'Relaxed Fit', 'Cotton', 'Summer'],
    description: 'Fun, pastel tie-dye crop tee made of ultra-soft organic combed cotton.',
    renderConfig: { baseColor: '#E84393', secondaryColor: '#FFEAA7', texture: 'stripes' }
  },
  {
    id: 'w_top_offshoulder_black',
    name: 'Off-Shoulder Ribbed Top',
    type: 'top',
    category: 'Streetwear',
    subcategory: 'Tops',
    gender: 'woman',
    colors: ['#0A0A0A', '#FFFFFF', '#6C5CE7'],
    price: 38,
    rating: 4.6,
    styleTags: ['Off-Shoulder', 'Ribbed', 'Chic', 'Night Out'],
    description: 'Fashionable fold-over off-the-shoulder ribbed top that defines collarbones.',
    renderConfig: { baseColor: '#0A0A0A', texture: 'knitted' }
  },

  // --- WOMEN'S BOTTOMS ---
  {
    id: 'w_bot_wide_denim',
    name: 'High Waist Wide Leg Jeans',
    type: 'bottom',
    category: 'Streetwear',
    subcategory: 'Jeans',
    colors: ['#4E89AE', '#142850', '#2E3944'],
    gender: 'woman',
    price: 89,
    rating: 4.8,
    styleTags: ['High Waist', 'Wide Leg', 'Retro', 'Comfort'],
    description: 'Vintage-inspired high-waisted denim jeans featuring a flattering wide-leg cut.',
    renderConfig: { baseColor: '#3B7A57', texture: 'denim' }
  },
  {
    id: 'w_bot_cargo_black',
    name: 'Tech Utility Cargo Pants',
    type: 'bottom',
    category: 'Streetwear',
    subcategory: 'Cargo Pants',
    gender: 'woman',
    colors: ['#0A0A0A', '#394A51', '#7286D3'],
    price: 79,
    rating: 4.6,
    styleTags: ['Cargo', 'Techwear', 'Streetwear', 'Tapered'],
    description: 'Urban utility pants with oversized pockets, elastic cuffs, and high waist rise.',
    renderConfig: { baseColor: '#121212', texture: 'plain' }
  },
  {
    id: 'w_bot_skirt_satin',
    name: 'Satin Midi Skirt',
    type: 'bottom',
    category: 'Luxury',
    subcategory: 'Maxi Skirts',
    gender: 'woman',
    colors: ['#D7C49E', '#343148', '#8B5A2B'],
    price: 75,
    rating: 4.7,
    styleTags: ['Midi', 'Satin', 'Elegant', 'Chic'],
    description: 'High-waisted bias cut satin skirt that drapes beautifully over body contours.',
    renderConfig: { baseColor: '#C5A880', texture: 'plain' }
  },

  // --- WOMEN'S FULL BODY ---
  {
    id: 'w_full_bodycon_black',
    name: 'Ribbed Knit Bodycon Dress',
    type: 'full',
    category: 'Party',
    subcategory: 'Bodycon Dresses',
    gender: 'woman',
    colors: ['#0F0F0F', '#7D1C1C', '#1D3557'],
    price: 110,
    rating: 4.8,
    styleTags: ['Bodycon', 'Knit', 'Mini', 'Cocktail'],
    description: 'A stunning bodycon mini dress designed to define and hug your silhouette.',
    renderConfig: { baseColor: '#111111', texture: 'knitted' }
  },
  {
    id: 'w_full_saree_silk',
    name: 'Banarasi Silk Saree',
    type: 'full',
    category: 'Traditional',
    subcategory: 'Sarees',
    gender: 'woman',
    colors: ['#990000', '#004d4d', '#4a154b'],
    price: 240,
    rating: 5.0,
    styleTags: ['Silk', 'Traditional', 'Banarasi', 'Wedding'],
    description: 'Luxury gold-woven Banarasi silk saree with ornate floral border borders.',
    renderConfig: { baseColor: '#800020', secondaryColor: '#FFD700', texture: 'brocade' }
  },
  {
    id: 'w_full_lehenga_choli',
    name: 'Floral Embroidered Lehenga',
    type: 'full',
    category: 'Traditional',
    subcategory: 'Lehengas',
    gender: 'woman',
    colors: ['#FF66B2', '#40E0D0', '#E6E6FA'],
    price: 320,
    rating: 4.9,
    styleTags: ['Traditional', 'Lehenga', 'Embroidery', 'Festive'],
    description: 'Stunning three-piece lehenga choli set with dense mirror and floral thread work.',
    renderConfig: { baseColor: '#FF1493', secondaryColor: '#FFE4E1', texture: 'brocade' }
  },

  // --- ACCESSORIES ---
  {
    id: 'acc_sunglasses_aviator',
    name: 'Hexagonal Gold Aviators',
    type: 'accessory',
    category: 'Luxury',
    subcategory: 'Sunglasses',
    gender: 'unisex',
    colors: ['#D4AF37'],
    price: 150,
    rating: 4.9,
    styleTags: ['Gold', 'Hexagonal', 'Retro', 'Premium'],
    description: 'Premium lightweight metal aviators featuring dark green tinted UV lenses.',
    renderConfig: { baseColor: '#FFD700', secondaryColor: '#006400', texture: 'gold' }
  },
  {
    id: 'acc_watch_silver',
    name: 'Chronograph Steel Watch',
    type: 'accessory',
    category: 'Luxury',
    subcategory: 'Watches',
    gender: 'unisex',
    colors: ['#C0C0C0'],
    price: 250,
    rating: 4.8,
    styleTags: ['Steel', 'Classic', 'Waterproof', 'Office'],
    description: 'A timeless automatic watch crafted in brushed surgical-grade stainless steel.',
    renderConfig: { baseColor: '#C0C0C0', texture: 'silver' }
  },
  {
    id: 'acc_bag_leather',
    name: 'Structured Leather Crossbody',
    type: 'accessory',
    category: 'Luxury',
    subcategory: 'Handbags',
    gender: 'woman',
    colors: ['#5C4033', '#000000'],
    price: 195,
    rating: 4.7,
    styleTags: ['Leather', 'Saddle Bag', 'Elegant', 'Everyday'],
    description: 'Crafted from Italian pebbled leather with a gold buckle and adjustable strap.',
    renderConfig: { baseColor: '#8B4513', secondaryColor: '#FFD700', texture: 'leather' }
  },

  // --- SHOES ---
  {
    id: 'shoes_sneakers_retro',
    name: 'Retro Leather Court Sneakers',
    type: 'shoes',
    category: 'Streetwear',
    subcategory: 'Sneakers',
    gender: 'unisex',
    colors: ['#FFFFFF', '#1A1A1A'],
    price: 110,
    rating: 4.7,
    styleTags: ['Leather', 'Minimalist', 'Retro', 'Comfort'],
    description: 'Clean low-top sneakers in premium calfskin leather with a vintage gum sole.',
    renderConfig: { baseColor: '#FFFFFF', secondaryColor: '#D2B48C', texture: 'plain' }
  },
  {
    id: 'shoes_boots_chelsea',
    name: 'Suede Chelsea Boots',
    type: 'shoes',
    category: 'Luxury',
    subcategory: 'Boots',
    gender: 'unisex',
    colors: ['#8B7355', '#2B2B2B'],
    price: 180,
    rating: 4.8,
    styleTags: ['Suede', 'Chelsea', 'Slip-on', 'Classic'],
    description: 'Premium Italian suede Chelsea boots with flexible side panels and crepe soles.',
    renderConfig: { baseColor: '#A0522D', texture: 'plain' }
  },
  {
    id: 'm_top_artistic_paint',
    name: 'Abstract Paint Splatter Tee',
    type: 'top',
    category: 'Streetwear',
    subcategory: 'T-Shirts',
    gender: 'unisex',
    colors: ['#0A0A0A', '#FFFFFF'],
    price: 55,
    rating: 4.9,
    styleTags: ['Artistic', 'Paint Splatter', 'Streetwear', 'Oversized', 'Colorful'],
    description: 'A premium heavy-weight cotton tee featuring abstract hand-painted brushstroke splash patterns.',
    renderConfig: { baseColor: '#0A0A0A', secondaryColor: '#EC4899', texture: 'artistic' }
  },
  {
    id: 'w_full_artistic_dress',
    name: 'Artistic Paint Splash Dress',
    type: 'full',
    category: 'Vacation',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#FFFFFF', '#EC4899', '#3B82F6'],
    price: 135,
    rating: 4.9,
    styleTags: ['Artistic', 'Boho', 'Maxi', 'Paint Splatter', 'Colorful'],
    description: 'A beautiful flowing maxi dress printed with wavy abstract designer brushstrokes.',
    renderConfig: { baseColor: '#FFFFFF', secondaryColor: '#EC4899', texture: 'artistic' }
  },
  {
    id: 'w_full_sequin_gold',
    name: 'Glitzy Gold Sequin Dress',
    type: 'full',
    category: 'Party',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#D4AF37', '#FFDF00', '#B8860B'],
    price: 290,
    rating: 5.0,
    styleTags: ['Sequin', 'Maxi', 'Runway', 'Glow', 'Glitter', 'Luxury'],
    description: 'An absolute show-stopper maxi gown drenched in hundreds of hand-stitched gold sequins that shimmer under lights.',
    renderConfig: { baseColor: '#D4AF37', secondaryColor: '#FFFFFF', texture: 'sequins' }
  },
  {
    id: 'w_full_sequin_silver',
    name: 'Starlight Silver Sequin Gown',
    type: 'full',
    category: 'Party',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#E6E6FA', '#FFFFFF', '#A9A9A9'],
    price: 320,
    rating: 4.9,
    styleTags: ['Sequin', 'Maxi', 'Runway', 'Glow', 'Glitter', 'Luxury', 'V-Neck'],
    description: 'A breathtaking runway sequin dress that glints with starlight silver shimmer. Features an elegant V-neck cut.',
    renderConfig: { baseColor: '#E6E6FA', secondaryColor: '#FFFFFF', texture: 'sequins' }
  },
  {
    id: 'w_full_royal_brocade',
    name: 'Royal Emerald Zari Brocade Lehenga',
    type: 'full',
    category: 'Traditional',
    subcategory: 'Lehengas',
    gender: 'woman',
    colors: ['#1B4D3E', '#D4AF37', '#0F2C20'],
    price: 420,
    rating: 5.0,
    styleTags: ['Brocade', 'Traditional', 'Lehenga', 'Luxury', 'Embroidery'],
    description: 'A magnificent lehenga choli made of heavy silk brocade with detailed hand-woven gold zari embroidery borders.',
    renderConfig: { baseColor: '#1B4D3E', secondaryColor: '#D4AF37', texture: 'brocade' }
  },
  {
    id: 'w_full_ruby_silk',
    name: 'Ruby Red Silk Wrap Dress',
    type: 'full',
    category: 'Party',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#B31B1B', '#D4AF37', '#7A0A0A'],
    price: 195,
    rating: 4.8,
    styleTags: ['Silk', 'Elegant', 'Maxi', 'Luxury', 'V-Neck'],
    description: 'A luxurious ruby red silk wrap gown with a dynamic overhead shimmer sheen and a plunging V-neck collar.',
    renderConfig: { baseColor: '#B31B1B', secondaryColor: '#D4AF37', texture: 'silk' }
  },
  {
    id: 'w_full_galaxy_glow',
    name: 'Celestial Galaxy Glow Gown',
    type: 'full',
    category: 'Vacation',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#3B0A4E', '#00F2FE', '#EC4899'],
    price: 380,
    rating: 4.9,
    styleTags: ['Glow', 'Glitter', 'Maxi', 'Runway', 'Artistic'],
    description: 'A futuristic runway gown reflecting celestial neon space dust paint strokes, glowing with a bright cyan outer rim.',
    renderConfig: { baseColor: '#3B0A4E', secondaryColor: '#00F2FE', texture: 'artistic' }
  },
  {
    id: 'w_full_boho_paisley',
    name: 'Vintage Boho Paisley Tiered Dress',
    type: 'full',
    category: 'Vacation',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#D2691E', '#D4AF37', '#8B4513'],
    price: 165,
    rating: 4.7,
    styleTags: ['Boho', 'Paisley', 'Casual', 'Maxi', 'Orange'],
    description: 'A beautiful tiered vintage boho dress printed with gold-embroidered paisley swirls.',
    renderConfig: { baseColor: '#D2691E', secondaryColor: '#D4AF37', texture: 'artistic' }
  },
  {
    id: 'w_full_midnight_glimmer',
    name: 'Midnight Indigo Glimmer Gown',
    type: 'full',
    category: 'Party',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#191970', '#00BFFF', '#0B0B3B'],
    price: 340,
    rating: 4.9,
    styleTags: ['Sequin', 'Maxi', 'Runway', 'Glow', 'Luxury'],
    description: 'An exquisite evening gown reflecting deep indigo sequins that shimmer like a starry midnight sky.',
    renderConfig: { baseColor: '#191970', secondaryColor: '#00BFFF', texture: 'sequins' }
  },
  {
    id: 'w_full_velvet_tuxedo',
    name: 'Royal Crimson Velvet Tuxedo Dress',
    type: 'full',
    category: 'Formal',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#800020', '#D4AF37', '#3A000A'],
    price: 360,
    rating: 4.9,
    styleTags: ['Formal', 'Runway', 'Brocade', 'Velvet', 'Luxury'],
    description: 'A luxurious deep crimson velvet blazer-style dress featuring shiny gold buttons and gold brocade trim.',
    renderConfig: { baseColor: '#800020', secondaryColor: '#D4AF37', texture: 'plain' }
  },
  {
    id: 'w_full_vintage_summer',
    name: 'Sunkissed Vintage Floral Sundress',
    type: 'full',
    category: 'Vacation',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#FFD700', '#FF6B6B', '#FFA500'],
    price: 190,
    rating: 4.8,
    styleTags: ['Boho', 'Floral', 'Casual', 'Maxi', 'Artistic'],
    description: 'A bright yellow vintage floral sundress with coral orange abstract brush strokes.',
    renderConfig: { baseColor: '#FFD700', secondaryColor: '#FF6B6B', texture: 'artistic' }
  },
  {
    id: 'w_full_emerald_sash',
    name: 'Royal Emerald Satin Ribbon Gown',
    type: 'full',
    category: 'Party',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#004B23', '#D4AF37', '#00240F'],
    price: 280,
    rating: 4.9,
    styleTags: ['Maxi', 'Luxury', 'Party', 'Satin', 'Glow'],
    description: 'An exquisite emerald green satin gown featuring a waist sash ribbon and a polished golden belt buckle clasp.',
    renderConfig: { baseColor: '#004B23', secondaryColor: '#D4AF37', texture: 'plain' }
  },
  {
    id: 'w_full_rosegold_glitz',
    name: 'Rose Gold Glitz Evening Gown',
    type: 'full',
    category: 'Party',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#B76E79', '#F0E68C', '#8A4F58'],
    price: 310,
    rating: 4.9,
    styleTags: ['Sequin', 'Maxi', 'Elegant', 'Glow', 'Luxury'],
    description: 'A glamorous rose gold sequined evening gown that sparkles with champagne gold highlights.',
    renderConfig: { baseColor: '#B76E79', secondaryColor: '#F0E68C', texture: 'sequins' }
  },
  {
    id: 'w_full_lavender_haze',
    name: 'Lavender Haze Silk Wrap Gown',
    type: 'full',
    category: 'Casual',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#E6E6FA', '#C0C0C0', '#B0B0D0'],
    price: 175,
    rating: 4.8,
    styleTags: ['Silk', 'Elegant', 'Maxi', 'V-Neck', 'Lavender'],
    description: 'A dreamy lavender silk wrap dress with subtle silver thread highlights and a flared sleeve.',
    renderConfig: { baseColor: '#E6E6FA', secondaryColor: '#C0C0C0', texture: 'silk' }
  },
  {
    id: 'w_full_scarlet_brocade',
    name: 'Scarlet Brocade Festive Lehenga',
    type: 'full',
    category: 'Traditional',
    subcategory: 'Lehengas',
    gender: 'woman',
    colors: ['#FF2400', '#E5A93B', '#800A00'],
    price: 450,
    rating: 4.9,
    styleTags: ['Brocade', 'Traditional', 'Lehenga', 'Luxury', 'Embroidery'],
    description: 'A festive scarlet red lehenga featuring rich brocade fabric and detailed gold embroidery panels.',
    renderConfig: { baseColor: '#FF2400', secondaryColor: '#E5A93B', texture: 'brocade' }
  },
  {
    id: 'w_full_midnight_saree',
    name: 'Midnight Georgette Zari Saree',
    type: 'full',
    category: 'Traditional',
    subcategory: 'Sarees',
    gender: 'woman',
    colors: ['#120A2A', '#D4AF37', '#06030F'],
    price: 380,
    rating: 5.0,
    styleTags: ['Traditional', 'Saree', 'Silk', 'Luxury', 'Gold'],
    description: 'A royal midnight georgette saree featuring intricate hand-woven gold zari borders.',
    renderConfig: { baseColor: '#120A2A', secondaryColor: '#D4AF37', texture: 'silk' }
  },
  {
    id: 'w_full_cyber_punk',
    name: 'Cyberpunk Holographic Neon Dress',
    type: 'full',
    category: 'Streetwear',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#8A2BE2', '#00FFFF', '#4B0082'],
    price: 220,
    rating: 4.8,
    styleTags: ['Streetwear', 'Hologram', 'Glow', 'Neon', 'Artistic'],
    description: 'A streetwear holographic jersey dress with neon cyan accents that glow under dark light.',
    renderConfig: { baseColor: '#8A2BE2', secondaryColor: '#00FFFF', texture: 'artistic' }
  },
  {
    id: 'w_full_marigold_boho',
    name: 'Marigold Boho Tassel Sundress',
    type: 'full',
    category: 'Vacation',
    subcategory: 'Dresses',
    gender: 'woman',
    colors: ['#FF8C00', '#FFFDD0', '#D2691E'],
    price: 155,
    rating: 4.7,
    styleTags: ['Boho', 'Vacation', 'Maxi', 'Casual', 'Yellow'],
    description: 'A breezy tiered boho sundress in marigold orange printed with cream mandala motifs.',
    renderConfig: { baseColor: '#FF8C00', secondaryColor: '#FFFDD0', texture: 'artistic' }
  }
];

// Helper to generate kids items (boys/girls) based on base templates
export const KIDS_GARMENTS: Garment[] = [
  // --- BOY TOPS ---
  {
    id: 'b_top_graphic_yellow',
    name: 'Dino Graphic Cotton Tee',
    type: 'top',
    category: 'Casual',
    subcategory: 'Graphic',
    gender: 'boy',
    colors: ['#FFD369', '#3F72AF'],
    price: 22,
    rating: 4.6,
    styleTags: ['Comfort', 'Graphic', 'Cotton', 'Playground'],
    description: 'Soft organic cotton tee featuring a cool dinosaur skateboard graphic.',
    renderConfig: { baseColor: '#FFD700', texture: 'plain', logoText: 'RAWWR!' }
  },
  {
    id: 'b_top_hoodie_blue',
    name: 'Zip-Up Fleece Hoodie',
    type: 'top',
    category: 'Casual',
    subcategory: 'Hoodies',
    gender: 'boy',
    colors: ['#1A374D', '#406882'],
    price: 35,
    rating: 4.8,
    styleTags: ['Hooded', 'Fleece', 'Warm', 'Casual'],
    description: 'Cozy zip-up hoodie lined with ultra-soft fleece for outdoor play.',
    renderConfig: { baseColor: '#1A374D', texture: 'plain' }
  },
  // --- BOY BOTTOMS ---
  {
    id: 'b_bot_jogger_grey',
    name: 'Active Fleece Joggers',
    type: 'bottom',
    category: 'Casual',
    subcategory: 'Joggers',
    gender: 'boy',
    colors: ['#E5E5E5', '#222831'],
    price: 25,
    rating: 4.5,
    styleTags: ['Active', 'Drawstring', 'Comfort', 'Soft'],
    description: 'Lightweight joggers with reinforced knees and an adjustable elastic waistband.',
    renderConfig: { baseColor: '#808080', texture: 'plain' }
  },
  {
    id: 'b_bot_jeans_blue',
    name: 'Stretch Fit Denim',
    type: 'bottom',
    category: 'Casual',
    subcategory: 'Jeans',
    gender: 'boy',
    colors: ['#3282B8'],
    price: 28,
    rating: 4.7,
    styleTags: ['Stretch', 'Durable', 'Classic', 'Adjustable'],
    description: 'Super stretch denim designed to move with active play, featuring inner adjustable tabs.',
    renderConfig: { baseColor: '#4682B4', texture: 'denim' }
  },

  // --- GIRL TOPS ---
  {
    id: 'g_top_ruffle_pink',
    name: 'Ruffled Ribbed Top',
    type: 'top',
    category: 'Casual',
    subcategory: 'Crop Tops',
    gender: 'girl',
    colors: ['#FFC4DD', '#FFFFFF'],
    price: 24,
    rating: 4.7,
    styleTags: ['Ruffles', 'Ribbed', 'Cute', 'Cotton'],
    description: 'Adorable ribbed top featuring dainty ruffle detailing on the shoulders.',
    renderConfig: { baseColor: '#FFB6C1', texture: 'plain' }
  },
  // --- GIRL BOTTOMS ---
  {
    id: 'g_bot_skirt_denim',
    name: 'Button-Up Denim Skirt',
    type: 'bottom',
    category: 'Casual',
    subcategory: 'Mini Skirts',
    gender: 'girl',
    colors: ['#4F8A8B'],
    price: 26,
    rating: 4.6,
    styleTags: ['A-Line', 'Denim', 'Vintage', 'Button-up'],
    description: 'Sturdy A-line denim skirt featuring metallic buttons on the front.',
    renderConfig: { baseColor: '#5F9EA0', texture: 'denim' }
  },
  // --- GIRL FULL BODY ---
  {
    id: 'g_full_dress_floral',
    name: 'Tiered Floral Summer Dress',
    type: 'full',
    category: 'Vacation',
    subcategory: 'Maxi Dresses',
    gender: 'girl',
    colors: ['#FFABAB', '#FFD3B6', '#D8F3DC'],
    price: 39,
    rating: 4.9,
    styleTags: ['Floral', 'Tiered', 'Cotton', 'Summer'],
    description: 'A beautiful, flowing cotton dress with detailed wildflower patterns.',
    renderConfig: { baseColor: '#FFA07A', secondaryColor: '#2E8B57', texture: 'stripes' }
  }
];

// Complete combined garments list
export const ALL_GARMENTS = [...BASE_GARMENTS, ...KIDS_GARMENTS];

// A static dictionary of categories and themes
export const OUTFIT_CATEGORIES = [
  'Casual',
  'Streetwear',
  'Luxury',
  'Business',
  'College',
  'Office',
  'Party',
  'Traditional',
  'Travel',
  'Vacation',
  'Summer',
  'Winter',
  'Korean Fashion',
  'Japanese Fashion',
  'Vintage',
  'Y2K',
  'Techwear',
  'Old Money'
];

/**
 * Programmatic Outfit Catalog Builder
 * Generates 1,000+ unique outfit combinations.
 * Combines tops, bottoms, outerwear, shoes, and accessories
 * across different genders and styles, naming each outfit uniquely.
 */
export function generateOutfitLibrary(): Outfit[] {
  const library: Outfit[] = [];
  const genders: ('man' | 'woman' | 'boy' | 'girl')[] = ['man', 'woman', 'boy', 'girl'];
  
  // Occasion styles metadata
  const stylesMetadata: Record<string, { adjectives: string[], names: string[] }> = {
    Casual: {
      adjectives: ['Everyday', 'Relaxed', 'Weekend', 'Nordic', 'Modern', 'Urban', 'Minimalist', 'Cozy'],
      names: ['Chill', 'Comfort', 'Vibe', 'Essentials', 'Simplicity', 'Lounge', 'Basics', 'Daily']
    },
    Streetwear: {
      adjectives: ['Urban', 'Cyberpunk', 'Hypebeast', 'Neon', 'Grafitti', 'Tokyo', 'Brooklyn', 'Subway'],
      names: ['Rebel', 'District', 'Shift', 'Cargo', 'Oversize', 'Underground', 'Drift', 'Aero']
    },
    Luxury: {
      adjectives: ['Sartorial', 'Royal', 'Milan', 'Parisian', 'Monaco', 'Silk', 'Bespoke', 'Imperial'],
      names: ['Heritage', 'Signature', 'Elite', 'Vanguard', 'Silhouette', 'Grandeur', 'Aura', 'Classique']
    },
    Business: {
      adjectives: ['Executive', 'Metropolis', 'Corporate', 'Sharp', 'Synergy', 'Diplomat', 'Capital'],
      names: ['Ambition', 'Power', 'Meeting', 'Stature', 'Venture', 'Summit', 'Pinnacle', 'Asset']
    },
    Traditional: {
      adjectives: ['Royal', 'Imperial', 'Heritage', 'Ethnic', 'Festive', 'Regal', 'Golden', 'Embroidery'],
      names: ['Maharani', 'Raja', 'Drape', 'Celebration', 'Culture', 'Glow', 'Utsav', 'Elegance']
    },
    Vacation: {
      adjectives: ['Tropical', 'Riviera', 'Resort', 'Seaside', 'Breeze', 'Sunset', 'Aeolian', 'Linen'],
      names: ['Gateway', 'Escape', 'Islander', 'Horizon', 'Cruise', 'Cabana', 'Oasis', 'Wanderlust']
    }
  };

  let outfitCounter = 0;

  for (const gender of genders) {
    const genderGarments = ALL_GARMENTS.filter(g => g.gender === gender || g.gender === 'unisex');
    const tops = genderGarments.filter(g => g.type === 'top');
    const bottoms = genderGarments.filter(g => g.type === 'bottom');
    const fulls = genderGarments.filter(g => g.type === 'full');
    const outerwear = genderGarments.filter(g => g.type === 'outerwear');
    const shoes = genderGarments.filter(g => g.type === 'shoes');
    const accessories = genderGarments.filter(g => g.type === 'accessory');

    for (const cat of OUTFIT_CATEGORIES) {
      const matchCat = ['Casual', 'Streetwear', 'Luxury', 'Business', 'Traditional', 'Vacation'].includes(cat) 
        ? cat 
        : 'Casual';
      const meta = stylesMetadata[matchCat];

      // 1. Full Body (Dresses/Sarees/Lehengas) + Shoes + Accessories FIRST to prioritize dresses at the top of the catalog
      for (let f = 0; f < fulls.length; f++) {
        const full = fulls[f];
        const shoe = shoes[ f % shoes.length ] || shoes[0];
        const outer = f % 2 === 0 ? (outerwear[ f % outerwear.length ] || null) : null;

        let acc: Garment | null = null;
        const accessoryCandidate = accessories[ (f + 1) % accessories.length ];
        if (accessoryCandidate) {
          if (accessoryCandidate.subcategory === 'Sunglasses') {
            const isOutdoorOccasion = ['Casual', 'Streetwear', 'Vacation', 'Summer', 'Korean Fashion'].includes(cat);
            if (isOutdoorOccasion && f % 3 === 0 && full.subcategory.includes('Summer')) {
              acc = accessoryCandidate;
            }
          } else if (accessoryCandidate.subcategory === 'Watches') {
            const isFormalOccasion = ['Business', 'Office', 'Luxury', 'Casual'].includes(cat);
            if (isFormalOccasion && f % 2 === 0) {
              acc = accessoryCandidate;
            }
          } else {
            const isBagOccasion = ['Casual', 'Party', 'Traditional', 'Vacation', 'Luxury'].includes(cat);
            if (isBagOccasion && f % 2 === 0) {
              acc = accessoryCandidate;
            }
          }
        }

        const items: Garment[] = [full];
        if (shoe) items.push(shoe);
        if (acc) items.push(acc);
        if (outer) items.push(outer);

        const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
        
        const adj = meta.adjectives[(f + outfitCounter) % meta.adjectives.length];
        const outfitName = `${adj} ${full.name}`; // Keep the beautiful design name directly!
        outfitCounter++;

        library.push({
          id: `outfit_${gender}_${outfitCounter}`,
          name: outfitName,
          gender,
          category: cat,
          styleTags: Array.from(new Set([...full.styleTags, cat])),
          items,
          description: `An exquisite ${cat.toLowerCase()} collection showcasing the ${full.name} matching luxury accessories.`,
          totalPrice
        });
      }

      // 2. Tops + Bottoms + Shoes + Accessories SECOND
      for (let t = 0; t < tops.length; t++) {
        for (let b = 0; b < bottoms.length; b++) {
          // Limit to a reasonable variety to prevent UI clutter and database bloat
          if ((t + b) % 4 !== 0) continue; 
          
          const top = tops[t];
          const bottom = bottoms[b];
          
          const shoe = shoes[ (t + b) % shoes.length ] || shoes[0];
          const outer = (t + b) % 5 === 0 ? (outerwear[ (t + b) % outerwear.length ] || null) : null;

          let acc: Garment | null = null;
          const accessoryCandidate = accessories[ (t * b) % accessories.length ];
          if (accessoryCandidate) {
            if (accessoryCandidate.subcategory === 'Sunglasses') {
              const isOutdoorOccasion = ['Casual', 'Streetwear', 'Vacation', 'Summer', 'Korean Fashion'].includes(cat);
              if (isOutdoorOccasion && (t + b) % 4 === 0) acc = accessoryCandidate;
            } else if (accessoryCandidate.subcategory === 'Watches') {
              const isFormalOccasion = ['Business', 'Office', 'Luxury', 'Casual'].includes(cat);
              if (isFormalOccasion && (t + b) % 3 === 0) acc = accessoryCandidate;
            } else {
              const isBagOccasion = ['Casual', 'Party', 'Traditional', 'Vacation', 'Luxury'].includes(cat);
              if (isBagOccasion && (t + b) % 3 === 0) acc = accessoryCandidate;
            }
          }

          const items: Garment[] = [top, bottom];
          if (shoe) items.push(shoe);
          if (acc) items.push(acc);
          if (outer) items.push(outer);

          const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
          
          const adj = meta.adjectives[outfitCounter % meta.adjectives.length];
          const namePart = meta.names[(t * b + outfitCounter) % meta.names.length];
          const outfitName = `${adj} ${namePart} Set`;
          outfitCounter++;

          library.push({
            id: `outfit_${gender}_${outfitCounter}`,
            name: outfitName,
            gender,
            category: cat,
            styleTags: Array.from(new Set([...top.styleTags, ...bottom.styleTags, cat])),
            items,
            description: `A carefully matched ${cat.toLowerCase()} outfit featuring the ${top.name} paired with the ${bottom.name}.`,
            totalPrice
          });
        }
      }
    }
  }

  return library;
}
