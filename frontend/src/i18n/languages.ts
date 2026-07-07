export interface LanguageConfig {
  code: string;
  nativeName: string;
  flag: string;
  /** BCP-47 tag handed to speech recognizers for dictation. */
  speechLocale: string;
}

export const LANGUAGES: LanguageConfig[] = [
  { code: 'en', nativeName: 'English', flag: '🇺🇸', speechLocale: 'en-US' },
  { code: 'es-CO', nativeName: 'Español (Colombia)', flag: '🇨🇴', speechLocale: 'es-CO' },
  { code: 'fr-CA', nativeName: 'Français (Canada)', flag: '🇨🇦', speechLocale: 'fr-CA' },
  { code: 'zh-CN', nativeName: '简体中文', flag: '🇨🇳', speechLocale: 'zh-CN' },
  { code: 'ja', nativeName: '日本語', flag: '🇯🇵', speechLocale: 'ja-JP' },
  { code: 'hi', nativeName: 'हिन्दी', flag: '🇮🇳', speechLocale: 'hi-IN' },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺', speechLocale: 'ru-RU' },
];

export const LANGUAGE_CODES = LANGUAGES.map(l => l.code);

export const DEFAULT_LANGUAGE = 'en';

export const NAMESPACES = ['common', 'dashboard', 'health', 'settings', 'auth'] as const;
