/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { Check, Clock, AlertTriangle, Calendar, ChevronDown, ChevronUp, Syringe, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { showApiError } from '../../utils/errorHandling';
import { calculateAgeInMonths } from '../../utils/ageUtils';
import {
  COUNTRY_META,
  DEFAULT_COUNTRY,
  VACCINE_INFO,
  VACCINE_SCHEDULES,
} from '../../data/vaccineSchedules';
import { useUserCountry } from '../../hooks/useUserCountry';

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

  const { country } = useUserCountry();
  const VACCINATION_SCHEDULE = VACCINE_SCHEDULES[country] ?? VACCINE_SCHEDULES[DEFAULT_COUNTRY];
  const countryMeta = COUNTRY_META[country] ?? COUNTRY_META[DEFAULT_COUNTRY];

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
        <div
          className="vax-region-label"
          title={t('schedule.changeCountryHint', { defaultValue: 'Change in Settings' })}
          aria-label={`${countryMeta.authority} · ${countryMeta.label}`}
        >
          <span aria-hidden="true">{countryMeta.flag}</span>
          <span>{countryMeta.authority}</span>
          <span className="vax-region-label-country">· {countryMeta.label}</span>
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
              key={`${country}-${group.ageMonths}`}
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
