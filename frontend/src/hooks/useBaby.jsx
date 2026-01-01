import { useState, useEffect, createContext, useContext } from 'react';
import { api } from '../api/client';

const BabyContext = createContext(null);

export function BabyProvider({ children }) {
    const [babies, setBabies] = useState([]);
    const [selectedBaby, setSelectedBaby] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadBabies = async () => {
        try {
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
        const newBaby = await api.createBaby(data);
        setBabies([...babies, newBaby]);
        if (!selectedBaby) {
            selectBaby(newBaby);
        }
        return newBaby;
    };

    const removeBaby = async (id) => {
        await api.deleteBaby(id);
        const updated = babies.filter(b => b.id !== id);
        setBabies(updated);
        if (selectedBaby?.id === id) {
            setSelectedBaby(updated[0] || null);
        }
    };

    return (
        <BabyContext.Provider value={{
            babies,
            selectedBaby,
            loading,
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
