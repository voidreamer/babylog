/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import { Baby } from 'lucide-react';
import { WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS, WHO_HEIGHT_BOYS, WHO_HEIGHT_GIRLS } from '../data/whoGrowthData';

// Components
import GrowthCard from '../components/health/GrowthCard';
import MilestonesCard from '../components/health/MilestonesCard';
import TeethingCard from '../components/health/TeethingCard';
import SickDaysCard from '../components/health/SickDaysCard';
import AllergiesCard from '../components/health/AllergiesCard';
import RecordsSection from '../components/health/RecordsSection';

export default function Health() {
    const { selectedBaby } = useBaby();
    const [loading, setLoading] = useState(true);

    // Data
    const [visits, setVisits] = useState<any[]>([]);
    const [vaccinations, setVaccinations] = useState<any[]>([]);
    const [medications, setMedications] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
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
            const [v, va, m, mi, g, t, s, a] = await Promise.all([
                api.getDoctorVisits(selectedBaby.id),
                api.getVaccinations(selectedBaby.id),
                api.getMedications(selectedBaby.id),
                api.getMilestones(selectedBaby.id),
                api.getGrowthRecords(selectedBaby.id),
                api.getTeeth(selectedBaby.id),
                api.getSickDays(selectedBaby.id),
                api.getAllergies(selectedBaby.id),
            ]);
            setVisits(v);
            setVaccinations(va);
            setMedications(m);
            setMilestones(mi);
            setGrowthRecords(g);
            setTeeth(t);
            setSickDays(s);
            setAllergies(a);
        } catch (error) {
            toast.error('Failed to load health data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedBaby]);

    // Calculate baby's age in months for teething visibility
    const babyAgeMonths = selectedBaby?.birth_date
        ? Math.floor((new Date().getTime() - new Date(selectedBaby.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        : null;

    // Show teething card if baby is 4+ months old (teeth typically start around 6 months)
    const showTeething = babyAgeMonths !== null && babyAgeMonths >= 4;

    if (!selectedBaby) {
        return (
            <div className="empty-state">
                <Baby size={48} style={{ opacity: 0.5, marginBottom: 'var(--space-md)' }} />
                <h2 className="empty-state-title">No baby selected</h2>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="health-dashboard">
            {/* Top Row: Growth Chart (always visible) */}
            <section className="health-section health-section-primary">
                <GrowthCard
                    baby={selectedBaby}
                    growthRecords={growthRecords}
                    onRecordAdded={loadData}
                    whoData={whoData}
                />
            </section>

            {/* Cards Grid */}
            <section className="health-cards-grid">
                <MilestonesCard
                    baby={selectedBaby}
                    milestones={milestones}
                    onMilestoneAdded={loadData}
                    onMilestoneDeleted={loadData}
                />

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
            </section>

            {/* Records Section (Visits, Vaccinations, Medications) */}
            <section className="health-section">
                <RecordsSection
                    baby={selectedBaby}
                    visits={visits}
                    vaccinations={vaccinations}
                    medications={medications}
                    onDataChanged={loadData}
                />
            </section>
        </div>
    );
}
