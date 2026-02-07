import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { LANGUAGES } from '../i18n/languages';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="settings-row">
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
        className="language-select"
      >
        {LANGUAGES.map(({ code, nativeName }) => (
          <option key={code} value={code}>
            {nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
