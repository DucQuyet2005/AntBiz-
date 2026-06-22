"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2, Sparkles, Upload, X, User, Briefcase, Mail, Shield, UserCheck, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

/* ──────────────────────────────────────────
   1. STATIC PARTICLE POSITION DATA
   (No Math.random() → no hydration mismatch)
   ────────────────────────────────────────── */
const RAIN_POSITIONS = [
  { left: '8%',  delay: '0s',    dur: '0.82s' },
  { left: '20%', delay: '0.18s', dur: '0.96s' },
  { left: '34%', delay: '0.07s', dur: '0.74s' },
  { left: '48%', delay: '0.33s', dur: '0.88s' },
  { left: '62%', delay: '0.14s', dur: '1.0s'  },
  { left: '76%', delay: '0.45s', dur: '0.79s' },
  { left: '89%', delay: '0.25s', dur: '0.91s' },
];
const SNOW_POSITIONS = [
  { left: '6%',  size: '3px',  delay: '0s',    dur: '2.6s' },
  { left: '18%', size: '4px',  delay: '0.4s',  dur: '3.1s' },
  { left: '32%', size: '2px',  delay: '0.8s',  dur: '2.4s' },
  { left: '46%', size: '4px',  delay: '0.2s',  dur: '2.9s' },
  { left: '60%', size: '3px',  delay: '0.6s',  dur: '2.7s' },
  { left: '74%', size: '2px',  delay: '1.0s',  dur: '3.3s' },
  { left: '87%', size: '3px',  delay: '0.3s',  dur: '2.5s' },
];
const SAKURA_POSITIONS = [
  { left: '10%', size: '6px',  delay: '0s',    dur: '3.2s' },
  { left: '28%', size: '5px',  delay: '0.5s',  dur: '3.8s' },
  { left: '47%', size: '7px',  delay: '1.0s',  dur: '3.4s' },
  { left: '65%', size: '5px',  delay: '0.3s',  dur: '4.0s' },
  { left: '82%', size: '6px',  delay: '0.8s',  dur: '3.6s' },
];
const SPARK_POSITIONS = [
  { left: '15%', size: '3px', delay: '0s',    dur: '1.6s' },
  { left: '28%', size: '4px', delay: '0.2s',  dur: '1.4s' },
  { left: '42%', size: '3px', delay: '0.5s',  dur: '1.8s' },
  { left: '57%', size: '2px', delay: '0.1s',  dur: '1.5s' },
  { left: '70%', size: '4px', delay: '0.35s', dur: '1.7s' },
  { left: '84%', size: '3px', delay: '0.6s',  dur: '1.6s' },
];
const BUBBLE_POSITIONS = [
  { left: '10%', size: '5px',  delay: '0s',    dur: '2.3s' },
  { left: '24%', size: '7px',  delay: '0.4s',  dur: '2.8s' },
  { left: '40%', size: '4px',  delay: '0.7s',  dur: '2.1s' },
  { left: '55%', size: '6px',  delay: '0.2s',  dur: '2.6s' },
  { left: '70%', size: '5px',  delay: '0.9s',  dur: '2.4s' },
  { left: '84%', size: '7px',  delay: '0.5s',  dur: '3.0s' },
];
const ARCANE_POSITIONS = [
  { left: '15%', top: '30%', size: '5px', delay: '0s',    dur: '3.0s' },
  { left: '35%', top: '55%', size: '4px', delay: '0.5s',  dur: '2.7s' },
  { left: '55%', top: '25%', size: '6px', delay: '1.0s',  dur: '3.2s' },
  { left: '72%', top: '65%', size: '4px', delay: '0.3s',  dur: '2.9s' },
  { left: '85%', top: '40%', size: '5px', delay: '0.7s',  dur: '3.1s' },
];
const METEOR_POSITIONS = [
  { top: '15%', width: '28px', delay: '0s',    dur: '2.0s' },
  { top: '35%', width: '22px', delay: '0.8s',  dur: '1.7s' },
  { top: '58%', width: '32px', delay: '0.4s',  dur: '2.2s' },
];
const AUTUMN_POSITIONS = [
  { left: '12%', size: '6px',  delay: '0s',    dur: '3.8s' },
  { left: '33%', size: '7px',  delay: '0.6s',  dur: '4.2s' },
  { left: '55%', size: '5px',  delay: '1.2s',  dur: '3.5s' },
  { left: '76%', size: '6px',  delay: '0.3s',  dur: '4.0s' },
];
const GRASS_POSITIONS = [
  { left: '4%',  height: '14px', delay: '0.1s'  },
  { left: '9%',  height: '10px', delay: '0.3s'  },
  { left: '14%', height: '12px', delay: '0.0s'  },
  { left: '19%', height: '15px', delay: '0.5s'  },
  { left: '24%', height: '9px',  delay: '0.2s'  },
  { left: '29%', height: '13px', delay: '0.4s'  },
  { left: '34%', height: '11px', delay: '0.15s' },
  { left: '39%', height: '16px', delay: '0.6s'  },
  { left: '44%', height: '10px', delay: '0.25s' },
  { left: '49%', height: '14px', delay: '0.05s' },
  { left: '54%', height: '12px', delay: '0.35s' },
  { left: '59%', height: '15px', delay: '0.55s' },
  { left: '64%', height: '9px',  delay: '0.2s'  },
  { left: '69%', height: '13px', delay: '0.45s' },
  { left: '74%', height: '11px', delay: '0.1s'  },
  { left: '79%', height: '16px', delay: '0.7s'  },
  { left: '84%', height: '10px', delay: '0.3s'  },
  { left: '89%', height: '14px', delay: '0.05s' },
  { left: '93%', height: '12px', delay: '0.5s'  },
  { left: '97%', height: '15px', delay: '0.2s'  },
];
const MAGMA_BUBBLES = [
  { left: '15%', size: '5px',  delay: '0.2s',  dur: '1.4s' },
  { left: '35%', size: '3px',  delay: '0.7s',  dur: '1.8s' },
  { left: '55%', size: '6px',  delay: '0.0s',  dur: '1.5s' },
  { left: '75%', size: '4px',  delay: '0.4s',  dur: '1.6s' },
  { left: '90%', size: '5px',  delay: '0.9s',  dur: '1.3s' },
];
const ROSE_POSITIONS = [
  { left: '6%',  bottom: '2px',  scale: 0.9,  delay: '0.1s' },
  { left: '16%', bottom: '5px',  scale: 1.1,  delay: '0.3s' },
  { left: '26%', bottom: '3px',  scale: 0.85, delay: '0.0s' },
  { left: '36%', bottom: '6px',  scale: 1.2,  delay: '0.4s' },
  { left: '46%', bottom: '4px',  scale: 0.95, delay: '0.2s' },
  { left: '56%', bottom: '7px',  scale: 1.15, delay: '0.5s' },
  { left: '66%', bottom: '3px',  scale: 0.9,  delay: '0.15s' },
  { left: '76%', bottom: '5px',  scale: 1.05, delay: '0.35s' },
  { left: '86%', bottom: '2px',  scale: 0.8,  delay: '0.25s' },
  { left: '94%', bottom: '4px',  scale: 1.1,  delay: '0.45s' },
];
const GOLD_SPARKLES = [
  { left: '15%', bottom: '12px', delay: '0.2s', size: '10px' },
  { left: '45%', bottom: '16px', delay: '0.7s', size: '12px' },
  { left: '75%', bottom: '14px', delay: '0.0s', size: '8px'  },
];
const GRASS_FLOWERS = [
  { left: '12%', bottom: '6px', scale: 0.95 },
  { left: '28%', bottom: '3px', scale: 1.1 },
  { left: '42%', bottom: '5px', scale: 0.8 },
  { left: '56%', bottom: '8px', scale: 1.15 },
  { left: '72%', bottom: '4px', scale: 1.0 },
  { left: '88%', bottom: '7px', scale: 0.9 },
];


