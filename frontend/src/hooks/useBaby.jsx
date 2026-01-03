import { useState, useEffect, createContext, useContext } from 'react';
import { toast } from 'sonner';
import { api } from '../api/client';

const BabyContext = createContext(null);

export function BabyProvider({ children }) {
    const [babies, setBabies] = useState([]);
    const [selectedBaby, setSelectedBaby] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadBabies = async () => {
        try {
            setError(null);
            const data = await api.getBabies();
            setBabies(data);

            // Select the first baby if none selected
            if (data.length > 0 && !selectedBaby) {
                const savedBabyId = localStorage.getItem('selected_baby_id');
                const saved = data.find(b => b.id === parseInt(savedBabyId));
                setSelectedBaby(saved || data[0]);
            }
        } catch (error) {
            console.error('Failed to load babies:', error);
            setError('Failed to load babies. Please try again.');
            toast.error('Failed to load babies', {
                description: error.message || 'Please check your connection and try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBabies();
    }, []);

    const selectBaby = (baby) => {
        setSelectedBaby(baby);
        localStorage.setItem('selected_baby_id', baby.id);
    };

    const addBaby = async (data) => {
        try {
            const newBaby = await api.createBaby(data);
            setBabies([...babies, newBaby]);
            if (!selectedBaby) {
                selectBaby(newBaby);
            }
            toast.success(`${newBaby.name} added!`, {
                description: 'Baby profile created successfully.'
            });
            return newBaby;
        } catch (error) {
            console.error('Failed to add baby:', error);
            toast.error('Failed to add baby', {
                description: error.message || 'Please try again.'
            });
            throw error;
        }
    };

    const removeBaby = async (id) => {
        try {
            const babyName = babies.find(b => b.id === id)?.name || 'Baby';
            await api.deleteBaby(id);
            const updated = babies.filter(b => b.id !== id);
            setBabies(updated);
            if (selectedBaby?.id === id) {
                setSelectedBaby(updated[0] || null);
            }
            toast.success(`${babyName} removed`, {
                description: 'Baby profile deleted successfully.'
            });
        } catch (error) {
            console.error('Failed to remove baby:', error);
            toast.error('Failed to remove baby', {
                description: error.message || 'Please try again.'
            });
            throw error;
        }
    };

    return (
        <BabyContext.Provider value={{
            babies,
            selectedBaby,
            loading,
            error,
            selectBaby,
            addBaby,
            removeBaby,
            refresh: loadBabies,
        }}>
            {children}
        </BabyContext.Provider>
    );
}

export function useBaby() {
    const context = useContext(BabyContext);
    if (!context) {
        throw new Error('useBaby must be used within a BabyProvider');
    }
    return context;
}

