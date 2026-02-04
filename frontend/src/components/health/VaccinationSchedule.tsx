/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Check, Clock, AlertTriangle, Calendar, ChevronDown, ChevronUp, Syringe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api } from '../../api/client';

// CDC/WHO recommended vaccination schedule (0-24 months)
const VACCINATION_SCHEDULE = [
  {
    ageMonths: 0,
    ageKey: 'birth',
    vaccines: ['Hep B'],
  },
  {
    ageMonths: 2,
    ageKey: '2months',
    vaccines: ['DTaP', 'IPV', 'Hib', 'PCV13', 'RV', 'Hep B'],
  },
  {
    ageMonths: 4,
    ageKey: '4months',
    vaccines: ['DTaP', 'IPV', 'Hib', 'PCV13', 'RV'],
  },
  {
    ageMonths: 6,
    ageKey: '6months',
    vaccines: ['DTaP', 'Hib', 'PCV13', 'RV', 'Hep B', 'Influenza'],
  },
  {
    ageMonths: 12,
    ageKey: '12months',
    vaccines: ['MMR', 'Varicella', 'Hep A', 'PCV13'],
  },
  {
    ageMonths: 15,
    ageKey: '15months',
    vaccines: ['DTaP'],
  },
  {
    ageMonths: 18,
    ageKey: '18months',
    vaccines: ['Hep A'],
  },
];

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

  // Calculate baby's age in months
  const babyAgeMonths = useMemo(() => {
    if (!baby?.birth_date) return null;
    const birth = new Date(baby.birth_date);
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  }, [baby?.birth_date]);

  // Build a set of administered vaccine names (normalized)
  const administeredVaccines = useMemo(() => {
    const map = new Map<string, any[]>();
    vaccinations?.forEach(v => {
      const key = v.vaccine_name.toUpperCase().trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    });
    return map;
  }, [vaccinations]);

  // Check if a specific vaccine in a specific age group is done
  const isVaccineDone = (vaccineName: string, ageGroup: typeof VACCINATION_SCHEDULE[0]) => {
    const key = vaccineName.toUpperCase().trim();
    const records = administeredVaccines.get(key) || [];
    // Count how many doses before this age group
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

  // Overall progress
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
    } catch {
      toast.error(t('failedToSave'));
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
              key={group.ageMonths}
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
                    <span key={v} className={`vax-pill ${statusClass(getVaccineStatus(v, group))}`}>
                      {v}
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

                    return (
                      <div key={v} className={`vax-detail-item ${statusClass(status)}`}>
                        <div className="vax-detail-header">
                          {statusIcon(status)}
                          <span className="vax-detail-name">{v}</span>
                          <span className={`vax-status-badge ${statusClass(status)}`}>
                            {t(`schedule.${status}`)}
                          </span>
                        </div>
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
  );
}
