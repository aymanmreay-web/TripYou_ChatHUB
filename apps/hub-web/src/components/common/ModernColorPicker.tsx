'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, RefreshCw } from 'lucide-react';

interface ModernColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

// مجموعة ألوان عصرية وتدرجات فخمة مصممة لواجهات 2026
const MODERN_PALETTES = [
  // الأزرق والنيلي
  ['#3b82f6', '#2563eb', '#1d4ed8', '#6366f1', '#4f46e5'],
  // البنفسجي والأرجواني
  ['#8b5cf6', '#7c3aed', '#a855f7', '#9333ea', '#c084fc'],
  // الزمردي والأخضر النعناعي
  ['#10b981', '#059669', '#14b8a6', '#0d9488', '#34d399'],
  // الكهرماني والبرتقالي الدافئ
  ['#f59e0b', '#d97706', '#f97316', '#ea580c', '#fbbf24'],
  // الوردي والأحمر الياقوتي
  ['#f43f5e', '#e11d48', '#ec4899', '#db2777', '#fb7185'],
  // السماوي والجليدي
  ['#06b6d4', '#0891b2', '#38bdf8', '#0284c7', '#22d3ee'],
  // الرمادي الليلي والبرونزي
  ['#64748b', '#475569', '#78716c', '#57534e', '#94a3b8'],
];

export function ModernColorPicker({ value, onChange, label }: ModernColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState(value || '#8b5cf6');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomHex(value || '#8b5cf6');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectColor = (hex: string) => {
    setCustomHex(hex);
    onChange(hex);
    setIsOpen(false);
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <div className="relative inline-block w-full" ref={popoverRef}>
      {label && <label className="block text-xs font-semibold text-slate-300 mb-1.5">{label}</label>}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-purple-500/60 transition-all text-xs"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-4 h-4 rounded-lg shadow-sm border border-white/20 transition-transform"
            style={{ backgroundColor: value || '#8b5cf6' }}
          />
          <span className="font-mono text-white text-xs font-semibold uppercase">{value || '#8b5cf6'}</span>
        </div>
        <Palette className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 right-0 w-64 p-3.5 rounded-2xl bg-[var(--card-bg)] border border-purple-500/40 shadow-2xl space-y-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[11px] font-bold text-slate-300 pb-1 border-b border-purple-900/40 flex items-center justify-between">
            <span>اختر لوناً عصرياً</span>
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: customHex }}
            />
          </div>

          {/* Color Matrix */}
          <div className="space-y-1.5">
            {MODERN_PALETTES.map((row, rIdx) => (
              <div key={rIdx} className="flex items-center justify-between gap-1.5">
                {row.map((hex) => {
                  const isSelected = value?.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => handleSelectColor(hex)}
                      className="w-6 h-6 rounded-lg transition-transform hover:scale-115 flex items-center justify-center relative shadow-sm border border-black/10"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white drop-shadow-md stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Custom Hex & Native Color Wheel */}
          <div className="pt-2 border-t border-purple-900/40 flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-700 shrink-0 cursor-pointer shadow-sm">
              <input
                type="color"
                value={customHex.startsWith('#') && customHex.length === 7 ? customHex : '#8b5cf6'}
                onChange={(e) => handleSelectColor(e.target.value)}
                className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-0 p-0"
                title="افتح لوحة الألوان الحرة"
              />
            </div>
            <input
              type="text"
              value={customHex}
              onChange={(e) => handleCustomHexChange(e.target.value)}
              placeholder="#8B5CF6"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono uppercase focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

