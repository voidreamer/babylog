/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Check, Clock, AlertTriangle, Calendar, ChevronDown, ChevronUp, Syringe, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { showApiError } from '../../utils/errorHandling';
import { calculateAgeInMonths } from '../../utils/ageUtils';

/** Full names and descriptions for vaccine codes */
const VACCINE_INFO: Record<string, { name: string; description: string }> = {
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

// CDC recommended schedule (United States)
const CDC_SCHEDULE = [
  { ageMonths: 0, ageKey: 'birth', vaccines: ['Hep B'] },
  { ageMonths: 2, ageKey: '2months', vaccines: ['DTaP', 'IPV', 'Hib', 'PCV13', 'RV', 'Hep B'] },
  { ageMonths: 4, ageKey: '4months', vaccines: ['DTaP', 'IPV', 'Hib', 'PCV13', 'RV'] },
  { ageMonths: 6, ageKey: '6months', vaccines: ['DTaP', 'Hib', 'PCV13', 'RV', 'Hep B', 'Influenza'] },
  { ageMonths: 12, ageKey: '12months', vaccines: ['MMR', 'Varicella', 'Hep A', 'PCV13'] },
  { ageMonths: 15, ageKey: '15months', vaccines: ['DTaP'] },
  { ageMonths: 18, ageKey: '18months', vaccines: ['Hep A'] },
];

// Canadian (NACI) recommended schedule
const CANADA_SCHEDULE = [
  { ageMonths: 0, ageKey: 'birth', vaccines: ['Hep B'] },
  { ageMonths: 2, ageKey: '2months', vaccines: ['DTaP-IPV-Hib', 'Pneu-C-13', 'RV'] },
  { ageMonths: 4, ageKey: '4months', vaccines: ['DTaP-IPV-Hib', 'Pneu-C-13', 'RV'] },
  { ageMonths: 6, ageKey: '6months', vaccines: ['DTaP-IPV-Hib', 'Influenza'] },
  { ageMonths: 12, ageKey: '12months', vaccines: ['MMR', 'Pneu-C-13', 'Men-C', 'Varicella'] },
  { ageMonths: 18, ageKey: '18months', vaccines: ['DTaP-IPV-Hib', 'MMRV'] },
];

type ScheduleRegion = 'us' | 'ca';
type VaccineStatus = 'done' | 'overdue' | 'upcoming' | 'future';

interface VaccinationScheduleProps {
  baby: any;
  vaccinations: any[];
  onDataChanged?: () => void;
}

export default function VaccinationSchedule({ baby, vaccinations, onDataChanged }: VaccinationScheduleProps) {
  const { t } = useTranslation('health');
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [markingVaccine, setMarkingVaccine] = useState<string | null>(null);
  const [markDate, setMarkDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [hoveredVaccine, setHoveredVaccine] = useState<string | null>(null);

  // Detect region from language or allow manual toggle
  const [region, setRegion] = useState<ScheduleRegion>(() => {
    const lang = localStorage.getItem('language') || navigator.language;
    if (lang.includes('CA') || lang.includes('ca')) return 'ca';
    return 'us';
  });

  const VACCINATION_SCHEDULE = region === 'ca' ? CANADA_SCHEDULE : CDC_SCHEDULE;

  const babyAgeMonths = useMemo(() => {
    if (!baby?.birth_date) return null;
    return calculateAgeInMonths(baby.birth_date);
  }, [baby?.birth_date]);

  const administeredVaccines = useMemo(() => {
    const map = new Map<string, any[]>();
    vaccinations?.forEach(v => {
      const key = v.vaccine_name.toUpperCase().trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return map;
  }, [vaccinations]);

  const isVaccineDone = (vaccineName: string, ageGroup: typeof VACCINATION_SCHEDULE[0]) => {
    const key = vaccineName.toUpperCase().trim();
    const records = administeredVaccines.get(key) || [];
    const groupIndex = VACCINATION_SCHEDULE.filter(g => g.ageMonths <= ageGroup.ageMonths)
      .filter(g => g.vaccines.includes(vaccineName)).length;
    return records.length >= groupIndex;
  };

  const getVaccineStatus = (vaccineName: string, ageGroup: typeof VACCINATION_SCHEDULE[0]): VaccineStatus => {
    if (isVaccineDone(vaccineName, ageGroup)) return 'done';
    if (babyAgeMonths === null) return 'future';
    if (babyAgeMonths >= ageGroup.ageMonths + 2) return 'overdue';
    if (babyAgeMonths >= ageGroup.ageMonths - 1) return 'upcoming';
    return 'future';
  };

  const totalVaccines = VACCINATION_SCHEDULE.reduce((sum, g) => sum + g.vaccines.length, 0);
  const completedVaccines = VACCINATION_SCHEDULE.reduce((sum, g) =>
    sum + g.vaccines.filter(v => isVaccineDone(v, g)).length, 0);

  const handleMarkDone = async (vaccineName: string, ageGroup: typeof VACCINATION_SCHEDULE[0]) => {
    setSaving(true);
    try {
      const doseNumber = VACCINATION_SCHEDULE
        .filter(g => g.ageMonths <= ageGroup.ageMonths)
        .filter(g => g.vaccines.includes(vaccineName)).length;

      await api.createVaccination({
        baby_id: baby.id,
        vaccine_name: vaccineName,
        dose_number: doseNumber,
        given_date: markDate,
        next_due_date: null,
        administered_by: null,
        notes: `${t('schedule.scheduledAt')} ${t(`schedule.ages.${ageGroup.ageKey}`)}`,
      });
      toast.success(t('toast_vaccinationRecorded'));
      setMarkingVaccine(null);
      setMarkDate(new Date().toISOString().split('T')[0]);
      if (onDataChanged) onDataChanged();
    } catch (error) {
      showApiError(error, t('failedToSave'), t);
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = totalVaccines > 0 ? Math.round((completedVaccines / totalVaccines) * 100) : 0;

  const statusClass = (status: VaccineStatus) => {
    switch (status) {
      case 'done': return 'vaccine-done';
      case 'overdue': return 'vaccine-overdue';
      case 'upcoming': return 'vaccine-upcoming';
      default: return 'vaccine-future';
    }
  };

  const statusIcon = (status: VaccineStatus) => {
    switch (status) {
      case 'done': return <Check size={14} />;
      case 'overdue': return <AlertTriangle size={14} />;
      case 'upcoming': return <Clock size={14} />;
      default: return <Calendar size={14} />;
    }
  };

  return (
    <div className="health-card vaccination-schedule-card">
      <div className="health-card-header">
        <h3 className="health-card-title">
          <Syringe size={18} />
          {t('schedule.progress')}
        </h3>
        {/* Region toggle */}
        <div className="vax-region-toggle">
          <button
            className={`vax-region-btn ${region === 'us' ? 'active' : ''}`}
            onClick={() => setRegion('us')}
            title="CDC (United States)"
          >
            🇺🇸 CDC
          </button>
          <button
            className={`vax-region-btn ${region === 'ca' ? 'active' : ''}`}
            onClick={() => setRegion('ca')}
            title="NACI (Canada)"
          >
            🇨🇦 NACI
          </button>
        </div>
      </div>
      <div className="vaccination-schedule">
      {/* Progress bar */}
      <div className="vax-progress">
        <div className="vax-progress-header">
          <Syringe size={16} />
          <span className="vax-progress-label">{t('schedule.progress')}</span>
          <span className="vax-progress-count">{completedVaccines}/{totalVaccines}</span>
        </div>
        <div className="vax-progress-bar">
          <div className="vax-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="vax-progress-percent">{progressPercent}% {t('schedule.complete')}</div>
      </div>

      {/* Legend */}
      <div className="vax-legend">
        <span className="vax-legend-item vaccine-done"><Check size={12} /> {t('schedule.done')}</span>
        <span className="vax-legend-item vaccine-overdue"><AlertTriangle size={12} /> {t('schedule.overdue')}</span>
        <span className="vax-legend-item vaccine-upcoming"><Clock size={12} /> {t('schedule.upcoming')}</span>
        <span className="vax-legend-item vaccine-future"><Calendar size={12} /> {t('schedule.future')}</span>
      </div>

      {/* Schedule groups */}
      <div className="vax-groups">
        {VACCINATION_SCHEDULE.map((group) => {
          const isExpanded = expandedGroup === group.ageMonths;
          const groupDone = group.vaccines.filter(v => isVaccineDone(v, group)).length;
          const allDone = groupDone === group.vaccines.length;
          const hasOverdue = group.vaccines.some(v => getVaccineStatus(v, group) === 'overdue');
          const isCurrent = babyAgeMonths !== null &&
            babyAgeMonths >= group.ageMonths - 1 &&
            babyAgeMonths < group.ageMonths + 3;

          return (
            <div
              key={`${region}-${group.ageMonths}`}
              className={`vax-group ${allDone ? 'vax-group-done' : ''} ${hasOverdue ? 'vax-group-overdue' : ''} ${isCurrent ? 'vax-group-current' : ''}`}
            >
              <button
                className="vax-group-header"
                onClick={() => setExpandedGroup(isExpanded ? null : group.ageMonths)}
              >
                <div className="vax-group-title">
                  <span className="vax-group-age">{t(`schedule.ages.${group.ageKey}`)}</span>
                  <span className="vax-group-count">{groupDone}/{group.vaccines.length}</span>
                </div>
                <div className="vax-group-pills">
                  {group.vaccines.map(v => (
                    <span
                      key={v}
                      className={`vax-pill ${statusClass(getVaccineStatus(v, group))}`}
                      onMouseEnter={() => setHoveredVaccine(v)}
                      onMouseLeave={() => setHoveredVaccine(null)}
                      title={VACCINE_INFO[v]?.name || v}
                    >
                      {v}
                      {hoveredVaccine === v && VACCINE_INFO[v] && (
                        <span className="vax-pill-tooltip">
                          <strong>{VACCINE_INFO[v].name}</strong>
                          <br />
                          {VACCINE_INFO[v].description}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isExpanded && (
                <div className="vax-group-details">
                  {group.vaccines.map(v => {
                    const status = getVaccineStatus(v, group);
                    const isMarking = markingVaccine === `${group.ageMonths}-${v}`;
                    const info = VACCINE_INFO[v];

                    return (
                      <div key={v} className={`vax-detail-item ${statusClass(status)}`}>
                        <div className="vax-detail-header">
                          {statusIcon(status)}
                          <div className="vax-detail-name-group">
                            <span className="vax-detail-name">{v}</span>
                            {info && (
                              <span className="vax-detail-fullname">{info.name}</span>
                            )}
                          </div>
                          <span className={`vax-status-badge ${statusClass(status)}`}>
                            {t(`schedule.${status}`)}
                          </span>
                        </div>
                        {info && (
                          <div className="vax-detail-description">
                            <Info size={12} />
                            {info.description}
                          </div>
                        )}
                        {status !== 'done' && (
                          <>
                            {isMarking ? (
                              <div className="vax-mark-form">
                                <input
                                  type="date"
                                  value={markDate}
                                  onChange={(e) => setMarkDate(e.target.value)}
                                  className="record-date-input"
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleMarkDone(v, group)}
                                  disabled={saving}
                                >
                                  {saving ? '...' : t('schedule.confirm')}
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setMarkingVaccine(null)}
                                >
                                  {t('common:cancel')}
                                </button>
                              </div>
                            ) : (
                              <button
                                className="vax-mark-btn"
                                onClick={() => {
                                  setMarkingVaccine(`${group.ageMonths}-${v}`);
                                  setMarkDate(new Date().toISOString().split('T')[0]);
                                }}
                              >
                                <Check size={12} />
                                {t('schedule.markDone')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
