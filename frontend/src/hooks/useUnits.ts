import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type UnitSystem = 'metric' | 'imperial';

const STORAGE_KEY = 'heybub-units';

const KG_TO_LBS = 2.20462;
const CM_TO_IN = 0.393701;
const ML_TO_OZ = 0.033814;

function celsiusToFahrenheit(c: number): number {
  return c * 9 / 5 + 32;
}

function fahrenheitToCelsius(f: number): number {
  return (f - 32) * 5 / 9;
}

export function useUnits() {
  const { t } = useTranslation('settings');
  const [units, setUnitsState] = useState<UnitSystem>(() => {
    return (localStorage.getItem(STORAGE_KEY) as UnitSystem) || 'metric';
  });

  const setUnits = useCallback((u: UnitSystem) => {
    localStorage.setItem(STORAGE_KEY, u);
    setUnitsState(u);
  }, []);

  const isImperial = units === 'imperial';

  // Conversion from metric (storage) to display
  const convertWeight = useCallback((kg: number): number => {
    return isImperial ? kg * KG_TO_LBS : kg;
  }, [isImperial]);

  const convertLength = useCallback((cm: number): number => {
    return isImperial ? cm * CM_TO_IN : cm;
  }, [isImperial]);

  const convertVolume = useCallback((ml: number): number => {
    return isImperial ? ml * ML_TO_OZ : ml;
  }, [isImperial]);

  const convertTemp = useCallback((celsius: number): number => {
    return isImperial ? celsiusToFahrenheit(celsius) : celsius;
  }, [isImperial]);

  // Conversion from display input back to metric for storage
  const parseWeight = useCallback((val: number): number => {
    return isImperial ? val / KG_TO_LBS : val;
  }, [isImperial]);

  const parseLength = useCallback((val: number): number => {
    return isImperial ? val / CM_TO_IN : val;
  }, [isImperial]);

  const parseVolume = useCallback((val: number): number => {
    return isImperial ? val / ML_TO_OZ : val;
  }, [isImperial]);

  const parseTemp = useCallback((val: number): number => {
    return isImperial ? fahrenheitToCelsius(val) : val;
  }, [isImperial]);

  // Display formatters
  const formatWeight = useCallback((kg: number | null | undefined, decimals = 1): string => {
    if (kg == null) return '--';
    const val = convertWeight(parseFloat(String(kg)));
    return `${val.toFixed(decimals)} ${isImperial ? 'lbs' : 'kg'}`;
  }, [convertWeight, isImperial]);

  const formatLength = useCallback((cm: number | null | undefined, decimals = 1): string => {
    if (cm == null) return '--';
    const val = convertLength(parseFloat(String(cm)));
    return `${val.toFixed(decimals)} ${isImperial ? 'in' : 'cm'}`;
  }, [convertLength, isImperial]);

  const formatVolume = useCallback((ml: number | null | undefined, decimals = 0): string => {
    if (ml == null) return '--';
    const val = convertVolume(parseFloat(String(ml)));
    return `${val.toFixed(decimals)} ${isImperial ? 'oz' : 'ml'}`;
  }, [convertVolume, isImperial]);

  const formatTemp = useCallback((celsius: number | null | undefined, decimals = 1): string => {
    if (celsius == null) return '--';
    const val = convertTemp(parseFloat(String(celsius)));
    return `${val.toFixed(decimals)}°${isImperial ? 'F' : 'C'}`;
  }, [convertTemp, isImperial]);

  // Unit labels
  const weightUnit = isImperial ? 'lbs' : 'kg';
  const lengthUnit = isImperial ? 'in' : 'cm';
  const volumeUnit = isImperial ? 'oz' : 'ml';
  const tempUnit = isImperial ? '°F' : '°C';

  // Placeholder helpers
  const weightPlaceholder = isImperial ? t('units.lbs', 'lbs') : t('units.kg', 'kg');
  const lengthPlaceholder = isImperial ? t('units.in', 'in') : t('units.cm', 'cm');
  const volumePlaceholder = isImperial ? t('units.oz', 'oz') : t('units.ml', 'ml');
  const tempPlaceholder = isImperial ? '°F' : '°C';

  return {
    units,
    setUnits,
    isImperial,
    // Converters (metric → display)
    convertWeight,
    convertLength,
    convertVolume,
    convertTemp,
    // Parsers (display → metric)
    parseWeight,
    parseLength,
    parseVolume,
    parseTemp,
    // Formatters
    formatWeight,
    formatLength,
    formatVolume,
    formatTemp,
    // Unit labels
    weightUnit,
    lengthUnit,
    volumeUnit,
    tempUnit,
    weightPlaceholder,
    lengthPlaceholder,
    volumePlaceholder,
    tempPlaceholder,
  };
}
