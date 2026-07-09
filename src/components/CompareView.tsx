'use client';

import React from 'react';
import { X, Scale, ArrowRightLeft, Download, Trash } from 'lucide-react';
import { Outfit } from '../utils/outfitLibrary';

interface CompareLook {
  id: string;
  outfit: Outfit;
  imageSrc: string; // Captured canvas image dataURL
  timestamp: string;
}

interface CompareViewProps {
  looks: CompareLook[];
  onClose: () => void;
  onRemoveLook: (id: string) => void;
}

export default function CompareView({ looks, onClose, onRemoveLook }: CompareViewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col text-white animate-fade-in">
      {/* Header bar */}
      <div className="flex justify-between items-center p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-bold tracking-tight">Compare Outfits Side-by-Side</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main split comparison area */}
      <div className="flex-1 p-8 flex items-center justify-center gap-8 overflow-hidden">
        {looks.length === 0 ? (
          <div className="text-center space-y-4 max-w-sm">
            <ArrowRightLeft className="w-12 h-12 text-neutral-600 mx-auto" />
            <h3 className="text-lg font-semibold">No looks selected for comparison</h3>
            <p className="text-neutral-400 text-xs">
              Go back to the mirror, try on outfits, use the screenshot gesture (Peace Sign), and select up to two looks to compare.
            </p>
          </div>
        ) : looks.length === 1 ? (
          <div className="w-full max-w-lg flex flex-col items-center gap-4">
            <div className="aspect-[3/4] w-72 rounded-2xl overflow-hidden border border-white/20 relative shadow-2xl">
              <img
                src={looks[0].imageSrc}
                alt={looks[0].outfit.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-md">{looks[0].outfit.name}</h3>
              <p className="text-xs text-yellow-500">${looks[0].outfit.totalPrice}</p>
            </div>
            <p className="text-neutral-400 text-xs mt-4">
              Add another snapshot from your gallery drawer to view them side-by-side!
            </p>
          </div>
        ) : (
          <div className="w-full max-w-6xl h-full grid grid-cols-2 gap-8 items-center">
            {looks.slice(0, 2).map(look => (
              <div
                key={look.id}
                className="h-full flex flex-col items-center justify-center gap-4 overflow-hidden"
              >
                <div className="relative group aspect-[3/4] w-full max-w-sm rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                  <img
                    src={look.imageSrc}
                    alt={look.outfit.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover action overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                    <a
                      href={look.imageSrc}
                      download={`mirror_compare_${look.outfit.name}.png`}
                      className="p-3 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-2 text-xs font-bold"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => onRemoveLook(look.id)}
                      className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
                
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-lg">{look.outfit.name}</h3>
                  <p className="text-sm font-semibold text-yellow-500">${look.outfit.totalPrice}</p>
                  <div className="flex justify-center gap-1.5 mt-1.5">
                    {look.outfit.styleTags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-neutral-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
