"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Settings, LogOut, ChevronDown, User, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { signout } from '@/app/(dashboard)/actions';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// Static particle positions — no Math.random() to avoid hydration mismatch
const RAIN_POS  = [
  { left: '8%',  delay: '0s',    dur: '0.82s' },
  { left: '24%', delay: '0.18s', dur: '0.96s' },
  { left: '40%', delay: '0.07s', dur: '0.74s' },
  { left: '56%', delay: '0.33s', dur: '0.88s' },
  { left: '72%', delay: '0.14s', dur: '1.0s'  },
  { left: '88%', delay: '0.45s', dur: '0.79s' },
];
const SNOW_POS  = [
  { left: '10%', size: '3px', delay: '0s',   dur: '2.6s' },
  { left: '30%', size: '4px', delay: '0.5s', dur: '3.0s' },
  { left: '50%', size: '2px', delay: '0.9s', dur: '2.4s' },
  { left: '70%', size: '3px', delay: '0.3s', dur: '2.8s' },
  { left: '88%', size: '2px', delay: '0.7s', dur: '3.2s' },
];
const SPARK_POS = [
  { left: '15%', size: '3px', delay: '0s',    dur: '1.6s' },
  { left: '35%', size: '4px', delay: '0.2s',  dur: '1.4s' },
  { left: '55%', size: '3px', delay: '0.5s',  dur: '1.8s' },
  { left: '75%', size: '2px', delay: '0.35s', dur: '1.5s' },
];
const BUBBLE_POS= [
  { left: '12%', size: '5px', delay: '0s',   dur: '2.3s' },
  { left: '35%', size: '6px', delay: '0.5s', dur: '2.7s' },
  { left: '58%', size: '4px', delay: '0.9s', dur: '2.1s' },
  { left: '80%', size: '5px', delay: '0.3s', dur: '2.5s' },
];
const ARCANE_POS= [
  { left: '15%', top: '30%', size: '5px', delay: '0s',   dur: '3.0s' },
  { left: '40%', top: '55%', size: '4px', delay: '0.6s', dur: '2.7s' },
  { left: '65%', top: '25%', size: '5px', delay: '1.1s', dur: '3.2s' },
  { left: '85%', top: '65%', size: '4px', delay: '0.4s', dur: '2.9s' },
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
const GRASS_FLOWERS = [
  { left: '12%', bottom: '6px', scale: 0.95 },
  { left: '28%', bottom: '3px', scale: 1.1 },
  { left: '42%', bottom: '5px', scale: 0.8 },
  { left: '56%', bottom: '8px', scale: 1.15 },
  { left: '72%', bottom: '4px', scale: 1.0 },
  { left: '88%', bottom: '7px', scale: 0.9 },
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

// ==========================================
// HELPERS FOR IN-AVATAR EFFECTS
// ==========================================
function EffectOverlay({ effect }: { effect: string }) {
  if (!effect || effect === 'none') return null;

  if (effect === 'rain') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        {RAIN_POS.map((p, i) => (
          <div key={i} className="av-rain" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.dur }} />
        ))}
      </div>
    );
  }
  
  if (effect === 'snow') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        {SNOW_POS.map((p, i) => (
          <div key={i} className="av-snow" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
        ))}
      </div>
    );
  }
  
  if (effect === 'sunny') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        <div className="av-sunbeam" />
        <div className="av-sundust" style={{ animationDelay: '0s', animationDuration: '5s' }} />
        <div className="av-sundust" style={{ animationDelay: '1.5s', left: '65%', top: '35%' }} />
      </div>
    );
  }

  if (effect === 'sakura') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        {[{l:'10%',s:'6px',d:'0s',dr:'3.2s'},{l:'32%',s:'5px',d:'0.5s',dr:'3.8s'},{l:'55%',s:'6px',d:'1.0s',dr:'3.4s'},{l:'78%',s:'5px',d:'0.3s',dr:'4.0s'}].map((p,i) => (
          <div key={i} className="av-sakura" style={{ left: p.l, width: p.s, height: p.s, animationDelay: p.d, animationDuration: p.dr }} />
        ))}
      </div>
    );
  }

  if (effect === 'meteor') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        {[{t:'15%',w:'26px',d:'0s',dr:'2.0s'},{t:'45%',w:'20px',d:'0.9s',dr:'1.7s'}].map((p,i) => (
          <div key={i} className="av-meteor" style={{ top: p.t, width: p.w, right: '5%', animationDelay: p.d, animationDuration: p.dr }} />
        ))}
      </div>
    );
  }

  if (effect === 'camp') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        {SPARK_POS.map((p, i) => (
          <div key={i} className="av-spark" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
        ))}
      </div>
    );
  }

  if (effect === 'bubble') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        {BUBBLE_POS.map((p, i) => (
          <div key={i} className="av-bubble" style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
        ))}
      </div>
    );
  }

  if (effect === 'arcane') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        {ARCANE_POS.map((p, i) => (
          <div key={i} className="av-arcane" style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }} />
        ))}
      </div>
    );
  }

  if (effect === 'lightning') {
    return <div className="av-lightning rounded-full" style={{ zIndex: 2 }} />;
  }

  if (effect === 'autumn') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full" style={{ zIndex: 2 }}>
        {[{l:'12%',s:'6px',d:'0s',dr:'3.8s'},{l:'38%',s:'5px',d:'0.7s',dr:'4.2s'},{l:'65%',s:'6px',d:'1.3s',dr:'3.5s'}].map((p,i) => (
          <div key={i} className="av-autumn" style={{ left: p.l, width: p.s, height: p.s, animationDelay: p.d, animationDuration: p.dr }} />
        ))}
      </div>
    );
  }

  return null;
}

