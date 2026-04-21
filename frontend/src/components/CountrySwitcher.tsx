import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import {
  type CountryCode,
  COUNTRY_META,
  SUPPORTED_COUNTRIES,
} from '../data/vaccineSchedules';
import { useUserCountry } from '../hooks/useUserCountry';

export default function CountrySwitcher() {
  const { t } = useTranslation();
  const { country, setCountry } = useUserCountry();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void setCountry(e.target.value as CountryCode);
  };

  return (
    <div className="settings-row">
      <div className="settings-row-left">
        <div className="settings-icon-box peach">
          <MapPin size={16} />
        </div>
        <div>
          <div className="settings-row-label">
            {t('settings:preferences.country', { defaultValue: 'Country' })}
          </div>
          <div className="settings-row-desc">
            {t('settings:preferences.countryDesc', {
              defaultValue: 'Used for the vaccination schedule',
            })}
          </div>
        </div>
      </div>
      <select value={country} onChange={handleChange} className="language-select">
        {SUPPORTED_COUNTRIES.map((code) => (
          <option key={code} value={code}>
            {COUNTRY_META[code].flag} {COUNTRY_META[code].label}
          </option>
        ))}
      </select>
    </div>
  );
}
