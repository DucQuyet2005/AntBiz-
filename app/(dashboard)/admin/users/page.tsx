"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Shield, ShieldAlert, Lock, Unlock, MoreVertical, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PopupDialog, { PopupType } from '@/components/PopupDialog';

import { useLanguage } from '@/contexts/LanguageContext';

type User = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string;
};

export default function AdminUsersPage() {
  const { t, language } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Toast state
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: PopupType }>({
    isOpen: false, message: '', type: 'info'
  });

  // Modal states
  const [roleModal, setRoleModal] = useState<{ isOpen: boolean; user: User | null; newRole: string }>({
    isOpen: false, user: null, newRole: ''
  });
  const [lockModal, setLockModal] = useState<{ isOpen: boolean; user: User | null; targetStatus: string; reason: string }>({
    isOpen: false, user: null, targetStatus: '', reason: ''
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}&status=${statusFilter}&page=${page}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const json = await res.json();
      setUsers(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
      setTotalUsers(json.meta?.total || 0);
    } catch (err) {
      setToast({ isOpen: true, message: 'Lỗi tải danh sách người dùng', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleRoleChangeRequest = (user: User, newRole: string) => {
    if (user.role === newRole) return;
    setRoleModal({ isOpen: true, user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!roleModal.user) return;
    const targetUser = roleModal.user;
    const targetRole = roleModal.newRole;

    // Tắt modal lập tức
    setRoleModal({ isOpen: false, user: null, newRole: '' });

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Update failed');
      }
      setToast({ isOpen: true, message: `Đã đổi quyền cho ${targetUser.email}`, type: 'success' });
      fetchUsers();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    }
  };

  const handleStatusToggle = (user: User) => {
    const targetStatus = user.status === 'locked' ? 'active' : 'locked';
    setLockModal({ isOpen: true, user, targetStatus, reason: '' });
  };

  const confirmStatusChange = async () => {
    if (!lockModal.user) return;
    if (lockModal.targetStatus === 'locked' && lockModal.reason.length < 10) {
      setToast({ isOpen: true, message: 'Vui lòng nhập lý do khóa tài khoản (tối thiểu 10 ký tự)', type: 'warning' });
      return;
    }

    const targetUser = lockModal.user;
    const targetStatus = lockModal.targetStatus;
    const reason = lockModal.reason;

    // Tắt modal lập tức
    setLockModal({ isOpen: false, user: null, targetStatus: '', reason: '' });

    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, locked_reason: reason })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Update failed');
      }
      setToast({ isOpen: true, message: `Đã ${targetStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản ${targetUser.email}`, type: 'success' });
      fetchUsers();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.message, type: 'error' });
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold border border-purple-200">Admin</span>;
      case 'marketer_full': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold border border-blue-200">Marketer (Full)</span>;
      case 'marketer_content': return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold border border-slate-200">Marketer (Content)</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">{role}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold border border-emerald-200">Active</span>;
      case 'locked': return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-xs font-bold border border-rose-200">Locked</span>;
      case 'pending': return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold border border-amber-200">Pending</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Actions & Filters */}
      <div className="bg-white rounded-[20px] p-6 border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={t('admin.searchUser')} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 md:flex-none py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">{t('admin.allRoles')}</option>
            <option value="admin">{t('admin.roleAdmin')}</option>
            <option value="marketer_full">{t('admin.roleMarketerFull')}</option>
            <option value="marketer_content">{t('admin.roleMarketerContent')}</option>
          </select>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-none py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="all">{t('admin.allStatuses')}</option>
            <option value="active">{t('admin.statusActive')}</option>
            <option value="locked">{t('admin.statusLocked')}</option>
            <option value="pending">{t('admin.statusPending')}</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-[20px] border border-slate-200/60 shadow-sm overflow-hidden relative">
        {/* Loading overlay when refreshing and we already have data */}
        {loading && users.length > 0 && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-extrabold">
                <th className="p-5 pl-6">{t('admin.user')}</th>
                <th className="p-5">{t('admin.role')}</th>
                <th className="p-5">{t('admin.status')}</th>
                <th className="p-5">{t('admin.createdAt')}</th>
                <th className="p-5">{t('admin.lastLogin')}</th>
                <th className="p-5 pr-6 text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse h-[61px]">
                    <td className="p-5 pl-6">
                      <div className="h-4 bg-slate-200 rounded w-48"></div>
                    </td>
                    <td className="p-5">
                      <div className="h-8 bg-slate-200 rounded-lg w-32"></div>
                    </td>
                    <td className="p-5">
                      <div className="h-6 bg-slate-200 rounded-md w-16"></div>
                    </td>
                    <td className="p-5">
                      <div className="h-4 bg-slate-200 rounded w-20"></div>
                    </td>
                    <td className="p-5">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </td>
                    <td className="p-5 pr-6 text-right">
                      <div className="h-8 bg-slate-200 rounded-xl w-8 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <>
                  <tr className="h-[61px]">
                    <td colSpan={6} className="p-10 text-center text-slate-500 font-medium">
                      {t('admin.noUsersFound')}
                    </td>
                  </tr>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-[61px]">
                      <td colSpan={6} className="p-5">&nbsp;</td>
                    </tr>
                  ))}
                </>
              ) : (
                <>
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group h-[61px]">
                      <td className="p-5 pl-6 font-bold text-slate-800 text-sm">
                        {user.email}
                      </td>
                      <td className="p-5">
                        <select 
                          value={user.role}
                          onChange={(e) => handleRoleChangeRequest(user, e.target.value)}
                          className="bg-transparent border border-transparent hover:border-slate-300 rounded-lg px-2 py-1 -ml-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
                        >
                          <option value="admin">{t('admin.roleAdmin')}</option>
                          <option value="marketer_full">{t('admin.roleMarketerFull')}</option>
                          <option value="marketer_content">{t('admin.roleMarketerContent')}</option>
                        </select>
                      </td>
                      <td className="p-5">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="p-5 text-sm text-slate-500 font-medium">
                        {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-5 text-sm text-slate-500 font-medium">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : t('admin.neverLoggedIn')}
                      </td>
                      <td className="p-5 pr-6 text-right">
                        <button 
                          onClick={() => handleStatusToggle(user)}
                          className={`p-2 rounded-xl transition-all ${user.status === 'locked' ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}
                          title={user.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {user.status === 'locked' ? <Unlock size={18} /> : <Lock size={18} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 10 - users.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-[61px]">
                      <td colSpan={6} className="p-5">&nbsp;</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-100 p-6 flex items-center justify-between select-none">
            <div className="text-xs text-slate-500 font-bold ml-2">
              {language === 'vi' 
                ? `Hiển thị ${totalUsers === 0 ? 0 : (page - 1) * 10 + 1} - ${Math.min(page * 10, totalUsers)} trong tổng số ${totalUsers} người dùng`
                : `Showing ${totalUsers === 0 ? 0 : (page - 1) * 10 + 1} - ${Math.min(page * 10, totalUsers)} of ${totalUsers} users`
              }
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-2.5 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-slate-500 active:scale-95 cursor-pointer"
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
                      : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2.5 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-30 disabled:pointer-events-none text-slate-500 active:scale-95 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      <AnimatePresence>
        {roleModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRoleModal({ isOpen: false, user: null, newRole: '' })} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[20px] p-8 max-w-md w-full shadow-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/20">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">{t('admin.changeRoleTitle')}</h2>
              <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                {t('admin.changeRoleDesc').replace('{email}', roleModal.user?.email || '').replace('{oldRole}', roleModal.user?.role || '').replace('{newRole}', roleModal.newRole || '')}
              </p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setRoleModal({ isOpen: false, user: null, newRole: '' })} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  {t('admin.cancel')}
                </button>
                <button onClick={confirmRoleChange} className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary/20">
                  {t('admin.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Lock/Unlock Modal */}
      <AnimatePresence>
        {lockModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setLockModal({ isOpen: false, user: null, targetStatus: '', reason: '' })} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-[20px] p-8 max-w-md w-full shadow-2xl border border-slate-100">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${lockModal.targetStatus === 'locked' ? 'bg-rose-100 border-rose-200' : 'bg-emerald-100 border-emerald-200'}`}>
                <ShieldAlert className={`w-6 h-6 ${lockModal.targetStatus === 'locked' ? 'text-rose-600' : 'text-emerald-600'}`} />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-2">
                {lockModal.targetStatus === 'locked' ? t('admin.lockAccount') : t('admin.unlockAccount')}
              </h2>
              <p className="text-sm font-medium text-slate-500 mb-5 leading-relaxed">
                {lockModal.targetStatus === 'locked' ? t('admin.lockDesc').replace('{email}', lockModal.user?.email || '') : t('admin.unlockDesc').replace('{email}', lockModal.user?.email || '')}
              </p>
              
              {lockModal.targetStatus === 'locked' && (
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('admin.lockReason')}</label>
                  <textarea 
                    value={lockModal.reason}
                    onChange={(e) => setLockModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none h-24"
                    placeholder={t('admin.lockReasonPlaceholder')}
                  />
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button onClick={() => setLockModal({ isOpen: false, user: null, targetStatus: '', reason: '' })} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                  {t('admin.cancel')}
                </button>
                <button 
                  onClick={confirmStatusChange} 
                  className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-colors shadow-lg ${lockModal.targetStatus === 'locked' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'}`}
                >
                  {lockModal.targetStatus === 'locked' ? t('admin.confirmLock') : t('admin.confirmUnlock')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PopupDialog 
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}
