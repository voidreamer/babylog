/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Sparkles } from 'lucide-react';
import TeethingCard from '../health/TeethingCard';
import AllergiesCard from '../health/AllergiesCard';
import SickDaysCard from '../health/SickDaysCard';
import RecordsSection from '../health/RecordsSection';

type Props = {
  baby: any;
  teeth: any[];
  allergies: any[];
  sickDays: any[];
  visits: any[];
  vaccinations: any[];
  medications: any[];
  showTeething: boolean;
  onDataChanged: () => void;
};

/**
 * Collapsed wellness summary.
 *
 * Surface is a single moonlight tile with 4 count chips (teeth / allergies /
 * sick days / records). Tap to expand — the underlying classic CRUD
 * components (TeethingCard, AllergiesCard, SickDaysCard, RecordsSection) slide
 * in below so all detail + add/edit/delete flows stay available without a
 * modal jump.
 *
 * This keeps the Health tab's top-of-fold calm (4 numbers at a glance) while
 * preserving full functionality for the rare cases when users want to drill in.
 */
export default function MoonlightWellnessCard({
  baby,
  teeth,
  allergies,
  sickDays,
  visits,
  vaccinations,
  medications,
  showTeething,
  onDataChanged,
}: Props) {
  const { t } = useTranslation(['health', 'common']);
  const [expanded, setExpanded] = useState(false);

  const recordsCount = (visits?.length || 0) + (medications?.filter((m: any) => m.is_active).length || 0);

  const chips: { label: string; count: number; color: string }[] = [
    ...(showTeething
      ? [
          {
            label: t('health:teething.teethShort', { defaultValue: 'teeth' }),
            count: teeth?.length || 0,
            color: '#E8A564',
          },
        ]
      : []),
    {
      label: t('health:allergies.short', { defaultValue: 'allergies' }),
      count: allergies?.length || 0,
      color: '#D98571',
    },
    {
      label: t('health:sickDays.short', { defaultValue: 'sick days' }),
      count: sickDays?.length || 0,
      color: '#B89BC4',
    },
    {
      label: t('health:records.short', { defaultValue: 'records' }),
      count: recordsCount,
      color: '#8BA5C4',
    },
  ];

  const totalCount = chips.reduce((sum, c) => sum + c.count, 0);

  return (
    <div
      style={{
        borderRadius: 18,
        background: 'var(--ml-surface)',
        border: '0.5px solid var(--ml-line)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          color: 'var(--ml-text)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: 'color-mix(in srgb, var(--ml-accent) 14%, transparent)',
            color: 'var(--ml-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ marginBottom: 2 }}>
            {t('health:wellness.title', { defaultValue: 'small wellness' })}
          </div>
          {totalCount === 0 ? (
            <div
              className="serif italic"
              style={{ fontSize: 14, color: 'var(--ml-text-2)' }}
            >
              {t('health:wellness.nothingYet', {
                defaultValue: 'Nothing recorded yet.',
              })}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px 10px',
                fontSize: 13,
                color: 'var(--ml-text-2)',
              }}
            >
              {chips.map((chip, i) => (
                <span key={chip.label} style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ color: chip.color, fontWeight: 600 }}>
                    {chip.count}
                  </span>
                  <span style={{ marginLeft: 4 }}>{chip.label}</span>
                  {i < chips.length - 1 && (
                    <span style={{ marginLeft: 10, color: 'var(--ml-text-3)' }}>·</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown
          size={18}
          aria-hidden="true"
          style={{
            color: 'var(--ml-text-3)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </button>

      {expanded && (
        <div
          className="ml-health-classic"
          style={{
            borderTop: '0.5px solid var(--ml-line)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {showTeething && (
            <TeethingCard
              baby={baby}
              teeth={teeth}
              onToothAdded={onDataChanged}
              onToothDeleted={onDataChanged}
            />
          )}
          <AllergiesCard
            baby={baby}
            allergies={allergies}
            onAllergyAdded={onDataChanged}
            onAllergyDeleted={onDataChanged}
          />
          <SickDaysCard
            baby={baby}
            sickDays={sickDays}
            onSickDayAdded={onDataChanged}
            onSickDayDeleted={onDataChanged}
          />
          <RecordsSection
            baby={baby}
            visits={visits}
            vaccinations={vaccinations}
            medications={medications}
            onDataChanged={onDataChanged}
          />
        </div>
      )}
    </div>
  );
}
