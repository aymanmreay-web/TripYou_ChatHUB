'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  MessageSquare,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Video,
  User,
  Users,
  Search,
  ExternalLink,
  Download,
  Trash2,
  Bookmark,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface FavoriteItem {
  id: string;
  category: 'message' | 'file' | 'media' | 'direct_chat' | 'group' | 'contact';
  item_id: string;
  title: string;
  subtitle?: string;
  meta?: any;
  created_at: string;
}

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'message' | 'file' | 'media' | 'direct_chat' | 'group' | 'contact'>('all');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // تحميل المفضلات
  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const url = activeTab === 'all'
        ? `/api/favorites${search ? `?search=${encodeURIComponent(search)}` : ''}`
        : `/api/favorites?category=${activeTab}${search ? `&search=${encodeURIComponent(search)}` : ''}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setFavorites(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [activeTab, search]);

  const handleRemove = async (id: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذا العنصر من المفضلة؟')) return;
    try {
      const res = await fetch(`/api/favorites?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  // إحصائيات التبويبات
  const counts = useMemo(() => {
    const c = { all: favorites.length, message: 0, file: 0, media: 0, direct_chat: 0, group: 0, contact: 0 };
    favorites.forEach((f) => {
      if (c[f.category] !== undefined) c[f.category]++;
    });
    return c;
  }, [favorites]);

  const tabs = [
    { key: 'all', label: 'الكل', icon: Star },
    { key: 'message', label: 'الرسائل', icon: MessageSquare },
    { key: 'file', label: 'الملفات والمستندات', icon: FileText },
    { key: 'media', label: 'الميديا (صور وفيديو)', icon: ImageIcon },
    { key: 'direct_chat', label: 'محادثات فردية', icon: User },
    { key: 'group', label: 'محادثات مجموعات', icon: Users },
    { key: 'contact', label: 'جهات الاتصال', icon: Bookmark },
  ];

  return (
    <div className="min-h-screen bg-[#07040E] text-slate-100 p-6 md:p-8 dir-rtl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-purple-900/30">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400">
              <Star className="w-7 h-7 fill-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                قائمة المفضلات الشخصية
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  {favorites.length} عنصر
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                الوصول السريع إلى الرسائل، الملفات، الميديا، المحادثات، وجهات الاتصال المميزة بنجمة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all"
          >
            <span>العودة لصندوق الوارد</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-purple-900/20 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في العناصر المفضلة..."
            className="w-full bg-[#120B24] border border-purple-900/40 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">جاري تحميل المفضلة...</span>
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-purple-900/40 rounded-3xl bg-[#100922]/50 p-8 space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Star className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-white">لا توجد عناصر في هذا التبويب</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            يمكنك تمييز أي رسالة، مستند، ميديا، أو جهة اتصال بنجمة من شريط أدوات المحادثة لتظهر هنا مباشرة.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => {
            const isMedia = fav.category === 'media';
            const isFile = fav.category === 'file';
            const isChat = fav.category === 'direct_chat' || fav.category === 'group';

            return (
              <div
                key={fav.id}
                className="group relative bg-[#130C26] border border-purple-900/40 hover:border-purple-500/60 rounded-2xl p-4 transition-all duration-200 hover:shadow-xl hover:shadow-purple-950/40 flex flex-col justify-between space-y-3"
              >
                {/* Header card info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-purple-900/30 border border-purple-500/20 text-purple-300 shrink-0">
                      {fav.category === 'message' && <MessageSquare className="w-5 h-5 text-purple-400" />}
                      {fav.category === 'file' && <FileSpreadsheet className="w-5 h-5 text-emerald-400" />}
                      {fav.category === 'media' && <ImageIcon className="w-5 h-5 text-pink-400" />}
                      {fav.category === 'direct_chat' && <User className="w-5 h-5 text-blue-400" />}
                      {fav.category === 'group' && <Users className="w-5 h-5 text-amber-400" />}
                      {fav.category === 'contact' && <Bookmark className="w-5 h-5 text-teal-400" />}
                    </div>
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-medium">
                        {fav.category === 'message' && 'رسالة'}
                        {fav.category === 'file' && 'مستند / ملف'}
                        {fav.category === 'media' && 'ميديا'}
                        {fav.category === 'direct_chat' && 'محادثة فردية'}
                        {fav.category === 'group' && 'مجموعة'}
                        {fav.category === 'contact' && 'جهة اتصال'}
                      </span>
                      <h4 className="font-bold text-sm text-white mt-1 line-clamp-1">{fav.title}</h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(fav.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="إزالة من المفضلة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Subtitle / Preview */}
                {fav.subtitle && (
                  <p className="text-xs text-slate-300 line-clamp-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
                    {fav.subtitle}
                  </p>
                )}

                {/* Media thumbnail if exists */}
                {isMedia && fav.meta?.url && (
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-black/40 border border-white/10 relative">
                    {fav.meta?.type === 'video' ? (
                      <video src={fav.meta.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={fav.meta.url} alt={fav.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-purple-900/20 text-[11px] text-slate-400">
                  <span className="font-mono">{new Date(fav.created_at).toLocaleDateString('ar-SA')}</span>

                  <div className="flex items-center gap-2">
                    {fav.meta?.url && (
                      <a
                        href={fav.meta.url}
                        download
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                        title="تحميل"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تحميل</span>
                      </a>
                    )}

                    {fav.meta?.chat_jid && (
                      <Link
                        href={`/inbox?chat=${encodeURIComponent(fav.meta.chat_jid)}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 transition-colors"
                      >
                        <span>فتح في المحادثة</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

