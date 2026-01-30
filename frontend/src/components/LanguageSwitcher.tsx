/**
 * Language Switcher Component
 * Allows users to switch between English, Spanish (Latin American), and French (Canadian).
 * Saves the choice to localStorage via i18next's language detector.
 */
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="language-switcher" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <Globe size={16} style={{ color: 'var(--text-muted)' }} />
      <select
        value={i18n.language?.split('-')[0] || 'en'}
        onChange={handleChange}
        className="form-input"
        style={{
          padding: 'var(--space-xs) var(--space-sm)',
          fontSize: '0.9rem',
          minWidth: '120px',
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
