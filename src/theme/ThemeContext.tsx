import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import RNFS from 'react-native-fs';
import { AppColors, LightAppColors, type AppColorsType } from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: AppColorsType;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const THEME_PREFERENCE_FILE = `${RNFS.DocumentDirectoryPath}/theme_preference.json`;

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readThemePreference = async (): Promise<ThemePreference> => {
  try {
    const exists = await RNFS.exists(THEME_PREFERENCE_FILE);
    if (!exists) {
      return 'system';
    }

    const raw = await RNFS.readFile(THEME_PREFERENCE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { preference?: ThemePreference };

    if (parsed.preference === 'light' || parsed.preference === 'dark' || parsed.preference === 'system') {
      return parsed.preference;
    }
  } catch (error) {
    console.error('Failed to read theme preference:', error);
  }

  return 'system';
};

const persistThemePreference = async (preference: ThemePreference) => {
  try {
    await RNFS.writeFile(THEME_PREFERENCE_FILE, JSON.stringify({ preference }), 'utf8');
  } catch (error) {
    console.error('Failed to persist theme preference:', error);
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    const loadPreference = async () => {
      const savedPreference = await readThemePreference();
      setPreferenceState(savedPreference);
    };

    loadPreference().catch(() => {});
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      if (preference === 'system') {
        setPreferenceState('system');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [preference]);

  const resolvedTheme: ResolvedTheme = preference === 'system'
    ? systemColorScheme === 'light'
      ? 'light'
      : 'dark'
    : preference;

  const colors = resolvedTheme === 'light' ? LightAppColors : AppColors;

  const handleSetPreference = async (nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    await persistThemePreference(nextPreference);
  };

  const value: ThemeContextValue = {
    preference,
    resolvedTheme,
    colors,
    setPreference: handleSetPreference,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
};
