'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { StaffMe, WhatsAppLine, ModuleContract } from '../types';
import { MOCK_USERS, MOCK_LINES, RAW_MODULES, filterModulesForUser } from '../lib/mock-data';

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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userKey, setUserKey] = useState<string>('super_admin');
  const [selectedLineId, setSelectedLineId] = useState<string>('line-01');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  // Load user from localStorage if present
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('resvbar_hub_user_key');
      const savedLine = localStorage.getItem('resvbar_hub_line_id');
      const savedAuth = localStorage.getItem('resvbar_hub_auth');
      if (savedUser && MOCK_USERS[savedUser]) {
        setUserKey(savedUser);
      }
      if (savedLine && MOCK_LINES.some(l => l.id === savedLine)) {
        setSelectedLineId(savedLine);
      }
      if (savedAuth !== null) {
        setIsLoggedIn(savedAuth === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSetUserKey = (key: string) => {
    if (MOCK_USERS[key]) {
      setUserKey(key);
      try {
        localStorage.setItem('resvbar_hub_user_key', key);
      } catch {
        // ignore
      }
    }
  };

  const handleSetLineId = (id: string) => {
    setSelectedLineId(id);
    try {
      localStorage.setItem('resvbar_hub_line_id', id);
    } catch {
      // ignore
    }
  };

  const login = (roleKey: string) => {
    handleSetUserKey(roleKey);
    setIsLoggedIn(true);
    try {
      localStorage.setItem('resvbar_hub_auth', 'true');
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.setItem('resvbar_hub_auth', 'false');
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
