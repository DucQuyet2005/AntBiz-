"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Check, Loader2, Sparkles, User, Briefcase, Mail, Shield, UserCheck, Key, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import PopupDialog, { PopupType } from '@/components/PopupDialog';

/* ──────────────────────────────────────────
   1. STATIC PARTICLE POSITION DATA
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
  { key: 'none',    ringClass: '' },
  { key: 'rainbow', ringClass: 'ring-rainbow' },
  { key: 'gold',    ringClass: 'ring-gold' },
  { key: 'cyber',   ringClass: 'ring-cyber' },
];

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
      {ringClass && size > 80 && (
        <div className={`absolute rounded-full opacity-50 blur-lg ${ringClass}`} style={{ inset: -pad * 2, borderRadius: '50%' }} />
      )}
      {ringClass && (
        <div className={`absolute rounded-full ${ringClass}`} style={{ inset: -pad, borderRadius: '50%' }} />
      )}
      <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-gray-200" style={{ zIndex: 1, border: size > 80 ? '4px solid white' : '2px solid white', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1)' }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <span className="text-gray-500 font-extrabold select-none" style={{ fontSize: size * 0.35 }}>
            {initials}
          </span>
        )}
        <EffectParticles effect={effect} />
        <BaseDecor base={base} />
      </div>
      <FrameOrbitParticles frame={frame} size={size} />
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

export default function ChangePasswordView() {
  const { t } = useLanguage();
  const supabase = createClient();

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
  const [isLoading, setIsLoading] = useState(true);

  // Form password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Popup state
  const [popup, setPopup] = useState<{ isOpen: boolean; message: string; type: PopupType }>({
    isOpen: false, message: '', type: 'info'
  });

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
          // Nếu DB vẫn là 'pending' nhưng user đã đăng nhập thành công → hiển thị là 'active'
          setStatus(profile.status === 'pending' ? 'active' : (profile.status || 'active'));
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

  const requirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };
  const isPasswordStrong = Object.values(requirements).every(Boolean);
  const passwordsMatch = newPassword !== '' && newPassword === confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      setPopup({ isOpen: true, message: 'Vui lòng nhập mật khẩu hiện tại.', type: 'warning' });
      return;
    }

    if (!isPasswordStrong) {
      setPopup({ isOpen: true, message: 'Mật khẩu mới không đáp ứng đủ yêu cầu bảo mật.', type: 'warning' });
      return;
    }

    if (!passwordsMatch) {
      setPopup({ isOpen: true, message: 'Mật khẩu xác nhận không trùng khớp.', type: 'warning' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Đổi mật khẩu thất bại.');
      }

      setPopup({ isOpen: true, message: 'Đổi mật khẩu thành công! Hệ thống sẽ đăng xuất sau 3 giây.', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.replace('/login?reset=success');
      }, 3000);
    } catch (err: any) {
      setPopup({ isOpen: true, message: err.message || 'Có lỗi xảy ra.', type: 'error' });
    } finally {
      setIsChangingPassword(false);
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

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="mt-2">
        <h1 className="text-4xl font-bold text-text mb-1 tracking-tight flex items-center gap-3">
          <span>🔒 Đổi mật khẩu tài khoản</span>
        </h1>
        <p className="text-text-muted">Cập nhật mật khẩu mới để tăng cường bảo mật cho tài khoản của bạn.</p>
      </div>

      <div className="grid grid-cols-12 gap-8 items-stretch">
        {/* ── LEFT: Live Preview ── */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-gray-200/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center w-full">
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
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/10 text-primary border border-primary/10 text-xs font-bold rounded-full mb-6">
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

            {/* Back to Profile details */}
            <Link
              href="/profile"
              className="mt-6 w-full py-3 px-4 border border-gray-200 hover:border-primary/50 hover:bg-primary/5 text-slate-700 hover:text-primary font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
            >
              <User size={14} />
              <span>Chỉnh sửa thông tin cá nhân</span>
            </Link>
          </div>
        </div>

        {/* ── RIGHT: Password Change Form ── */}
        <div className="col-span-12 lg:col-span-8 bg-white border border-gray-200/60 rounded-2xl p-8 shadow-sm flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-primary/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-6 h-full justify-between">
            <div>
              <h2 className="text-xl font-black text-text flex items-center gap-2 mb-2">
                <Key className="text-primary w-5 h-5" />
                <span>Đổi mật khẩu tài khoản</span>
              </h2>
              <p className="text-xs text-text-muted">Nhập mật khẩu hiện tại cùng mật khẩu mới của bạn bên dưới.</p>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-6">
              <div className="flex flex-col gap-5">
                {/* Mật khẩu hiện tại */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-bold text-text-muted">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="w-full bg-gray-50/50 dark:bg-black/50 hover:bg-gray-50 dark:hover:bg-slate-950 border border-gray-200 dark:border-white/5 rounded-2xl pl-4 pr-11 py-3.5 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none text-text font-semibold transition-all"
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text transition-colors rounded focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                    >
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Mật khẩu mới */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-bold text-text-muted">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-gray-50/50 dark:bg-black/50 hover:bg-gray-50 dark:hover:bg-slate-955 border border-gray-200 dark:border-white/5 rounded-2xl pl-4 pr-11 py-3.5 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none text-text font-semibold transition-all"
                      placeholder="Nhập mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text transition-colors rounded focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Xác nhận mật khẩu mới */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-xs font-bold text-text-muted">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-50/50 dark:bg-black/50 hover:bg-gray-50 dark:hover:bg-slate-955 border border-gray-200 dark:border-white/5 rounded-2xl pl-4 pr-11 py-3.5 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus:outline-none text-text font-semibold transition-all"
                      placeholder="Xác nhận mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text transition-colors rounded focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Validation strength indicators */}
              {newPassword.length > 0 && (
                <div className="bg-gray-50 dark:bg-zinc-900/40 border border-gray-200/50 dark:border-white/5 rounded-2xl p-4 flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-text">Yêu cầu bảo mật mật khẩu mới:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[
                      { key: 'length', label: 'Tối thiểu 8 ký tự' },
                      { key: 'uppercase', label: 'Chữ hoa (A-Z)' },
                      { key: 'lowercase', label: 'Chữ thường (a-z)' },
                      { key: 'number', label: 'Chữ số (0-9)' },
                      { key: 'special', label: 'Ký tự đặc biệt' }
                    ].map(req => {
                      const met = requirements[req.key as keyof typeof requirements];
                      return (
                        <div key={req.key} className="flex items-center gap-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${met ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-450' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                            {met ? <Check size={10} className="stroke-[3]" /> : <span className="text-[9px] font-black">×</span>}
                          </div>
                          <span className={`text-[10px] font-semibold ${met ? 'text-emerald-700 dark:text-emerald-450' : 'text-rose-700 dark:text-rose-400'}`}>{req.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className="border-t border-gray-200/60 dark:border-white/5 pt-2 flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${passwordsMatch ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-450' : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                        {passwordsMatch ? <Check size={10} className="stroke-[3]" /> : <span className="text-[9px] font-black">×</span>}
                      </div>
                      <span className={`text-[10px] font-semibold ${passwordsMatch ? 'text-emerald-700 dark:text-emerald-450' : 'text-rose-700 dark:text-rose-400'}`}>
                        {passwordsMatch ? 'Mật khẩu xác nhận trùng khớp' : 'Mật khẩu xác nhận không khớp'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-3 mt-auto">
                <button
                  type="submit"
                  disabled={isChangingPassword || !currentPassword || !isPasswordStrong || !passwordsMatch}
                  className="w-full md:w-auto px-8 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none"
                >
                  {isChangingPassword ? (
                    <><Loader2 size={14} className="animate-spin" />Đang cập nhật...</>
                  ) : (
                    <><Sparkles size={14} className="animate-pulse" />Đổi mật khẩu</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <PopupDialog
        isOpen={popup.isOpen}
        onClose={() => setPopup(prev => ({ ...prev, isOpen: false }))}
        message={popup.message}
        type={popup.type}
      />
    </div>
  );
}
