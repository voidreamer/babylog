/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';
import { api } from '../api/client';

interface CaregiverEntry { email: string; role: 'viewer' | 'caregiver'; }

interface Baby {
    id: number;
    name: string;
    birth_date: string | null;
    gender: string | null;
    profile_photo_url?: string | null;
    blood_type?: string | null;
    birthplace?: string | null;
    birth_time?: string | null;
    is_owner?: boolean;
    shared_with?: CaregiverEntry[];
    [key: string]: any;
}

interface BabyContextValue {
    babies: Baby[];
    selectedBaby: Baby | null;
    loading: boolean;
    error: string | null;
    selectBaby: (baby: Baby) => void;
    addBaby: (data: any) => Promise<Baby>;
    removeBaby: (id: number) => Promise<void>;
    refresh: () => Promise<void>;
}

const BabyContext = createContext<BabyContextValue | null>(null);

interface BabyProviderProps {
    children: ReactNode;
}

export function BabyProvider({ children }: BabyProviderProps) {
    const [babies, setBabies] = useState<Baby[]>([]);
    const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBabies = async () => {
        try {
            setError(null);
            const data = await api.getBabies();
            setBabies(data);

            if (data.length > 0) {
                if (selectedBaby) {
                    // Refresh selectedBaby with latest data (e.g. after photo upload)
                    const updated = data.find((b: Baby) => b.id === selectedBaby.id);
                    if (updated) setSelectedBaby(updated);
                } else {
                    const savedBabyId = localStorage.getItem('selected_baby_id');
                    const saved = data.find((b: Baby) => b.id === parseInt(savedBabyId || '0'));
                    setSelectedBaby(saved || data[0]);
                }
            }
        } catch (error) {
            console.error('Failed to load babies:', error);
            setError('Failed to load babies. Please try again.');
            toast.error('Failed to load babies', {
                description: (error as Error).message || 'Please check your connection and try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBabies();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectBaby = (baby: Baby) => {
        setSelectedBaby(baby);
        localStorage.setItem('selected_baby_id', String(baby.id));
    };

    const addBaby = async (data: any): Promise<Baby> => {
        try {
            const newBaby = await api.createBaby(data);
            setBabies([...babies, newBaby]);
            if (!selectedBaby) { selectBaby(newBaby); }
            toast.success(`${newBaby.name} added!`, { description: 'Baby profile created successfully.' });
            return newBaby;
        } catch (error) {
            console.error('Failed to add baby:', error);
            toast.error('Failed to add baby', { description: (error as Error).message || 'Please try again.' });
            throw error;
        }
    };

    const removeBaby = async (id: number) => {
        try {
            const babyName = babies.find(b => b.id === id)?.name || 'Baby';
            await api.deleteBaby(id);
            const updated = babies.filter(b => b.id !== id);
            setBabies(updated);
            if (selectedBaby?.id === id) { setSelectedBaby(updated[0] || null); }
            toast.success(`${babyName} removed`, { description: 'Baby profile deleted successfully.' });
        } catch (error) {
            console.error('Failed to remove baby:', error);
            toast.error('Failed to remove baby', { description: (error as Error).message || 'Please try again.' });
            throw error;
        }
    };

    return (
        <BabyContext.Provider value={{ babies, selectedBaby, loading, error, selectBaby, addBaby, removeBaby, refresh: loadBabies }}>
            {children}
        </BabyContext.Provider>
    );
}

export function useBaby(): BabyContextValue {
    const context = useContext(BabyContext);
    if (!context) {
        throw new Error('useBaby must be used within a BabyProvider');
    }
    return context;
}
