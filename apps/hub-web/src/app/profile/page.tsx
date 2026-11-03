'use client';

import React, { useState } from 'react';
import { User, Phone, Mail, Clock, Shield, Check, Search, Radio, Key } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppShell } from '../../components/layout/AppShell';
import { Card, Avatar, Badge, Input } from '@tripyou/ui';

export default function ProfilePage() {
  const { user, selectedLine } = useApp();
  const [filterQuery, setFilterQuery] = useState('');

  const filteredPermissions = user.permissions.filter((p) =>
    p.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-6 px-2 sm:px-4 space-y-6">
        {/* Profile Hero Card */}
        <Card variant="glass" className="p-6 sm:p-8 border-slate-800">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-right">
            <Avatar name={user.full_name} size="xl" status="online" className="shadow-xl" />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                <h1 className="text-2xl font-bold text-white">{user.full_name}</h1>
                <Badge variant="live" size="md">
                  نشط الآن
                </Badge>
              </div>

              <p className="text-sm text-emerald-400 font-medium mb-4">
                {user.role_title_ar}
              </p>

              {/* Grid of details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-400">البريد الإلكتروني:</span>
                  <span className="font-mono text-white mr-auto">{user.email_masked}</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-400">رقم الهاتف:</span>
                  <span className="font-mono text-white mr-auto">{user.phone_masked}</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-400">ساعات العمل:</span>
                  <span className="text-white mr-auto">{user.working_hours || '09:00 ص - 05:00 م'}</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-400">الخط الافتراضي:</span>
                  <span className="text-emerald-300 mr-auto font-medium">{selectedLine.title_ar}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Permissions Matrix */}
        <Card variant="subtle" className="p-6 border-slate-800/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Shield className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">الصلاحيات الفعّالة (GET /me)</h2>
                <p className="text-xs text-slate-400">
                  يملك هذا الحساب {user.permissions.length} صلاحية تحدد الأقسام المتاحة في القائمة الجانبية
                </p>
              </div>
            </div>

            {/* Permissions Search Filter */}
            <div className="w-full sm:w-64">
              <Input
                placeholder="بحث في الصلاحيات..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                icon={<Search className="w-4 h-4 text-slate-500" />}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredPermissions.map((perm) => (
              <div
                key={perm}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70 text-xs text-slate-300 hover:border-emerald-500/40 transition-colors"
              >
                <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <code className="text-slate-200 font-mono text-[11px] truncate">{perm}</code>
                <Check className="w-3.5 h-3.5 text-emerald-400 mr-auto shrink-0" />
              </div>
            ))}
            {filteredPermissions.length === 0 && (
              <div className="col-span-full text-center py-6 text-xs text-slate-500">
                لا توجد نتائج مطابقة لبحثك
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
