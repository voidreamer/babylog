/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import { Baby } from 'lucide-react';
import { WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS, WHO_HEIGHT_BOYS, WHO_HEIGHT_GIRLS } from '../data/whoGrowthData';
import { useNotificationSync } from '../hooks/useNotificationSync';
import { motion } from 'framer-motion';

// Components
import GrowthCard from '../components/health/GrowthCard';
import VaccinationSchedule from '../components/health/VaccinationSchedule';
import TeethingCard from '../components/health/TeethingCard';
import SickDaysCard from '../components/health/SickDaysCard';
import AllergiesCard from '../components/health/AllergiesCard';
import RecordsSection from '../components/health/RecordsSection';
import MedicationQuickLog from '../components/health/MedicationQuickLog';
import { GrowthModal } from '../components/health/HealthModals';
import { useTranslation } from 'react-i18next';
import { calculateAgeInMonths } from '../utils/ageUtils';

interface HealthProps {
    showMedQuickLog?: boolean;
    onDismissMedQuickLog?: () => void;
}

const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
};

export default function Health({ showMedQuickLog, onDismissMedQuickLog }: HealthProps = {}) {
    const { t } = useTranslation('health');
    const { selectedBaby } = useBaby();
    const { reschedule } = useNotificationSync(selectedBaby?.id, selectedBaby?.name);
    const [loading, setLoading] = useState(true);
    const [showGrowthModal, setShowGrowthModal] = useState(false);

    // Data
    const [visits, setVisits] = useState<any[]>([]);
    const [vaccinations, setVaccinations] = useState<any[]>([]);
    const [medications, setMedications] = useState<any[]>([]);
    const [growthRecords, setGrowthRecords] = useState<any[]>([]);
    const [teeth, setTeeth] = useState<any[]>([]);
    const [sickDays, setSickDays] = useState<any[]>([]);
    const [allergies, setAllergies] = useState<any[]>([]);

    // WHO data for growth chart
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
            const [v, va, m, g, t, s, a] = await Promise.all([
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
            setTeeth(t);
            setSickDays(s);
            setAllergies(a);
            reschedule();
        } catch (error) {
            toast.error(t('failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedBaby]);

    // Calculate baby's age in months for teething visibility
    const babyAgeMonths = selectedBaby?.birth_date
        ? calculateAgeInMonths(selectedBaby.birth_date)
        : null;

    // Show teething card if baby is 4+ months old (teeth typically start around 6 months)
    const showTeething = babyAgeMonths !== null && babyAgeMonths >= 4;

    if (!selectedBaby) {
        return (
            <div className="empty-state">
                <Baby size={48} style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                <h2 className="empty-state-title">{t('common:noBabySelected')}</h2>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="health-dashboard">
                <div className="skeleton skeleton-card" />
                <div className="skeleton skeleton-card" style={{ height: '120px' }} />
                <div className="health-cards-grid">
                    {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '150px' }} />)}
                </div>
                <div className="records-summary-grid">
                    {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" style={{ height: '80px' }} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="health-dashboard">
            {/* Section 1: Growth (full width, chart visible by default) */}
            <motion.section
                className="health-section health-section-primary"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0 }}
            >
                <GrowthCard
                    baby={selectedBaby}
                    growthRecords={growthRecords}
                    onRecordAdded={loadData}
                    whoData={whoData}
                    defaultChartVisible={true}
                    onOpenGrowthModal={() => setShowGrowthModal(true)}
                />
            </motion.section>

            {/* Section 2: Vaccination Schedule (standalone card) */}
            <motion.section
                className="health-section"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <VaccinationSchedule
                    baby={selectedBaby}
                    vaccinations={vaccinations}
                    onDataChanged={loadData}
                />
            </motion.section>

            {/* Section 3: Conditions Grid */}
            <motion.section
                className="health-cards-grid"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.2 }}
            >
                {showTeething && (
                    <TeethingCard
                        baby={selectedBaby}
                        teeth={teeth}
                        onToothAdded={loadData}
                        onToothDeleted={loadData}
                    />
                )}

                <AllergiesCard
                    baby={selectedBaby}
                    allergies={allergies}
                    onAllergyAdded={loadData}
                    onAllergyDeleted={loadData}
                />

                <SickDaysCard
                    baby={selectedBaby}
                    sickDays={sickDays}
                    onSickDayAdded={loadData}
                    onSickDayDeleted={loadData}
                />
            </motion.section>

            {/* Section 4: Medical Records (summary cards) */}
            <motion.section
                className="health-section"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.3 }}
            >
                <RecordsSection
                    baby={selectedBaby}
                    visits={visits}
                    vaccinations={vaccinations}
                    medications={medications}
                    onDataChanged={loadData}
                />
            </motion.section>

            {/* Growth Modal */}
            {showGrowthModal && (
                <GrowthModal
                    babyId={selectedBaby.id}
                    onClose={() => setShowGrowthModal(false)}
                    onSave={() => {
                        setShowGrowthModal(false);
                        loadData();
                    }}
                />
            )}

            {showMedQuickLog && onDismissMedQuickLog && (
                <MedicationQuickLog onDismiss={onDismissMedQuickLog} />
            )}
        </div>
    );
}
