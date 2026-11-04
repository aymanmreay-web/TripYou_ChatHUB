'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { StaffMe, WhatsAppLine, ModuleContract } from '../types';
import { MOCK_USERS, MOCK_LINES, RAW_MODULES, filterModulesForUser } from '../lib/mock-data';

export type AppTheme = 'theme-purple' | 'theme-blue';
export type AppMode = 'dark' | 'light';

interface AppContextType {
  user: StaffMe;
  userKey: string;
  setUserKey: (key: string) => void;
  selectedLine: WhatsAppLine;
  selectedLineId: string;
  setSelectedLineId: (id: string) => void;
  lines: WhatsAppLine[];
  accessibleModules: ModuleContract[];
  userModules: ModuleContract[];
  adminModules: ModuleContract[];
  isLoggedIn: boolean;
  login: (roleKey: string) => void;
  logout: () => void;
  // Dynamic Multi-Theming Engine States
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userKey, setUserKey] = useState<string>('super_admin');
  const [selectedLineId, setSelectedLineId] = useState<string>('line-01');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [theme, setThemeState] = useState<AppTheme>('theme-purple');
  const [mode, setModeState] = useState<AppMode>('dark');

  // Load user and theme from localStorage if present
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('tripyou_hub_user_key');
      const savedLine = localStorage.getItem('tripyou_hub_line_id');
      const savedAuth = localStorage.getItem('tripyou_hub_auth');
      const savedTheme = (localStorage.getItem('tripyou_theme') as AppTheme) || 'theme-purple';
      const savedMode = (localStorage.getItem('tripyou_mode') as AppMode) || 'dark';

      if (savedUser && MOCK_USERS[savedUser]) {
        setUserKey(savedUser);
      }
      if (savedLine && MOCK_LINES.some((l) => l.id === savedLine)) {
        setSelectedLineId(savedLine);
      }
      if (savedAuth !== null) {
        setIsLoggedIn(savedAuth === 'true');
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

  const handleSetUserKey = (key: string) => {
    if (MOCK_USERS[key]) {
      setUserKey(key);
      try {
        localStorage.setItem('tripyou_hub_user_key', key);
      } catch {
        // ignore
      }
    }
  };

  const handleSetLineId = (id: string) => {
    setSelectedLineId(id);
    try {
      localStorage.setItem('tripyou_hub_line_id', id);
    } catch {
      // ignore
    }
  };

  const login = (roleKey: string) => {
    handleSetUserKey(roleKey);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('tripyou_hub_auth', 'true');
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.setItem('tripyou_hub_auth', 'false');
    } catch {
      // ignore
    }
  };

  const user = useMemo(() => MOCK_USERS[userKey] || MOCK_USERS.super_admin, [userKey]);

  const selectedLine = useMemo(() => {
    return MOCK_LINES.find((l) => l.id === selectedLineId) || MOCK_LINES[0];
  }, [selectedLineId]);

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
        userKey,
        setUserKey: handleSetUserKey,
        selectedLine,
        selectedLineId,
        setSelectedLineId: handleSetLineId,
        lines: MOCK_LINES,
        accessibleModules,
        userModules,
        adminModules,
        isLoggedIn,
        login,
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
