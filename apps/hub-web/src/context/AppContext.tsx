'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { StaffMe, WhatsAppLine, ModuleContract } from '../types';
import { MOCK_LINES, RAW_MODULES, filterModulesForUser } from '../lib/mock-data';
import { loadAuthState, signOut, AuthStatus } from '../lib/authDb';
import { supabase } from '../lib/supabase';

export type AppTheme = 'theme-purple' | 'theme-blue';
export type AppMode = 'dark' | 'light';

interface AppContextType {
  user: StaffMe;
  authStatus: AuthStatus;
  refreshAuth: () => Promise<void>;
  selectedLine: WhatsAppLine;
  selectedLineId: string;
  setSelectedLineId: (id: string) => void;
  lines: WhatsAppLine[];
  accessibleModules: ModuleContract[];
  userModules: ModuleContract[];
  adminModules: ModuleContract[];
  isLoggedIn: boolean;
  logout: () => Promise<void>;
  // Dynamic Multi-Theming Engine States
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<StaffMe | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [selectedLineId, setSelectedLineId] = useState<string>('line-01');
  const [theme, setThemeState] = useState<AppTheme>('theme-purple');
  const [mode, setModeState] = useState<AppMode>('dark');
  const [dbLines, setDbLines] = useState<WhatsAppLine[]>([]);

  // تحميل الخطوط الفعلية المعتمدة من سوبابيز
  useEffect(() => {
    async function loadLines() {
      try {
        const { data, error } = await supabase.from('lines').select('*').order('created_at');
        if (!error && data && data.length > 0) {
          const mapped: WhatsAppLine[] = data.map((r: any) => ({
            id: r.id,
            title_ar: r.title_ar || r.instance_name || 'خط واتساب',
            phone_masked: r.phone_e164 || 'غير متصل',
            kind: r.kind === 'main' ? 'primary' : (r.kind || 'sales'),
            status: r.status === 'connected' ? 'online' : (r.status === 'pending' ? 'warning' : 'offline'),
            unread_count: 0,
          }));
          setDbLines(mapped);

          const savedLine = localStorage.getItem('tripyou_hub_line_id');
          if (savedLine && mapped.some((l) => l.id === savedLine)) {
            setSelectedLineId(savedLine);
          } else if (mapped.length > 0) {
            setSelectedLineId(mapped[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load lines from Supabase:', err);
      }
    }
    loadLines();
  }, []);

  // Load user and theme from localStorage if present
  useEffect(() => {
    try {
      const savedLine = localStorage.getItem('tripyou_hub_line_id');
      const savedTheme = (localStorage.getItem('tripyou_theme') as AppTheme) || 'theme-purple';
      const savedMode = (localStorage.getItem('tripyou_mode') as AppMode) || 'dark';

      if (savedLine) {
        setSelectedLineId(savedLine);
      }
      setThemeState(savedTheme);
      setModeState(savedMode);

      // Synchronize <html> classes immediately
      const root = document.documentElement;
      root.classList.remove('theme-purple', 'theme-blue', 'dark', 'light');
      root.classList.add(savedTheme, savedMode);
    } catch {
      // ignore
    }
  }, []);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('tripyou_theme', newTheme);
      const root = document.documentElement;
      root.classList.remove('theme-purple', 'theme-blue');
      root.classList.add(newTheme);
    } catch {
      // ignore
    }
  };

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('tripyou_mode', newMode);
      const root = document.documentElement;
      root.classList.remove('dark', 'light');
      root.classList.add(newMode);
    } catch {
      // ignore
    }
  };

  const toggleMode = () => {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
  };

  const handleSetLineId = (id: string) => {
    setSelectedLineId(id);
    try {
      localStorage.setItem('tripyou_hub_line_id', id);
    } catch {
      // ignore
    }
  };

  const refreshAuth = async () => {
    try {
      const st = await loadAuthState();
      setMe(st.me);
      setAuthStatus(st.status);
    } catch {
      setMe(null);
      setAuthStatus('anonymous');
    }
  };

  useEffect(() => {
    refreshAuth();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') refreshAuth();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await signOut();
    setMe(null);
    setAuthStatus('anonymous');
  };

  const isLoggedIn = authStatus !== 'anonymous';

  const user = useMemo<StaffMe>(
    () =>
      me || {
        id: '',
        full_name: '',
        role: '',
        role_title_ar: '',
        email_masked: '',
        phone_masked: '',
        permissions: [],
        default_line_id: null,
      },
    [me]
  );

  const linesList = dbLines;

  const selectedLine = useMemo(() => {
    return linesList.find((l) => l.id === selectedLineId) || linesList[0] || {
      id: '',
      title_ar: 'الخط الرئيسي',
      phone_masked: '',
      kind: 'primary',
      status: 'online',
      unread_count: 0,
    };
  }, [selectedLineId, linesList]);

  const accessibleModules = useMemo(() => {
    return filterModulesForUser(RAW_MODULES, user);
  }, [user]);

  const userModules = useMemo(() => {
    return accessibleModules.filter((m) => m.area === 'user');
  }, [accessibleModules]);

  const adminModules = useMemo(() => {
    return accessibleModules.filter((m) => m.area === 'admin');
  }, [accessibleModules]);

  return (
    <AppContext.Provider
      value={{
        user,
        authStatus,
        refreshAuth,
        selectedLine,
        selectedLineId,
        setSelectedLineId: handleSetLineId,
        lines: linesList,
        accessibleModules,
        userModules,
        adminModules,
        isLoggedIn,
        logout,
        theme,
        setTheme,
        mode,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