/* ──────────────────────────────────────────
   2. EFFECT / BASE DEFINITIONS
   ────────────────────────────────────────── */
const FRAMES = [
  { key: 'none',    label: 'frameNone',    icon: '○',  ringClass: '', description: 'Không khung viền' },
  { key: 'rainbow', label: 'frameRainbow', icon: '🌈', ringClass: 'ring-rainbow', description: 'Cầu vồng xoay 360°' },
  { key: 'gold',    label: 'frameGold',    icon: '✨', ringClass: 'ring-gold',    description: 'Vàng lấp lánh sang trọng' },
  { key: 'cyber',   label: 'frameCyber',   icon: '⚡', ringClass: 'ring-cyber',   description: 'Neon Cyberpunk nhấp nháy' },
];

const EFFECTS = [
  { key: 'none',      label: 'Không hiệu ứng',    icon: '❌', desc: 'Ảnh nguyên bản sạch sẽ' },
  { key: 'rain',      label: 'Mưa rơi tí tách',   icon: '🌧️', desc: 'Hạt mưa rơi nghiêng lãng mạn' },
  { key: 'snow',      label: 'Tuyết mùa đông',     icon: '❄️', desc: 'Tinh thể tuyết trắng xoay đảo' },
  { key: 'sunny',     label: 'Nắng ấm ban mai',    icon: '☀️', desc: 'Tia sáng rực rỡ & bụi nắng bay' },
  { key: 'sakura',    label: 'Hoa anh đào rơi',   icon: '🌸', desc: 'Cánh hoa hồng phấn bay chéo' },
  { key: 'meteor',    label: 'Mưa sao băng',       icon: '☄️', desc: 'Vệt sáng sao băng xẹt chéo' },
  { key: 'camp',      label: 'Lửa trại bập bùng',  icon: '🔥', desc: 'Tàn lửa đỏ cam bay bốc lên' },
  { key: 'bubble',    label: 'Bong bóng đại dương', icon: '🫧', desc: 'Bong bóng trong suốt nổi lên' },
  { key: 'arcane',    label: 'Bụi phép thuật',     icon: '🔮', desc: 'Hạt ma thuật đổi màu huyền ảo' },
  { key: 'lightning', label: 'Bão sét chớp nháy',  icon: '⚡', desc: 'Tia chớp neon tím siêu ngầu' },
  { key: 'autumn',    label: 'Lá thu rơi rụng',    icon: '🍁', desc: 'Lá phong đỏ cam bay theo gió' },
];

