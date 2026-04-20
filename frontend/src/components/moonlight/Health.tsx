/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Baby } from 'lucide-react';
import { api } from '../../api/client';
import { useBaby } from '../../hooks/useBaby';
import { useNotificationSync } from '../../hooks/useNotificationSync';
import { calculateAgeInMonths } from '../../utils/ageUtils';
import {
  WHO_HEIGHT_BOYS,
  WHO_HEIGHT_GIRLS,
  WHO_WEIGHT_BOYS,
  WHO_WEIGHT_GIRLS,
} from '../../data/whoGrowthData';
import MoonlightGrowthCard from './GrowthCard';
import MoonlightVaxCard from './VaxCard';
import MoonlightWellnessCard from './WellnessCard';
import MedicationQuickLog from '../health/MedicationQuickLog';
import { GrowthModal } from '../health/HealthModals';

type Props = {
  showMedQuickLog?: boolean;
  onDismissMedQuickLog?: () => void;
};

/**
 * Moonlight Health — minimalist 3-section redesign.
 *
 * Consolidates the production Health page's 7 sections into 3:
 *   1. Growth (chart + latest tiles — reuses MoonlightGrowthCard)
 *   2. Next vaccination — a single "next up / overdue / all caught up" card
 *      that expands into the full CDC/NACI schedule in a sheet
 *   3. Small wellness — collapsed summary card with teeth / allergies /
 *      sick-days / records counts; expands inline for detail + edit
 *
 * Rationale: production's Health tab shows the entire catalogue every visit.
 * Parents mostly check "what's next" and "is anything off"; the rest is
 * reference. This layout keeps the reference but tucks it behind a glance-
 * first surface.
 */
export default function MoonlightHealth({
  showMedQuickLog,
  onDismissMedQuickLog,
}: Props) {
  const { t } = useTranslation(['health', 'common']);
  const { selectedBaby } = useBaby();
  const { reschedule } = useNotificationSync(selectedBaby?.id, selectedBaby?.name);

  const [loading, setLoading] = useState(true);
  const [showGrowthModal, setShowGrowthModal] = useState(false);

  const [visits, setVisits] = useState<any[]>([]);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [growthRecords, setGrowthRecords] = useState<any[]>([]);
  const [teeth, setTeeth] = useState<any[]>([]);
  const [sickDays, setSickDays] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);

  const whoData = {
    WHO_WEIGHT_BOYS,
    WHO_WEIGHT_GIRLS,
    WHO_HEIGHT_BOYS,
    WHO_HEIGHT_GIRLS,
  };

  const loadData = async () => {
    if (!selectedBaby) return;
    setLoading(true);
    try {
      const [v, va, m, g, te, s, a] = await Promise.all([
        api.getDoctorVisits(selectedBaby.id),
        api.getVaccinations(selectedBaby.id),
        api.getMedications(selectedBaby.id),
        api.getGrowthRecords(selectedBaby.id),
        api.getTeeth(selectedBaby.id),
        api.getSickDays(selectedBaby.id),
        api.getAllergies(selectedBaby.id),
      ]);
      setVisits(v);
      setVaccinations(va);
      setMedications(m);
      setGrowthRecords(g);
      setTeeth(te);
      setSickDays(s);
      setAllergies(a);
      reschedule();
    } catch {
      toast.error(t('health:failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBaby?.id]);

  const ageMonths = selectedBaby?.birth_date
    ? calculateAgeInMonths(selectedBaby.birth_date)
    : null;
  const showTeething = ageMonths !== null && ageMonths >= 4;

  if (!selectedBaby) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '80px 20px',
          gap: 12,
          color: 'var(--ml-text-2)',
        }}
      >
        <Baby size={40} style={{ opacity: 0.5 }} aria-hidden="true" />
        <div className="serif italic" style={{ fontSize: 17 }}>
          {t('common:noBabySelected')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px 8px', color: 'var(--ml-text)' }}>
      {/* Header */}
      <div className="mono" style={{ marginBottom: 2 }}>
        {t('health:title', { defaultValue: 'health' }).toLowerCase()}
      </div>
      <h1
        style={{
          fontFamily: 'Geist Variable, Geist, -apple-system, sans-serif',
          fontWeight: 300,
          fontSize: 34,
          margin: '2px 0 4px',
          letterSpacing: -1,
          color: 'var(--ml-text)',
        }}
      >
        {t('health:moonlight.growthAnd', { defaultValue: 'Growth & ' })}
        <em className="serif" style={{ color: 'var(--ml-accent)', fontStyle: 'italic' }}>
          {t('health:moonlight.wellbeing', { defaultValue: 'wellbeing' })}
        </em>
      </h1>
      <p
        className="serif italic"
        style={{
          fontSize: 15,
          lineHeight: 1.4,
          color: 'var(--ml-text-2)',
          margin: '8px 0 24px',
          maxWidth: 320,
        }}
      >
        {t('health:moonlight.intro', {
          defaultValue:
            "Growth curves, vaccinations, and the small things worth remembering.",
        })}
      </p>

      {loading ? (
        <div
          className="serif italic"
          style={{ color: 'var(--ml-text-3)', padding: '24px 0', textAlign: 'center' }}
        >
          {t('common:loading', { defaultValue: 'Loading\u2026' })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 1. Growth */}
          <MoonlightGrowthCard
            baby={selectedBaby}
            growthRecords={growthRecords}
            whoData={whoData}
            onOpenGrowthModal={() => setShowGrowthModal(true)}
          />

          {/* 2. Next vaccination — single card with expand-to-schedule */}
          <MoonlightVaxCard
            baby={selectedBaby}
            vaccinations={vaccinations}
            onDataChanged={loadData}
          />

          {/* 3. Small wellness — collapsed summary, expands inline */}
          <MoonlightWellnessCard
            baby={selectedBaby}
            teeth={teeth}
            allergies={allergies}
            sickDays={sickDays}
            visits={visits}
            vaccinations={vaccinations}
            medications={medications}
            showTeething={showTeething}
            onDataChanged={loadData}
          />
        </div>
      )}

      {showGrowthModal && (
        <GrowthModal
          babyId={selectedBaby.id}
          onClose={() => setShowGrowthModal(false)}
          onSave={() => {
            setShowGrowthModal(false);
            void loadData();
          }}
        />
      )}

      {showMedQuickLog && onDismissMedQuickLog && (
        <MedicationQuickLog onDismiss={onDismissMedQuickLog} />
      )}
    </div>
  );
}
