"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Clock, Activity, Shield, KeyRound, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

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
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?action=${actionFilter}&page=${page}&limit=20`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const json = await res.json();
      setLogs(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
    } catch (err) {
      console.error('Audit logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionLabel = (action: string) => {
    switch(action) {
      case 'change_role': return { label: t('admin.actionChangeRole'), icon: <Shield className="w-4 h-4 text-purple-600" />, color: 'bg-purple-100 text-purple-700' };
      case 'lock_account': return { label: t('admin.actionLock'), icon: <KeyRound className="w-4 h-4 text-rose-600" />, color: 'bg-rose-100 text-rose-700' };
      case 'unlock_account': return { label: t('admin.actionUnlock'), icon: <KeyRound className="w-4 h-4 text-emerald-600" />, color: 'bg-emerald-100 text-emerald-700' };
      default: return { label: action, icon: <Activity className="w-4 h-4 text-slate-600" />, color: 'bg-slate-100 text-slate-700' };
    }
  };

  const formatJSON = (obj: any) => {
    if (!obj) return 'None';
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions & Filters */}
      <div className="bg-white rounded-[20px] p-6 border border-slate-200/60 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
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
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="all">{t('admin.allActions')}</option>
              <option value="change_role">{t('admin.actionChangeRole')}</option>
              <option value="lock_account">{t('admin.actionLock')}</option>
              <option value="unlock_account">{t('admin.actionUnlock')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="bg-white rounded-[20px] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
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
          <div className="flex flex-col divide-y divide-slate-100">
            {logs.map((log) => {
              const { label, icon, color } = getActionLabel(log.action);
              const isExpanded = expandedId === log.id;
              
              return (
                <div key={log.id} className="group flex flex-col hover:bg-slate-50/50 transition-colors">
                  <div 
                    className="p-5 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
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
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 pl-[76px] grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('admin.beforeState')}</span>
                        <pre className="bg-slate-50 text-slate-600 text-xs p-4 rounded-xl font-mono overflow-x-auto border border-slate-200/50">
                          {formatJSON(log.before_value)}
                        </pre>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('admin.afterState')}</span>
                        <pre className="bg-primary/5 text-primary text-xs p-4 rounded-xl font-mono overflow-x-auto border border-primary/10">
                          {formatJSON(log.after_value)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="border-t border-slate-100 p-4 flex items-center justify-between bg-slate-50/50">
            <span className="text-sm font-semibold text-slate-500 ml-2">
              {t('admin.pageInfo').replace('{page}', page.toString()).replace('{totalPages}', (totalPages || 1).toString())}
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm font-bold rounded-lg transition-colors shadow-sm"
              >
                {t('admin.prevPage')}
              </button>
              <button 
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-sm font-bold rounded-lg transition-colors shadow-sm"
              >
                {t('admin.nextPage')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
