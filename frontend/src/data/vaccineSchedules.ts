export type CountryCode = 'us' | 'ca';

export const SUPPORTED_COUNTRIES: CountryCode[] = ['us', 'ca'];

export const DEFAULT_COUNTRY: CountryCode = 'us';

export interface VaccineScheduleGroup {
  ageMonths: number;
  ageKey: string;
  vaccines: string[];
}

export const VACCINE_SCHEDULES: Record<CountryCode, VaccineScheduleGroup[]> = {
  us: [
    { ageMonths: 0, ageKey: 'birth', vaccines: ['Hep B'] },
    { ageMonths: 2, ageKey: '2months', vaccines: ['DTaP', 'IPV', 'Hib', 'PCV13', 'RV', 'Hep B'] },
    { ageMonths: 4, ageKey: '4months', vaccines: ['DTaP', 'IPV', 'Hib', 'PCV13', 'RV'] },
    { ageMonths: 6, ageKey: '6months', vaccines: ['DTaP', 'Hib', 'PCV13', 'RV', 'Hep B', 'Influenza'] },
    { ageMonths: 12, ageKey: '12months', vaccines: ['MMR', 'Varicella', 'Hep A', 'PCV13'] },
    { ageMonths: 15, ageKey: '15months', vaccines: ['DTaP'] },
    { ageMonths: 18, ageKey: '18months', vaccines: ['Hep A'] },
  ],
  ca: [
    { ageMonths: 0, ageKey: 'birth', vaccines: ['Hep B'] },
    { ageMonths: 2, ageKey: '2months', vaccines: ['DTaP-IPV-Hib', 'Pneu-C-13', 'RV'] },
    { ageMonths: 4, ageKey: '4months', vaccines: ['DTaP-IPV-Hib', 'Pneu-C-13', 'RV'] },
    { ageMonths: 6, ageKey: '6months', vaccines: ['DTaP-IPV-Hib', 'Influenza'] },
    { ageMonths: 12, ageKey: '12months', vaccines: ['MMR', 'Pneu-C-13', 'Men-C', 'Varicella'] },
    { ageMonths: 18, ageKey: '18months', vaccines: ['DTaP-IPV-Hib', 'MMRV'] },
  ],
};

export const COUNTRY_META: Record<CountryCode, { flag: string; label: string; authority: string }> = {
  us: { flag: '🇺🇸', label: 'United States', authority: 'CDC' },
  ca: { flag: '🇨🇦', label: 'Canada', authority: 'NACI' },
};

export const VACCINE_INFO: Record<string, { name: string; description: string }> = {
  'Hep B': { name: 'Hepatitis B', description: 'Protects against hepatitis B virus infection' },
  'DTaP': { name: 'Diphtheria, Tetanus & Pertussis', description: 'Protects against diphtheria, tetanus (lockjaw), and pertussis (whooping cough)' },
  'IPV': { name: 'Inactivated Poliovirus', description: 'Protects against polio' },
  'Hib': { name: 'Haemophilus influenzae type b', description: 'Protects against Hib bacteria that can cause meningitis and pneumonia' },
  'PCV13': { name: 'Pneumococcal Conjugate (13-valent)', description: 'Protects against 13 types of pneumococcal bacteria' },
  'PCV15': { name: 'Pneumococcal Conjugate (15-valent)', description: 'Protects against 15 types of pneumococcal bacteria' },
  'RV': { name: 'Rotavirus', description: 'Protects against rotavirus, a leading cause of severe diarrhea in infants' },
  'MMR': { name: 'Measles, Mumps & Rubella', description: 'Protects against measles, mumps, and rubella (German measles)' },
  'Varicella': { name: 'Varicella (Chickenpox)', description: 'Protects against chickenpox' },
  'Hep A': { name: 'Hepatitis A', description: 'Protects against hepatitis A virus infection' },
  'Influenza': { name: 'Influenza (Flu)', description: 'Annual flu shot, recommended from 6 months' },
  'MMRV': { name: 'Measles, Mumps, Rubella & Varicella', description: 'Combined vaccine for MMR + chickenpox' },
  'Men-C': { name: 'Meningococcal C Conjugate', description: 'Protects against meningococcal serogroup C disease' },
  'Pneu-C-13': { name: 'Pneumococcal Conjugate (13-valent)', description: 'Protects against 13 types of pneumococcal bacteria' },
  'DTaP-IPV-Hib': { name: 'Combined DTaP + Polio + Hib', description: 'Single shot combining diphtheria, tetanus, pertussis, polio, and Hib protection' },
};

export function resolveCountry(value: string | null | undefined): CountryCode {
  if (!value) return DEFAULT_COUNTRY;
  const normalized = value.trim().toLowerCase();
  return (SUPPORTED_COUNTRIES as string[]).includes(normalized)
    ? (normalized as CountryCode)
    : DEFAULT_COUNTRY;
}

export function countryFromLanguage(language: string | null | undefined): CountryCode {
  if (!language) return DEFAULT_COUNTRY;
  const lower = language.toLowerCase();
  if (lower === 'fr-ca' || lower.endsWith('-ca')) return 'ca';
  return DEFAULT_COUNTRY;
}
