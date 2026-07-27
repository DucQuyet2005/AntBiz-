"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Clock, Activity, Shield, KeyRound, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';

type AuditLog = {
  id: string;
  action: string;
  before_value: any;
  after_value: any;
  created_at: string;
  actor_email: string;
  target_email: string;
};

export default function AuditLogsPage() {
  const { t, language } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?action=${actionFilter}&page=${page}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const json = await res.json();
      setLogs(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
      setTotalLogs(json.meta?.total || 0);
    } catch (err) {
      console.error('Audit logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Scroll to top when page changes
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page]);

  const getActionLabel = (action: string) => {
    switch(action) {
      case 'change_role': return { label: t('admin.actionChangeRole'), icon: <Shield className="w-4 h-4 text-purple-600" />, color: 'bg-purple-100 text-purple-700' };
      case 'lock_account': return { label: t('admin.actionLock'), icon: <KeyRound className="w-4 h-4 text-rose-600" />, color: 'bg-rose-100 text-rose-700' };
      case 'unlock_account': return { label: t('admin.actionUnlock'), icon: <KeyRound className="w-4 h-4 text-emerald-600" />, color: 'bg-emerald-100 text-emerald-700' };
      case 'publish_post_success': return { label: t('admin.actionPublishPostSuccess'), icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, color: 'bg-emerald-100 text-emerald-700' };
      case 'publish_post_failed': return { label: t('admin.actionPublishPostFailed'), icon: <XCircle className="w-4 h-4 text-rose-600" />, color: 'bg-rose-100 text-rose-700' };
      default: return { label: action, icon: <Activity className="w-4 h-4 text-slate-600" />, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const formatJSON = (obj: any) => {
    if (!obj) return 'None';
    return JSON.stringify(obj, null, 2);
  };

  const renderE2EDescription = (log: AuditLog) => {
    if (log.action === 'publish_post_success') {
      const postTitle = log.after_value?.postTitle || t('admin.unknownTitle');
      const details = log.after_value?.details || '';
      let platform = t('admin.socialPlatform');
      if (details.toLowerCase().includes('facebook')) platform = 'Facebook';
      else if (details.toLowerCase().includes('instagram')) platform = 'Instagram';
      else if (details.toLowerCase().includes('thread')) platform = 'Threads';
      
      const publishDate = log.after_value?.timestamp 
        ? new Date(log.after_value.timestamp).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')
        : new Date(log.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
        
      return (
        <div className="flex-1 text-xs text-slate-650 dark:text-slate-300 p-4 rounded-xl bg-primary/5 border border-primary/10 dark:border-primary/20 leading-relaxed font-semibold flex flex-col justify-between">
          <div>
            <p className="mb-2 text-[10px] text-primary uppercase tracking-wider font-black">{t('admin.publishInfo')}</p>
            <div className="flex flex-col gap-1.5">
              <div>{t('admin.titleLabel')}: <span className="text-slate-900 dark:text-white font-bold">"{postTitle}"</span></div>
              <div>{t('admin.platformLabel')}: <span className="text-primary font-bold">{platform}</span></div>
              <div>{t('admin.timeLabel')}: <span className="text-slate-800 dark:text-slate-200">{publishDate}</span></div>
            </div>
          </div>
        </div>
      );
    }
    
    if (log.action === 'lock_account') {
      const reason = log.after_value?.reason || t('admin.noSpecificReason');
      return (
        <div className="flex-1 text-xs text-slate-650 dark:text-slate-305 p-4 rounded-xl bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/10 dark:border-rose-900/20 leading-relaxed font-semibold flex flex-col justify-between">
          <div>
            <p className="mb-2 text-[10px] text-rose-600 dark:text-rose-450 uppercase tracking-wider font-black">{t('admin.accountLocked')}</p>
            <div>{t('admin.reasonLabel')}: <span className="text-rose-600 dark:text-rose-400 font-bold">"{reason}"</span></div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const renderE2EBeforeDescription = (log: AuditLog) => {
    if (log.action === 'lock_account') {
      return (
        <div className="flex-1 text-xs text-slate-650 dark:text-slate-300 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-100/50 dark:border-white/5 leading-relaxed font-semibold flex flex-col justify-between">
          <div>
            <p className="mb-2 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-black">{t('admin.beforeState')}</p>
            <div>{t('admin.statusLabel')}: <span className="text-emerald-600 dark:text-emerald-450 font-bold">{t('admin.activeStatus')}</span></div>
          </div>
        </div>
      );
    }
    
    if (log.action === 'publish_post_success') {
      return (
        <div className="flex-1 text-xs text-slate-650 dark:text-slate-300 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-100/50 dark:border-white/5 leading-relaxed font-semibold flex flex-col justify-between">
          <div>
            <p className="mb-2 text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-black">{t('admin.beforeState')}</p>
            <div>{t('admin.statusLabel')}: <span className="text-amber-650 dark:text-amber-450 font-bold">{t('admin.pendingStatus')}</span></div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions & Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">{t('admin.systemLogs')}</h2>
            <p className="text-xs text-slate-500 font-medium">{t('admin.systemLogsDesc')}</p>
          </div>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select 
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none appearance-none cursor-pointer"
            >
              <option value="all">{t('admin.allActions')}</option>
              <option value="change_role">{t('admin.actionChangeRole')}</option>
              <option value="lock_account">{t('admin.actionLock')}</option>
              <option value="unlock_account">{t('admin.actionUnlock')}</option>
              <option value="publish_post_success">{t('admin.actionPublishPostSuccess')}</option>
              <option value="publish_post_failed">{t('admin.actionPublishPostFailed')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div style={{ minHeight: totalPages > 1 ? '920px' : undefined }} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
        {loading && logs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <span className="font-medium text-sm">{t('admin.loading')}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <Activity className="w-12 h-12 mb-4 text-slate-300 opacity-50" />
            <span className="font-medium">{t('admin.noLogs')}</span>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 flex-1">
            {logs.map((log) => {
              const { label, icon, color } = getActionLabel(log.action);
              const isExpanded = expandedId === log.id;
              const canExpand = log.action !== 'unlock_account';
              
              return (
                <div key={log.id} className={`group flex flex-col hover:bg-slate-50/50 dark:hover:!bg-transparent transition-colors ${!canExpand ? 'pointer-events-none select-none' : ''}`}>
                  <div 
                    className={`p-5 flex items-center gap-4 ${
                      canExpand 
                        ? 'cursor-pointer focus-visible:bg-slate-50 dark:focus-visible:!bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40' 
                        : 'cursor-default'
                    }`}
                    onClick={() => {
                      if (canExpand) {
                        setExpandedId(isExpanded ? null : log.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (canExpand && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : log.id);
                      }
                    }}
                    tabIndex={canExpand ? 0 : -1}
                    role={canExpand ? "button" : undefined}
                    aria-expanded={canExpand ? isExpanded : undefined}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/50 shadow-sm ${color}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-slate-800">{label}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-semibold text-slate-500">{t('admin.target')}<strong className="text-slate-700">{log.target_email}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <span>{t('admin.by')}<strong>{log.actor_email}</strong></span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      <div className="text-slate-400 mt-1">
                        {canExpand && (isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && canExpand && (
                    <div className="px-5 pb-5 pt-2 pl-[76px] grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col h-full">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('admin.beforeState')}</span>
                        {renderE2EBeforeDescription(log) ? (
                          renderE2EBeforeDescription(log)
                        ) : (
                          <pre className="flex-1 bg-slate-50 text-slate-600 text-xs p-4 rounded-xl font-mono overflow-x-auto border border-slate-200/50">
                            {formatJSON(log.before_value)}
                          </pre>
                        )}
                      </div>
                      <div className="flex flex-col h-full">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('admin.afterState')}</span>
                        {renderE2EDescription(log) ? (
                          renderE2EDescription(log)
                        ) : (
                          <pre className="flex-1 bg-primary/5 text-primary text-xs p-4 rounded-xl font-mono overflow-x-auto border border-primary/10">
                            {formatJSON(log.after_value)}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 dark:border-zinc-800/80 p-6 flex items-center justify-between select-none bg-slate-50/50 dark:bg-zinc-900/30">
            <div className="text-xs text-text-muted font-bold ml-2">
              {t('admin.showingLogs', {
                start: totalLogs === 0 ? 0 : (page - 1) * 10 + 1,
                end: Math.min(page * 10, totalLogs),
                total: totalLogs
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-2.5 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-2xl text-xs font-black transition-all active:scale-95 cursor-pointer ${
                    page === p
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'border border-gray-200/80 dark:border-zinc-800/80 text-text hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2.5 border border-gray-200/80 dark:border-zinc-800/80 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:pointer-events-none text-text-muted active:scale-95 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
