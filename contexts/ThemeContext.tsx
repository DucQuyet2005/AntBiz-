"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 
  | 'solid-blue'
  | 'solid-red'
  | 'solid-purple'
  | 'solid-yellow'
  | 'solid-green'
  | 'solid-orange'
  | 'solid-indigo'
  | 'gradient-black-red'
  | 'gradient-yellow-black'
  | 'gradient-black-white'
  | 'rgb';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('solid-blue');
  const [isDark, setIsDark] = useState<boolean>(false);

  // Load theme from localStorage on mount and apply it
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    const validThemes: Theme[] = [
      'solid-blue', 'solid-red', 'solid-purple', 'solid-yellow', 
      'solid-green', 'solid-orange', 'solid-indigo',
      'gradient-black-red', 'gradient-yellow-black', 'gradient-black-white',
      'rgb'
    ];
    
    const initialTheme = (savedTheme && validThemes.includes(savedTheme)) ? savedTheme : 'solid-blue';
    setThemeState(initialTheme);
    applyThemeClass(initialTheme);

    // Dark mode loading
    const savedDark = localStorage.getItem('app-dark-mode');
    if (savedDark !== null) {
      const darkVal = savedDark === 'true';
      setIsDark(darkVal);
      applyDarkClass(darkVal);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      applyDarkClass(prefersDark);
    }
  }, []);

  const applyThemeClass = (newTheme: Theme) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // Remove all previous theme classes
      root.classList.forEach(className => {
        if (className.startsWith('theme-')) {
          root.classList.remove(className);
        }
      });
      
      // Add the new theme class
      root.classList.add(`theme-${newTheme}`);
    }
  };

  const applyDarkClass = (dark: boolean) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (dark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyThemeClass(newTheme);
  };

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    if (typeof window !== 'undefined' && 'startViewTransition' in document) {
      // Use cinematic view transitions API if supported
      (document as any).startViewTransition(() => {
        setIsDark(nextDark);
        localStorage.setItem('app-dark-mode', String(nextDark));
        applyDarkClass(nextDark);
      });
    } else {
      setIsDark(nextDark);
      localStorage.setItem('app-dark-mode', String(nextDark));
      applyDarkClass(nextDark);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