const BASES = [
  { key: 'none',    label: 'Không bệ đỡ',        icon: '❌', desc: 'Cạnh tròn tự nhiên của avatar' },
  { key: 'grass',   label: 'Bãi cỏ xanh mướt',   icon: '🌱', desc: 'Cỏ xanh lắc lư theo gió nhẹ' },
  { key: 'beach',   label: 'Bờ cát bãi biển',    icon: '🏖️', desc: 'Cát vàng óng & gợn sóng bọt' },
  { key: 'ocean',   label: 'Sóng xanh cuộn trào', icon: '🌊', desc: 'Sóng biển xanh dập dềnh liên tục' },
  { key: 'magma',   label: 'Dung nham rực cháy',  icon: '🌋', desc: 'Nham thạch đỏ rực nhiệt lượng' },
  { key: 'rose',    label: 'Thảm hoa hồng',       icon: '🌹', desc: 'Bông hồng kiêu sa ôm chân avatar' },
  { key: 'cloud',   label: 'Mây bồng bềnh',       icon: '☁️', desc: 'Đám mây sương che phủ huyền ảo' },
  { key: 'stone',   label: 'Bệ đá rêu phong',     icon: '🪨', desc: 'Đá cổ phủ rêu nâng đỡ vững chắc' },
  { key: 'glacier', label: 'Băng giá vĩnh cửu',   icon: '🏔️', desc: 'Tinh thể băng trắng xanh mát lạnh' },
  { key: 'smoke',   label: 'Khói Cyberpunk',       icon: '💨', desc: 'Khói neon tím hồng nghệ thuật' },
  { key: 'gold',    label: 'Đế vàng hoàng gia',   icon: '👑', desc: 'Bệ mạ vàng sang trọng lấp lánh' },
];

/* ──────────────────────────────────────────
   3. RENDERING HELPERS
   ────────────────────────────────────────── */
function getRingClass(frame: string) {
  return FRAMES.find(f => f.key === frame)?.ringClass ?? '';
}

