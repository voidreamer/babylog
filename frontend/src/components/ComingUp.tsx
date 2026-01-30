/* eslint-disable @typescript-eslint/no-explicit-any */
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Syringe, Stethoscope, Pill, CalendarClock } from 'lucide-react';

const ICONS: Record<string, any> = {
    vaccination: Syringe,
    doctor_visit: Stethoscope,
    medication: Pill,
};

interface ComingUpProps { items?: any[]; }
export default function ComingUp({ items = [] }: ComingUpProps) {
    if (!items.length) return null;

    return (
        <motion.div
            className="coming-up-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="coming-up-header">
                <CalendarClock size={18} />
                <h3>Coming Up</h3>
            </div>
            <div className="coming-up-list">
                {items.map((item, i) => {
                    const Icon = ICONS[item.type] || CalendarClock;
                    return (
                        <div key={i} className={`coming-up-item coming-up-${item.color}`}>
                            <div className="coming-up-icon">
                                <Icon size={16} />
                            </div>
                            <div className="coming-up-info">
                                <span className="coming-up-title">{item.title}</span>
                                <span className="coming-up-detail">
                                    {item.date
                                        ? format(parseISO(item.date), 'MMM d, yyyy')
                                        : item.frequency || item.dosage || 'Ongoing'}
                                </span>
                            </div>
                            <span className={`coming-up-badge ${item.color}`}>
                                {item.type === 'medication' ? 'Active' :
                                    item.type === 'vaccination' ? 'Vaccine' : 'Visit'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
