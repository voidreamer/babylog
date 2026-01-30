import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es-CO', label: 'Español (Colombia)' },
  { code: 'fr-CA', label: 'Français (Canada)' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation('settings');

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div className="settings-row" style={{ position: 'relative' }}>
      <div className="settings-row-left">
        <div className="settings-icon-box sky">
          <span style={{ fontSize: 14 }}>🌐</span>
        </div>
        <div>
          <div className="settings-row-label">{t('language')}</div>
          <div className="settings-row-desc">{currentLang.label}</div>
        </div>
      </div>
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
      <ChevronRight size={18} className="settings-arrow" />
    </div>
  );
}