function EffectParticles({ effect }: { effect: string }) {
  if (!effect || effect === 'none') return null;

  switch (effect) {
    case 'rain':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          {RAIN_POSITIONS.map((p, i) => (
            <div key={i} className="av-rain" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
      );

    case 'snow':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          {SNOW_POSITIONS.map((p, i) => (
            <div key={i} className="av-snow" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
      );

    case 'sunny':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          <div className="av-sunbeam" />
          <div className="av-sundust" style={{ animationDelay: '0s', animationDuration: '5s' }} />
          <div className="av-sundust" style={{ animationDelay: '1.5s', animationDuration: '4s', left: '60%', top: '30%' }} />
          <div className="av-sundust" style={{ animationDelay: '3s', animationDuration: '6s', left: '80%', top: '60%' }} />
        </div>
      );

    case 'sakura':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          {SAKURA_POSITIONS.map((p, i) => (
            <div key={i} className="av-sakura" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
      );

    case 'meteor':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          {METEOR_POSITIONS.map((p, i) => (
            <div key={i} className="av-meteor" style={{ top: p.top, width: p.width, right: '5%', animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
      );

    case 'camp':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          {SPARK_POSITIONS.map((p, i) => (
            <div key={i} className="av-spark" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
      );

    case 'bubble':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          {BUBBLE_POSITIONS.map((p, i) => (
            <div key={i} className="av-bubble" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
      );

    case 'arcane':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          {ARCANE_POSITIONS.map((p, i) => (
            <div key={i} className="av-arcane" style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
      );

    case 'lightning':
      return <div className="av-lightning rounded-full" style={{ zIndex: 2 }} />;

    case 'autumn':
      return (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          {AUTUMN_POSITIONS.map((p, i) => (
            <div key={i} className="av-autumn" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
          ))}
        </div>
      );

    default:
      return null;
  }
}

function BaseDecor({ base }: { base: string }) {
  if (!base || base === 'none') return null;

  switch (base) {
    case 'grass':
      return (
        <div className="av-base-grass-wrap">
          <div className="av-base-grass-field" />
          {GRASS_POSITIONS.map((g, i) => (
            <div key={i} className="av-base-grass-blade" style={{ left: g.left, height: g.height, animationDelay: g.delay }} />
          ))}
          {GRASS_FLOWERS.map((f, i) => (
            <span key={i} className="av-base-grass-daisy" style={{ left: f.left, bottom: f.bottom, transform: `scale(${f.scale})` }}>❀</span>
          ))}
        </div>
      );
    case 'beach':
      return (
        <div className="av-base-beach">
          <div className="av-base-beach-water" />
          <div className="av-base-beach-sand" />
        </div>
      );
    case 'ocean':
      return (
        <div className="av-base-ocean">
          <div className="av-base-ocean-wave-1" />
          <div className="av-base-ocean-wave-2" />
          <div className="av-base-ocean-wave-3" />
        </div>
      );
    case 'magma':
      return (
        <div className="av-base-magma">
          <div className="av-base-magma-lava" />
          {MAGMA_BUBBLES.map((b, i) => (
            <div key={i} className="av-base-magma-bubble" style={{ left: b.left, width: b.size, height: b.size, animationDelay: b.delay, animationDuration: b.dur }} />
          ))}
        </div>
      );
    case 'rose':
      return (
        <div className="av-base-rose-wrap">
          <div className="av-base-rose-foliage" />
          {ROSE_POSITIONS.map((r, i) => (
            <div key={i} className="av-base-rose-flower" style={{ left: r.left, bottom: r.bottom, transform: `scale(${r.scale})`, animationDelay: r.delay }} />
          ))}
          {[{left:'12%',bottom:'10px'},{left:'38%',bottom:'14px'},{left:'68%',bottom:'12px'},{left:'88%',bottom:'8px'}].map((l, i) => (
            <span key={i} className="av-base-rose-leaf" style={{ left: l.left, bottom: l.bottom }}>🍃</span>
          ))}
        </div>
      );
    case 'cloud':
      return (
        <div className="av-base-cloud-wrap">
          <div className="av-base-cloud-puff av-base-cloud-puff-1" />
          <div className="av-base-cloud-puff av-base-cloud-puff-2" />
          <div className="av-base-cloud-puff av-base-cloud-puff-3" />
        </div>
      );
    case 'stone':
      return (
        <div className="av-base-stone-wrap">
          <div className="av-base-stone-rock av-base-stone-rock-1">
            <div className="av-base-stone-grass-cap" />
          </div>
          <div className="av-base-stone-rock av-base-stone-rock-2">
            <div className="av-base-stone-grass-cap" />
          </div>
          <div className="av-base-stone-rock av-base-stone-rock-3">
            <div className="av-base-stone-grass-cap" />
          </div>
        </div>
      );
    case 'glacier':
      return (
        <div className="av-base-glacier-wrap">
          <div className="av-base-glacier-shard av-base-glacier-shard-1" />
          <div className="av-base-glacier-shard av-base-glacier-shard-2" />
          <div className="av-base-glacier-shard av-base-glacier-shard-3" />
        </div>
      );
    case 'smoke':
      return (
        <div className="av-base-smoke-wrap">
          <div className="av-base-smoke-puff av-base-smoke-puff-1" />
          <div className="av-base-smoke-puff av-base-smoke-puff-2" />
          <div className="av-base-smoke-puff av-base-smoke-puff-3" />
        </div>
      );
    case 'gold':
      return (
        <div className="av-base-gold-wrap">
          <div className="av-base-gold-crown" />
          <div className="av-base-gold-reflection" />
          {GOLD_SPARKLES.map((s, i) => (
            <div key={i} className="av-base-gold-sparkle" style={{ left: s.left, bottom: s.bottom, width: s.size, height: s.size, animationDelay: s.delay }} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

function FrameOrbitParticles({ frame, size }: { frame: string; size: number }) {
  if (!frame || frame === 'none') return null;
  if (size < 60) return null;

  if (frame === 'rainbow') {
    return (
      <div className="absolute inset-[-8px] pointer-events-none" style={{ zIndex: 5 }}>
        <div className="absolute inset-0 border border-dashed border-pink-400 rounded-full animate-[spin_8s_linear_infinite]" />
        <div className="absolute inset-[-4px] border border-dashed border-cyan-400 rounded-full animate-[spin_12s_linear_infinite_reverse]" />
        <span className="absolute text-[10px] animate-[bounce_1.5s_infinite]" style={{ top: '10%', left: '80%' }}>💎</span>
        <span className="absolute text-[10px] animate-[bounce_2s_infinite]" style={{ bottom: '15%', left: '5%' }}>✨</span>
      </div>
    );
  }

  if (frame === 'gold') {
    return (
      <div className="absolute inset-[-10px] pointer-events-none" style={{ zIndex: 5 }}>
        <span className="absolute text-sm animate-pulse text-amber-300" style={{ top: '-4px', left: '40%', animationDuration: '1.2s' }}>✦</span>
        <span className="absolute text-[10px] animate-pulse text-yellow-200" style={{ bottom: '20%', right: '-2px', animationDuration: '1.8s' }}>✧</span>
        <span className="absolute text-xs animate-bounce text-amber-400" style={{ bottom: '-4px', left: '20%' }}>⭐</span>
        <span className="absolute text-[11px] animate-pulse text-yellow-300" style={{ top: '30%', left: '-6px' }}>✦</span>
      </div>
    );
  }

  if (frame === 'cyber') {
    return (
      <div className="absolute inset-[-6px] pointer-events-none" style={{ zIndex: 5 }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#00f0ff] animate-ping" />
        <div className="absolute bottom-0 left-1/4 w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_8px_#ff007f] animate-ping" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 right-0 w-1.5 h-1.5 bg-purple-500 rounded-full shadow-[0_0_8px_#a855f7] animate-ping" style={{ animationDelay: '1s' }} />
      </div>
    );
  }

  return null;
}

function AvatarPreview({
  avatarUrl, initials, frame, effect = 'none', base = 'none', size = 160,
}: {
  avatarUrl: string; initials: string; frame: string;
  effect?: string; base?: string; size?: number;
}) {
  const ringClass = getRingClass(frame);
  const pad = size > 80 ? 6 : 3;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Glow halo (large preview only) */}
      {ringClass && size > 80 && (
        <div className={`absolute rounded-full opacity-50 blur-lg ${ringClass}`}
          style={{ inset: -pad * 2, borderRadius: '50%' }} />
      )}
      {/* Ring */}
      {ringClass && (
        <div className={`absolute rounded-full ${ringClass}`}
          style={{ inset: -pad, borderRadius: '50%' }} />
      )}
      {/* Avatar surface */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-gray-200"
        style={{ zIndex: 1, border: size > 80 ? '4px solid white' : '2px solid white', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1)' }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className="text-gray-500 font-extrabold select-none" style={{ fontSize: size * 0.35 }}>
            {initials}
          </span>
        )}
        {/* Weather / environment overlay INSIDE avatar */}
        <EffectParticles effect={effect} />
        {/* Base / pedestal INSIDE avatar (at the bottom, clipped) */}
        <BaseDecor base={base} />
      </div>
      {/* Dynamic orbits/particles */}
      <FrameOrbitParticles frame={frame} size={size} />
      {/* Sparkle badge on ring */}
      {ringClass && size > 80 && (
        <>
          <span className="absolute text-lg animate-bounce" style={{ top: -14, right: -14, zIndex: 2 }}>✨</span>
          <span className="absolute text-sm animate-pulse" style={{ bottom: -6, left: -12, zIndex: 2 }}>⭐</span>
        </>
      )}
      {ringClass && size <= 80 && (
        <span className="absolute text-[10px] animate-bounce" style={{ top: -6, right: -6, zIndex: 2 }}>✨</span>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   4. EFFECT PICKER DIALOG
   ────────────────────────────────────────── */
function EffectPickerDialog({
  isOpen,
  onClose,
  defaultTab,
  avatarFrame,
  avatarUrl,
  initials,
  avatarEffect,
  avatarBase,
  onSelectEffect,
  onSelectBase,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultTab: 'effects' | 'bases';
  avatarFrame: string;
  avatarUrl: string;
  initials: string;
  avatarEffect: string;
  avatarBase: string;
  onSelectEffect: (key: string) => void;
  onSelectBase: (key: string) => void;
}) {
  const [tab, setTab] = useState<'effects' | 'bases'>(defaultTab);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          style={{ zIndex: 200 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-[28px] w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden"
            style={{ maxHeight: '85vh' }}
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-black text-text">🎨 Bộ sưu tập Hiệu ứng</h2>
                <p className="text-xs text-text-muted mt-0.5">Chọn hiệu ứng thời tiết hoặc bệ đỡ chân avatar</p>
              </div>
              {/* Mini live preview */}
              <div className="flex items-center gap-4">
                <AvatarPreview
                  avatarUrl={avatarUrl}
                  initials={initials}
                  frame={avatarFrame}
                  effect={avatarEffect}
                  base={avatarBase}
                  size={64}
                />
                <button onClick={onClose}
                  className="w-9 h-9 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors text-text-muted hover:text-text">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap sm:flex-nowrap gap-1.5 px-4 sm:px-7 pt-5 pb-2">
              {[
                { key: 'effects', label: '🌦️ Hiệu ứng thời tiết', count: EFFECTS.length - 1 },
                { key: 'bases',   label: '🏺 Bệ đỡ chân avatar',  count: BASES.length - 1  },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as 'effects' | 'bases')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    tab === t.key
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-text-muted hover:bg-gray-50 hover:text-text'
                  }`}
                >
                  {t.label}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-text-muted'
                  }`}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto px-7 pb-6">
              {tab === 'effects' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                  {EFFECTS.map(({ key, label, icon, desc }) => {
                    const active = avatarEffect === key;
                    return (
                      <button key={key} type="button" onClick={() => onSelectEffect(key)}
                        className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                          active ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{icon}</span>
                          {active && <Check size={12} className="text-primary stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-bold ${active ? 'text-primary' : 'text-text-muted'}`}>{label}</span>
                        <span className="text-[9px] text-text-muted/70 leading-tight">{desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {tab === 'bases' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                  {BASES.map(({ key, label, icon, desc }) => {
                    const active = avatarBase === key;
                    return (
                      <button key={key} type="button" onClick={() => onSelectBase(key)}
                        className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                          active ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm' : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{icon}</span>
                          {active && <Check size={12} className="text-primary stroke-[3]" />}
                        </div>
                        <span className={`text-xs font-bold ${active ? 'text-primary' : 'text-text-muted'}`}>{label}</span>
                        <span className="text-[9px] text-text-muted/70 leading-tight">{desc}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-7 py-5 border-t border-gray-100 flex justify-end">
              <button onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-sm rounded-xl shadow-md shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2">
                <Sparkles size={14} />
                Xác nhận lựa chọn
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────
   5. MAIN PROFILE VIEW
   ────────────────────────────────────────── */
const PRESETS = [
  { name: 'Sparkle Stars', url: 'https://media.giphy.com/media/L8n8gU7n2gRBs1eTgd/giphy.gif' },
  { name: 'Cyber Neon',    url: 'https://media.giphy.com/media/l41JWR8v5J77O0u4w/giphy.gif'  },
  { name: 'Pixel Cat',     url: 'https://media.giphy.com/media/I17tZ21T4gnN9n2s5x/giphy.gif' },
];

export default function ProfileView() {
  const { t } = useLanguage();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId]       = useState('');
  const [email, setEmail]         = useState('');
  const [fullName, setFullName]   = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFrame, setAvatarFrame]   = useState('none');
  const [avatarEffect, setAvatarEffect] = useState('none');
  const [avatarBase, setAvatarBase]     = useState('none');
  const [role, setRole]     = useState('marketer_content');
  const [status, setStatus] = useState('active');

  const [isDragging,  setIsDragging]  = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isLoading,   setIsLoading]   = useState(true);
  const [isSaving,    setIsSaving]    = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showDialog,   setShowDialog]   = useState(false);
  const [dialogTab,    setDialogTab]    = useState<'effects' | 'bases'>('effects');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;

        setUserId(user.id);
        setEmail(user.email || '');

        const meta = user.user_metadata || {};
        setFullName(meta.full_name || '');
        setDepartment(meta.department || '');
        setAvatarFrame(meta.avatar_frame || 'none');
        setAvatarEffect(meta.avatar_effect || 'none');
        setAvatarBase(meta.avatar_base || 'none');

        const { data: profile } = await supabase
          .from('users')
          .select('role, status, avatars')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setRole(profile.role || 'marketer_content');
          setStatus(profile.status || 'active');
          setAvatarUrl(profile.avatars || '');
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const getInitials = () => {
    if (fullName) {
      const p = fullName.trim().split(' ');
      return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'JS';
  };

  const uploadFile = async (file: File) => {
    if (!userId) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const ext  = file.name.split('.').pop() || 'png';
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) { setUploadError('Upload thất bại: ' + error.message); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl + `?t=${Date.now()}`);
    } catch {
      setUploadError('Lỗi upload, vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Lưu avatar URL vào users table
      await supabase.from('users').update({ avatars: avatarUrl }).eq('id', userId);
      // Lưu frame, effect, base vào user_metadata (sync qua Supabase Auth → hoạt động mọi thiết bị)
      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          department,
          avatar_frame: avatarFrame,
          avatar_effect: avatarEffect,
          avatar_base: avatarBase,
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm text-text-muted font-medium">{t('common.loading')}</span>
      </div>
    );
  }

  const currentEffectLabel = EFFECTS.find(e => e.key === avatarEffect)?.label ?? 'Không hiệu ứng';
  const currentBaseLabel   = BASES.find(b => b.key === avatarBase)?.label ?? 'Không bệ đỡ';

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight flex items-center gap-3">
          <span>{t('profile.title')}</span>
          <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold uppercase tracking-wider">Lumina Engine</span>
        </h1>
        <p className="text-text-muted">Cá nhân hóa tài khoản với hiệu ứng thời tiết, khung viền và bệ đỡ lung linh.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-12 gap-8 items-stretch">
        {/* ── LEFT: Live Preview ── */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200/60 rounded-[32px] p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8">
              <AvatarPreview
                avatarUrl={avatarUrl}
                initials={getInitials()}
                frame={avatarFrame}
                effect={avatarEffect}
                base={avatarBase}
                size={160}
              />
            </div>
            <h2 className="text-2xl font-black text-text tracking-tight mb-1">{fullName || t('profile.guest')}</h2>
            <p className="text-xs text-text-muted font-medium mb-3 flex items-center gap-1.5 justify-center">
              <Mail size={12} className="text-gray-400" />{email}
            </p>
            {department && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F3F4FD] text-primary border border-primary/10 text-xs font-bold rounded-full mb-6">
                <Briefcase size={12} />{department}
              </span>
            )}
            <div className="w-full border-t border-gray-100 pt-6 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted flex items-center gap-1.5 font-medium"><Shield size={13} className="text-gray-400" />{t('profile.roleLabel')}:</span>
                <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px]">{role.replace('marketer_', '')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted flex items-center gap-1.5 font-medium"><UserCheck size={13} className="text-gray-400" />{t('profile.statusLabel')}:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider text-[10px] ${status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Edit Form ── */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200/60 rounded-[32px] p-8 shadow-sm flex flex-col gap-6">
          {/* Name + Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted flex items-center gap-1.5"><User size={14} className="text-primary" />{t('profile.displayName')}</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text font-semibold transition-all"
                placeholder="Ví dụ: Trung Lê Hải" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted flex items-center gap-1.5"><Briefcase size={14} className="text-primary" />{t('profile.department')}</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-text font-semibold transition-all"
                placeholder="Ví dụ: Marketing, Content Creator..." />
            </div>
          </div>

          {/* Avatar Upload */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-text mb-3">🖼️ Tải lên Ảnh Đại diện & GIF</h3>
            <input type="file" ref={fileInputRef} accept="image/gif,image/png,image/jpeg,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-2 ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200 hover:border-primary/40 hover:bg-gray-50/50'}`}
            >
              {isUploading ? (<><Loader2 size={24} className="text-primary animate-spin" /><span className="text-xs text-primary font-bold">Đang tải lên hệ thống...</span></>)
                : (<><Upload size={24} className={isDragging ? 'text-primary' : 'text-gray-400'} /><span className="text-xs font-bold text-text">{isDragging ? 'Thả tệp vào đây!' : 'Kéo thả GIF/ảnh hoặc click để chọn'}</span><span className="text-[10px] text-text-muted">GIF · PNG · JPG · WebP</span></>)}
            </div>
            {uploadError && <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold mt-2"><X size={14} />{uploadError}</div>}
            <input type="text" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
              className="w-full mt-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-text font-medium"
              placeholder="Hoặc dán link ảnh trực tuyến (https://...)" />
            <div className="mt-3 flex gap-2 items-center">
              {PRESETS.map((g, i) => (
                <button key={i} type="button" onClick={() => setAvatarUrl(g.url)}
                  className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all hover:scale-110 ${avatarUrl === g.url ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 hover:border-primary/50'}`}>
                  <img src={g.url} alt={g.name} className="w-full h-full object-cover" />
                </button>
              ))}
              {avatarUrl && (
                <button type="button" onClick={() => setAvatarUrl('')}
                  className="w-11 h-11 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-all group">
                  <X size={15} className="text-gray-400 group-hover:text-red-400" />
                </button>
              )}
            </div>
          </div>

          {/* Frame selector */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-bold text-text mb-3">✨ {t('profile.avatarFrame')}</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {FRAMES.map(({ key, label, icon, ringClass, description }) => {
                const active = avatarFrame === key;
                let cls = 'border-gray-100 hover:bg-gray-50 text-text-muted';
                if (active) cls = key === 'rainbow' ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-400 text-purple-700' : key === 'gold' ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-400 text-amber-700' : key === 'cyber' ? 'border-cyan-400 bg-cyan-50 ring-1 ring-cyan-400 text-cyan-700' : 'border-primary bg-primary/5 ring-1 ring-primary text-primary';
                return (
                  <button key={key} type="button" onClick={() => setAvatarFrame(key)}
                    className={`text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 justify-between ${cls}`}>
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base relative overflow-hidden shrink-0">
                        {ringClass && <div className={`absolute inset-0 rounded-full ${ringClass}`} />}
                        <span className="relative z-10">{icon}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{t(`profile.${label}`)}</span>
                        <span className="text-[9px] text-text-muted/70">{description}</span>
                      </div>
                    </div>
                    {active && <Check size={12} className="stroke-[3] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Effect + Base — show 3 + "More" button */}
          <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Effects Column */}
            <div>
              <h3 className="text-sm font-bold text-text mb-3">🌦️ Hiệu ứng thời tiết</h3>
              <div className="flex flex-col gap-2">
                {EFFECTS.slice(0, 3).map(({ key, label, icon, desc }) => {
                  const active = avatarEffect === key;
                  return (
                    <button key={key} type="button" onClick={() => setAvatarEffect(key)}
                      className={`text-left p-3 rounded-xl border transition-all flex items-center gap-2.5 ${active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <span className="text-base shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold block truncate ${active ? 'text-primary' : 'text-text-muted'}`}>{label}</span>
                        <span className="text-[9px] text-text-muted/70 truncate block">{desc}</span>
                      </div>
                      {active && <Check size={11} className="text-primary stroke-[3] shrink-0" />}
                    </button>
                  );
                })}
                <button type="button" onClick={() => { setDialogTab('effects'); setShowDialog(true); }}
                  className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary text-xs font-bold transition-all group">
                  <span>Xem thêm {EFFECTS.length - 3} hiệu ứng khác</span>
                  <div className="flex items-center gap-1 text-[10px] bg-primary/10 px-2 py-1 rounded-full group-hover:bg-primary/20 transition-colors">
                    {EFFECTS.slice(3, 6).map(e => e.icon).join(' ')} <ChevronRight size={10} />
                  </div>
                </button>
                {/* Active indicator */}
                {avatarEffect !== 'none' && (
                  <div className="text-[10px] text-primary font-bold flex items-center gap-1">
                    <Check size={10} className="stroke-[3]" />
                    Đang dùng: {currentEffectLabel}
                  </div>
                )}
              </div>
            </div>

            {/* Bases Column */}
            <div>
              <h3 className="text-sm font-bold text-text mb-3">🏺 Bệ đỡ chân avatar</h3>
              <div className="flex flex-col gap-2">
                {BASES.slice(0, 3).map(({ key, label, icon, desc }) => {
                  const active = avatarBase === key;
                  return (
                    <button key={key} type="button" onClick={() => setAvatarBase(key)}
                      className={`text-left p-3 rounded-xl border transition-all flex items-center gap-2.5 ${active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <span className="text-base shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-bold block truncate ${active ? 'text-primary' : 'text-text-muted'}`}>{label}</span>
                        <span className="text-[9px] text-text-muted/70 truncate block">{desc}</span>
                      </div>
                      {active && <Check size={11} className="text-primary stroke-[3] shrink-0" />}
                    </button>
                  );
                })}
                <button type="button" onClick={() => { setDialogTab('bases'); setShowDialog(true); }}
                  className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary text-xs font-bold transition-all group">
                  <span>Xem thêm {BASES.length - 3} bệ đỡ khác</span>
                  <div className="flex items-center gap-1 text-[10px] bg-primary/10 px-2 py-1 rounded-full group-hover:bg-primary/20 transition-colors">
                    {BASES.slice(3, 6).map(b => b.icon).join(' ')} <ChevronRight size={10} />
                  </div>
                </button>
                {avatarBase !== 'none' && (
                  <div className="text-[10px] text-primary font-bold flex items-center gap-1">
                    <Check size={10} className="stroke-[3]" />
                    Đang dùng: {currentBaseLabel}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto">
            <p className="text-[11px] text-text-muted/80 font-medium">
              * Hiệu ứng lưu vào Supabase Auth — hoạt động trên mọi thiết bị sau khi đăng nhập.
            </p>
            <button type="submit" disabled={isSaving || isUploading}
              className="w-full md:w-auto px-8 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50">
              {isSaving ? <><Loader2 size={14} className="animate-spin" />{t('profile.saving')}</> : <><Sparkles size={14} className="animate-pulse" />{t('profile.saveChanges')}</>}
            </button>
          </div>

          <AnimatePresence>
            {saveSuccess && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2 justify-center">
                ✓ {t('profile.saved')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </form>

      {/* Effect Picker Dialog */}
      <EffectPickerDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        defaultTab={dialogTab}
        avatarFrame={avatarFrame}
        avatarUrl={avatarUrl}
        initials={getInitials()}
        avatarEffect={avatarEffect}
        avatarBase={avatarBase}
        onSelectEffect={setAvatarEffect}
        onSelectBase={setAvatarBase}
      />
    </div>
  );
}
