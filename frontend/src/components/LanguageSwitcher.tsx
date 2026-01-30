import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGE_CODES = ['en', 'es-CO', 'fr-CA'] as const;

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
        {LANGUAGE_CODES.map((code) => (
          <option key={code} value={code}>
            {t(`common:language.${code}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
