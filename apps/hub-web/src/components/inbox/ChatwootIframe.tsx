'use client';

import React, { useState } from 'react';
import { RefreshCw, ExternalLink, Maximize2, Minimize2, Radio, CheckCircle, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button, Badge } from '@resvbar/ui';

export function ChatwootIframe() {
  const { selectedLine, lines, setSelectedLineId, user } = useApp();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // In production this will fetch URL from POST /chat/session
  // For demo & Hub-004 shell, points to public/mock-chatwoot.html
  const chatUrl = '/mock-chatwoot.html';

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div
      className={`flex flex-col bg-slate-950 transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-black/90'
          : 'h-[calc(100vh-5rem)] rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl'
      }`}
    >
      {/* Top Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left / Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">{selectedLine.title_ar}</span>
                <Badge variant={selectedLine.status === 'online' ? 'live' : 'warning'} size="sm">
                  {selectedLine.status === 'online' ? 'متصل' : 'تنبيه'}
                </Badge>
              </div>
              <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>{selectedLine.phone_masked}</span>
                <span>•</span>
                <span className="text-emerald-400">استجابة 38ms</span>
              </div>
            </div>
          </div>

          {/* Quick Line Switcher */}
          <div className="hidden md:flex items-center gap-1.5 mr-4 border-r border-slate-800 pr-4">
            <span className="text-xs text-slate-400">الخط:</span>
            <select
              value={selectedLine.id}
              onChange={(e) => setSelectedLineId(e.target.value)}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
            >
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title_ar} ({l.phone_masked})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right / Controls */}
        <div className="flex items-center gap-2">
          {/* SSO indicator badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>جلسة Chatwoot موحدة</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            title="إعادة تحميل المحادثات"
            className="text-xs h-8 px-2.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline mr-1">تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(chatUrl, '_blank')}
            title="فتح في نافذة مستقلة"
            className="text-xs h-8 px-2.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline mr-1">نافذة مستقلة</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}
            className="text-xs h-8 w-8 p-0"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Embedded Iframe */}
      <div className="flex-1 w-full h-full relative bg-slate-950">
        <iframe
          key={iframeKey}
          src={chatUrl}
          title="محادثات Chatwoot"
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
