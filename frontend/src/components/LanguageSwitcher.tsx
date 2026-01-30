import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es-CO', label: 'Español (CO)' },
  { code: 'fr-CA', label: 'Français (CA)' },
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="settings-row" style={{ position: 'relative' }}>
      <div className="settings-row-left">
        <div className="settings-icon-box sky">
          <Globe size={16} />
        </div>
        <div>
          <div className="settings-row-label">{t('settings:preferences.language')}</div>
          <div className="settings-row-desc">{t('settings:preferences.languageDesc')}</div>
        </div>
      </div>
      <select
        value={i18n.language}
        onChange={handleChange}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '4px 8px',
          color: 'var(--text)',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
