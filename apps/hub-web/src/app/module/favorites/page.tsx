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
  Filter,
} from 'lucide-react';
import { AppShell } from '../../../components/layout/AppShell';

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
        const serverData = Array.isArray(json.data) ? json.data : [];
        if (serverData.length > 0) {
          setFavorites(serverData);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to load favorites from server:', err);
    } finally {
      setLoading(false);
    }

    // Fallback: قراءة المفضلات المحفوظة محلياً إن لم توجد في السيرفر
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('hub_favorites_v1');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped: FavoriteItem[] = parsed.map((item: any) => ({
              id: item.id,
              category: item.category || 'direct_chat',
              item_id: item.id,
              title: item.title,
              subtitle: item.subtitle,
              meta: item.meta,
              created_at: item.createdAt || new Date().toISOString(),
            }));
            const filtered = activeTab === 'all' ? mapped : mapped.filter((f) => f.category === activeTab);
            setFavorites(filtered);
          }
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFavorites();
  };

  // حذف عنصر من المفضلة
  const handleRemove = async (id: string) => {
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
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-900/30">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 text-amber-400">
                <Star className="w-7 h-7 fill-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-2">
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50 scale-[1.02]'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-[var(--text-main)]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.key !== 'all' && (counts as any)[tab.key] > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 font-mono">
                      {(counts as any)[tab.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث في العناصر المفضلة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/80 border border-purple-900/40 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </form>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <Sparkles className="w-8 h-8 text-purple-400 animate-spin mb-3" />
            <span className="text-sm">جاري تحميل عناصر المفضلة...</span>
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 rounded-3xl border border-dashed border-purple-900/40 bg-slate-950/40 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Star className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-main)] mb-1">لا توجد عناصر في هذا التبويب</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              يمكنك تمييز أي رسالة، مستند، ميديا، أو جهة اتصال بنجمة من شريط أدوات المحادثة لتظهر هنا مباشرة.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav) => {
              const isMedia = fav.category === 'media';
              const isFile = fav.category === 'file';
              const isMessage = fav.category === 'message';
              const isContact = fav.category === 'contact';
              const isChat = fav.category === 'direct_chat' || fav.category === 'group';

              return (
                <div
                  key={fav.id}
                  className="group relative rounded-2xl bg-slate-900/70 border border-purple-900/30 hover:border-purple-500/40 p-4 transition-all hover:shadow-xl hover:shadow-purple-950/20 flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/40">
                        {isMedia && <ImageIcon className="w-3 h-3 text-purple-400" />}
                        {isFile && <FileText className="w-3 h-3 text-blue-400" />}
                        {isMessage && <MessageSquare className="w-3 h-3 text-emerald-400" />}
                        {isContact && <Bookmark className="w-3 h-3 text-amber-400" />}
                        {isChat && <Users className="w-3 h-3 text-pink-400" />}
                        <span>
                          {fav.category === 'message' && 'رسالة'}
                          {fav.category === 'file' && 'مستند'}
                          {fav.category === 'media' && 'ميديا'}
                          {fav.category === 'direct_chat' && 'محادثة فردية'}
                          {fav.category === 'group' && 'مجموعة'}
                          {fav.category === 'contact' && 'جهة اتصال'}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemove(fav.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
                        title="إزالة من المفضلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Media Preview if image */}
                    {isMedia && fav.meta?.url && (
                      <div className="mb-3 rounded-xl overflow-hidden bg-black/40 border border-purple-900/20 aspect-video flex items-center justify-center">
                        <img
                          src={fav.meta.url}
                          alt={fav.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Title */}
                    <h4 className="text-sm font-bold text-[var(--text-main)] line-clamp-2 mb-1 group-hover:text-purple-300 transition-colors">
                      {fav.title}
                    </h4>

                    {/* Subtitle / snippet */}
                    {fav.subtitle && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {fav.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-3 border-t border-purple-900/20 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono">
                      {new Date(fav.created_at).toLocaleDateString('ar-SA')}
                    </span>

                    <div className="flex items-center gap-2">
                      {fav.meta?.url && (
                        <a
                          href={fav.meta.url}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950 text-slate-300 hover:text-white transition-colors"
                        >
                          <Download className="w-3 h-3" />
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
    </AppShell>
  );
}
