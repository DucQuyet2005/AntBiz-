"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import OverviewView from '@/components/views/OverviewView';
import AdminOverviewView from '@/components/views/AdminOverviewView';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OverviewPage() {
  const supabase = createClient();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showAdminView, setShowAdminView] = useState(false);

  useEffect(() => {
    async function checkUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const meta = user.user_metadata || {};
          setUserName(meta.full_name || user.email?.split('@')[0] || 'AntBiz Creator');

          const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            setUserRole(data.role);
            if (data.role === 'admin') {
              setShowAdminView(true);
            }
          }
        }
      } catch (err) {
        console.error('Error checking user role in overview:', err);
      } finally {
        setLoading(false);
      }
    }
    checkUserRole();
  }, []);

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {language === 'vi' ? 'Đang tải thông tin...' : 'Loading information...'}
        </span>
      </div>
    );
  }

  if (userRole === 'admin' && showAdminView) {
    return (
      <AdminOverviewView 
        onSwitchView={() => setShowAdminView(false)} 
        userName={userName} 
      />
    );
  }

  // Regular user view (marketer_full, marketer_content) or admin switched to user view
  return (
    <OverviewView 
      isAdmin={userRole === 'admin'} 
      onSwitchView={() => setShowAdminView(true)} 
    />
  );
}
