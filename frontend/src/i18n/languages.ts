export interface LanguageConfig {
  code: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageConfig[] = [
  { code: 'en', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es-CO', nativeName: 'Español (Colombia)', flag: '🇨🇴' },
  { code: 'fr-CA', nativeName: 'Français (Canada)', flag: '🇨🇦' },
  { code: 'zh-CN', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'ja', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'hi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺' },
];

export const LANGUAGE_CODES = LANGUAGES.map(l => l.code);

export const DEFAULT_LANGUAGE = 'en';

export const NAMESPACES = ['common', 'dashboard', 'health', 'settings', 'auth'] as const;