// ==========================================
// HELPERS FOR BASE DECORATIONS
// ==========================================
function BaseOverlay({ base }: { base: string }) {
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

const FRAMES = [
  { key: 'none',    ringClass: '' },
  { key: 'rainbow', ringClass: 'ring-rainbow' },
  { key: 'gold',    ringClass: 'ring-gold'    },
  { key: 'cyber',   ringClass: 'ring-cyber'   },
];

function getRingClass(frame: string) {
  return FRAMES.find(f => f.key === frame)?.ringClass ?? '';
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

function AvatarDisplay({
  avatarUrl, initials, frame, effect = 'none', base = 'none', size = 44,
}: { avatarUrl: string; initials: string; frame: string; effect?: string; base?: string; size?: number }) {
  const ringClass = getRingClass(frame);
  const pad = 3;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Ring chính đằng sau */}
      {ringClass && (
        <div
          className={`absolute rounded-full ${ringClass}`}
          style={{ inset: -pad, borderRadius: '50%' }}
        />
      )}
      {/* Avatar ở trên */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-gray-200 border-2 border-white shadow-sm"
        style={{ zIndex: 1 }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="text-gray-600 font-bold select-none" style={{ fontSize: size * 0.35 }}>
            {initials}
          </span>
        )}
        
        {/* Render overlay hiệu ứng thời tiết bên trong avatar */}
        <EffectOverlay effect={effect} />

        {/* Hiệu ứng bệ đỡ đáy avatar */}
        <BaseOverlay base={base} />
      </div>

      {/* Dynamic orbits/particles */}
      <FrameOrbitParticles frame={frame} size={size} />

      {ringClass && (
        <span
          className="absolute text-[10px] animate-bounce pointer-events-none"
          style={{ top: -6, right: -6, zIndex: 2 }}
        >
          ✨
        </span>
      )}
    </div>
  );
}

export default function UserProfileDropdown() {
  const { t } = useLanguage();
  const supabase = createClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  // User state
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFrame, setAvatarFrame] = useState('none');
  const [avatarEffect, setAvatarEffect] = useState('none');
  const [avatarBase, setAvatarBase] = useState('none');
  const [role, setRole] = useState('marketer_content');
  const [isLoading, setIsLoading] = useState(true);

  // Load user data
  const loadUserData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;

      setUserId(user.id);
      setEmail(user.email || '');

      const meta = user.user_metadata || {};
      setFullName(meta.full_name || '');
      setAvatarFrame(meta.avatar_frame || 'none');
      setAvatarEffect(meta.avatar_effect || 'none');
      setAvatarBase(meta.avatar_base || 'none');

      const { data: profile } = await supabase
        .from('users')
        .select('role, avatars')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setRole(profile.role || 'marketer_content');
        setAvatarUrl(profile.avatars || '');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('logging_out', 'true');
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  useEffect(() => {
    loadUserData();
  }, []);

  // Listen to focus or custom events if user changes profile on the page
  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const getInitials = () => {
    if (fullName) {
      const p = fullName.trim().split(' ');
      return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : fullName.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'JS';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 focus:outline-none group"
      >
        <div className="transition-transform duration-300 group-hover:scale-105">
          <AvatarDisplay 
            avatarUrl={avatarUrl} 
            initials={getInitials()} 
            frame={avatarFrame} 
            effect={avatarEffect}
            base={avatarBase}
            size={42} 
          />
        </div>
        <ChevronDown
          size={13}
          className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Mini Dropdown ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-[260px] bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-xl z-50 p-4 text-left"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs text-text-muted">{t('common.loading')}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {/* User Info Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <AvatarDisplay 
                    avatarUrl={avatarUrl} 
                    initials={getInitials()} 
                    frame={avatarFrame} 
                    effect={avatarEffect}
                    base={avatarBase}
                    size={44} 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-text text-sm truncate leading-tight">
                      {fullName || t('profile.guest')}
                    </p>
                    <p className="text-[10px] text-text-muted truncate mt-0.5">{email}</p>
                    <div className="mt-1">
                      <span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                        {role.replace('marketer_', '')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Action: Edit Profile Page Link */}
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-primary/10 transition-all text-center"
                >
                  <User size={13} />
                  <span>Chỉnh sửa Profile</span>
                </Link>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-[10px]">
                  <Link
                    href="/settings"
                    onClick={() => setIsOpen(false)}
                    className="text-text-muted hover:text-text flex items-center gap-1.5 transition-colors font-medium"
                  >
                    <Settings size={12} />
                    <span>{t('sidebar.settings')}</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-transparent border-0 p-0"
                  >
                    <LogOut size={12} />
                    <span>{t('sidebar.logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
