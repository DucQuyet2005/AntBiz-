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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('solid-blue');

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

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyThemeClass(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
