'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Layers, Sliders, Heart, Info, RefreshCw, 
  HelpCircle, CheckCircle, Smartphone, Camera, Grid, 
  ChevronRight, CloudSun
} from 'lucide-react';
import { Outfit, OUTFIT_CATEGORIES } from '../utils/outfitLibrary';
import { RecommendationFactors, getRecommendedSize } from '../utils/aiRecommender';

interface MirrorSidebarProps {
  outfits: Outfit[];
  activeOutfit: Outfit | null;
  onSelectOutfit: (outfit: Outfit) => void;
  favorites: string[];
  onToggleFavorite: (outfitId: string) => void;
  recommendations: Outfit[];
  factors: RecommendationFactors;
  onRefreshRecommendations: () => void;
}

export default function MirrorSidebar({
  outfits,
  activeOutfit,
  onSelectOutfit,
  favorites,
  onToggleFavorite,
  recommendations,
  factors,
  onRefreshRecommendations
}: MirrorSidebarProps) {
  const [tab, setTab] = useState<'catalog' | 'ai' | 'gestures'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  const [highGraphics, setHighGraphics] = useState(true);

  // Reset lazy-loading count whenever filters change
  useEffect(() => {
    setVisibleCount(30);
  }, [selectedCategory, searchTerm]);

  // Filter outfits
  const filteredOutfits = outfits.filter(o => {
    const matchesCat = selectedCategory === 'All' || o.category === selectedCategory;
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.styleTags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className={`w-96 h-full border-l border-white/10 flex flex-col text-white transition-all duration-300 ${
      highGraphics ? 'bg-black/60 backdrop-blur-2xl' : 'bg-neutral-950'
    }`}>
      {/* Navigation tabs + Performance toggler */}
      <div className="flex border-b border-white/10 items-center justify-between pr-3 bg-black/20">
        <div className="flex flex-1">
          <button
            onClick={() => setTab('catalog')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 hover:text-white cursor-pointer ${
              tab === 'catalog' ? 'border-yellow-500 text-white' : 'border-transparent text-neutral-400'
            }`}
          >
            Catalog
          </button>
          <button
            onClick={() => setTab('ai')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 hover:text-white cursor-pointer ${
              tab === 'ai' ? 'border-yellow-500 text-white' : 'border-transparent text-neutral-400'
            }`}
          >
            AI Advisor
          </button>
          <button
            onClick={() => setTab('gestures')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 hover:text-white cursor-pointer ${
              tab === 'gestures' ? 'border-yellow-500 text-white' : 'border-transparent text-neutral-400'
            }`}
          >
            Gestures
          </button>
        </div>
        <button
          onClick={() => setHighGraphics(!highGraphics)}
          title={highGraphics ? "Switch to low-performance backdrop blur mode" : "Enable high-performance glassmorphism blur"}
          className={`p-1 rounded px-1.5 border transition-all text-[8px] uppercase tracking-widest font-black cursor-pointer ${
            highGraphics 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : 'bg-white/5 border-white/10 text-neutral-400'
          }`}
        >
          {highGraphics ? 'HD UI' : 'SD UI'}
        </button>
      </div>

      {/* Content wrapper */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* --- CATALOG TAB --- */}
        {tab === 'catalog' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Search styles, fits, colors..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors text-white"
              />
              <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === 'All'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                  }`}
                >
                  All Items
                </button>
                {OUTFIT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-yellow-500 text-black'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Available Outfits ({filteredOutfits.length})
              </span>
              <div className="grid grid-cols-1 gap-3">
                {filteredOutfits.slice(0, visibleCount).map(outfit => {
                  const isActive = activeOutfit?.id === outfit.id;
                  const isFav = favorites.includes(outfit.id);
                  return (
                    <div
                      key={outfit.id}
                      onClick={() => onSelectOutfit(outfit)}
                      className={`group relative p-4 rounded-xl border transition-all duration-300 ease-out hover:scale-[1.015] hover:shadow-[0_12px_36px_rgba(0,0,0,0.3)] cursor-pointer ${
                        isActive
                          ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)]'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-sm group-hover:text-yellow-500 transition-colors">
                            {outfit.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-neutral-400">{outfit.category}</span>
                            <span className="text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.2 rounded font-mono font-bold">
                              Size: {getRecommendedSize(factors.measurements, outfit.gender)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">${outfit.totalPrice}</span>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onToggleFavorite(outfit.id);
                            }}
                            className={`p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors ${
                              isFav ? 'text-red-500' : 'text-neutral-400'
                            }`}
                          >
                            <Heart className="w-3.5 h-3.5" fill={isFav ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {outfit.styleTags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-neutral-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleCount < filteredOutfits.length && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 30)}
                  className="w-full py-3.5 mt-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-yellow-500/30 text-neutral-300 hover:text-white font-semibold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-hover" />
                  <span>Load More Outfits ({filteredOutfits.length - visibleCount} remaining)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- AI ADVISOR TAB --- */}
        {tab === 'ai' && (
          <div className="space-y-6 animate-fade-in">
            {/* Skin tone color block */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Skin Tone Analyzer</span>
                <span className="text-xs text-yellow-500 font-bold font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span>Calibrated</span>
                </span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div 
                  className="w-10 h-10 rounded-full border border-white/20 shadow-lg shrink-0"
                  style={{ backgroundColor: factors.skinTone.hex }}
                />
                <div>
                  <h4 className="font-bold text-sm text-white">{factors.skinTone.type}</h4>
                  <p className="text-xs text-yellow-500 font-semibold">{factors.skinTone.paletteName}</p>
                </div>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                {factors.skinTone.description}
              </p>
              
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Recommended Swatches</span>
                <div className="grid grid-cols-2 gap-2">
                  {factors.skinTone.recommendedColors.map((c, idx) => (
                    <div
                      key={c}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0 border border-white/10"
                        style={{ backgroundColor: c }}
                      />
                      <span className="text-[10px] font-semibold text-neutral-300 truncate">
                        {factors.skinTone.colorNames?.[idx] || c}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weather / Occasion factors */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Try-On Context</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">Selected Occasion</span>
                  <p className="text-sm font-bold text-neutral-200 capitalize">{factors.occasion}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-semibold">Season Mode</span>
                  <p className="text-sm font-bold text-neutral-200 flex items-center gap-1.5">
                    <CloudSun className="w-3.5 h-3.5 text-yellow-500" />
                    <span>{factors.season}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* AI Custom Recommendations */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                  Personalized AI Fits
                </span>
                <button
                  onClick={onRefreshRecommendations}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
                  title="Recalculate styling"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3">
                {recommendations.slice(0, 5).map((outfit, index) => {
                  const isActive = activeOutfit?.id === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      onClick={() => onSelectOutfit(outfit)}
                      className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'bg-yellow-500/10 border-yellow-500'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 text-[9px] font-bold">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>#{index + 1} Match</span>
                      </div>
                      
                      <h4 className="font-bold text-sm pr-16">{outfit.name}</h4>
                      <p className="text-xs text-neutral-400 mt-1">{outfit.category}</p>
                      
                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-white/5">
                        <span className="text-xs text-yellow-500 font-semibold">Recommended for {factors.measurements.bodyType}</span>
                        <span className="text-sm font-bold">${outfit.totalPrice}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- GESTURE CONTROLS REFERENCE TAB --- */}
        {tab === 'gestures' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-yellow-500/5 border border-yellow-500/10 p-5 rounded-2xl text-center space-y-2">
              <HelpCircle className="w-8 h-8 text-yellow-500 mx-auto" />
              <h3 className="font-bold text-md text-white">Interactive Gesture Guide</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Control the Smart Mirror entirely touch-free. Raise your hands and stand fully in view to execute commands.
              </p>
            </div>

            <div className="space-y-3.5">
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Available Gestures
              </span>
              
              <div className="space-y-2.5">
                {[
                  { gesture: 'Pinch Fingers', action: 'Next Outfit', desc: 'Touch your index finger and thumb tip together.' },
                  { gesture: 'Double Pinch', action: 'Previous Outfit', desc: 'Perform two quick pinches in under half a second.' },
                  { gesture: 'Wave Right Hand', action: 'Random Outfit', desc: 'Oscillate your right hand side-to-side rapidly.' },
                  { gesture: 'Wave Left Hand', action: 'Previous Category', desc: 'Oscillate your left hand side-to-side rapidly.' },
                  { gesture: 'Thumbs Up', action: 'Save Favorite Look', desc: 'Make a fist with your thumb pointing up.' },
                  { gesture: 'Peace Sign (V)', action: 'Capture Screenshot', desc: 'Hold up index and middle fingers together.' },
                  { gesture: 'Open Palm (2s)', action: 'Open Category Selector', desc: 'Hold your palm open and flat for 2 seconds.' },
                  { gesture: 'Hands Together', action: 'Auto Fashion Show', desc: 'Bring your left and right wrists close together.' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 p-3.5 rounded-xl hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-yellow-500">{item.gesture}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white tracking-wide uppercase text-[9px]">
                        {item.action}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-normal">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Active outfit overlay display */}
      {activeOutfit && (
        <div className="bg-neutral-900 border-t border-white/10 p-5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-500 font-semibold uppercase">Currently Wearing</span>
            <span className="text-sm font-bold text-yellow-500">${activeOutfit.totalPrice}</span>
          </div>
          <h4 className="font-bold text-md leading-tight">{activeOutfit.name}</h4>
          <p className="text-xs text-neutral-400">{activeOutfit.description}</p>
        </div>
      )}
    </div>
  );
}
