"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Settings, LogOut, ChevronDown, User, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { signout } from '@/app/(dashboard)/actions';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const FRAMES = [
  { key: 'none',    ringClass: '' },
  { key: 'rainbow', ringClass: 'ring-rainbow' },
  { key: 'gold',    ringClass: 'ring-gold'    },
  { key: 'cyber',   ringClass: 'ring-cyber'   },
];

function getRingClass(frame: string) {
  return FRAMES.find(f => f.key === frame)?.ringClass ?? '';
}

function AvatarDisplay({
  avatarUrl, initials, frame, size = 44,
}: { avatarUrl: string; initials: string; frame: string; size?: number }) {
  const ringClass = getRingClass(frame);
  const pad = 3;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {ringClass && (
        <div
          className={`absolute rounded-full ${ringClass}`}
          style={{ inset: -pad, borderRadius: '50%' }}
        />
      )}
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
      </div>
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
          <AvatarDisplay avatarUrl={avatarUrl} initials={getInitials()} frame={avatarFrame} size={42} />
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
                  <AvatarDisplay avatarUrl={avatarUrl} initials={getInitials()} frame={avatarFrame} size={44} />
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

                  <form action={signout} className="m-0">
                    <button
                      type="submit"
                      className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut size={12} />
                      <span>{t('sidebar.logout')}</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
