/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Star, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { format, parseISO } from 'date-fns';
import { formatDate } from '../../utils/formatDate';

interface MilestonesCardProps { baby: any; milestones: any[]; onMilestoneAdded?: () => void; onMilestoneDeleted?: () => void; }
export default function MilestonesCard({ baby, milestones, onMilestoneAdded, onMilestoneDeleted }: MilestonesCardProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        milestone: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Show only last 5 milestones
    const recentMilestones = milestones?.slice(0, 5) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.milestone.trim()) {
            toast.error('Please describe the milestone');
            return;
        }

        setSaving(true);
        try {
            const data = {
                baby_id: baby.id,
                milestone_type: formData.milestone.trim(),
                achieved_date: new Date(formData.date).toISOString(),
            };

            await api.createMilestone(data);
            toast.success('Milestone added!');
            setFormData({ milestone: '', date: new Date().toISOString().split('T')[0] });
            setIsAdding(false);
            if (onMilestoneAdded) onMilestoneAdded();
        } catch (error) {
            toast.error('Failed to save: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.deleteMilestone(id);
            toast.success('Milestone deleted');
            if (onMilestoneDeleted) onMilestoneDeleted();
        } catch (error) {
            toast.error('Failed to delete: ' + (error as Error).message);
        }
    };

    const formatDate = (dateStr: string): string => {
        try {
            return format(parseISO(dateStr), 'MMM d');
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="health-card">
            <div className="health-card-header">
                <h3 className="health-card-title">
                    <Star size={18} />
                    Milestones
                </h3>
                {milestones?.length > 5 && (
                    <span className="health-card-count">{milestones.length} total</span>
                )}
            </div>

            {/* Recent Milestones List */}
            {recentMilestones.length > 0 ? (
                <div className="milestones-list">
                    {recentMilestones.map((milestone) => (
                        <div key={milestone.id} className="milestone-item">
                            <div className="milestone-content">
                                <span className="milestone-date">{formatDate(milestone.achieved_date)}</span>
                                <span className="milestone-text">{milestone.milestone_type}</span>
                            </div>
                            <button
                                className="milestone-delete"
                                onClick={() => handleDelete(milestone.id)}
                                aria-label="Delete milestone"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="health-card-empty">No milestones recorded yet</p>
            )}

            {/* Inline Quick Entry */}
            {isAdding ? (
                <form onSubmit={handleSubmit} className="milestone-quick-entry">
                    <input
                        type="text"
                        placeholder="What milestone? (e.g., First steps)"
                        value={formData.milestone}
                        onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
                        className="milestone-input"
                        autoFocus
                    />
                    <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="milestone-date-input"
                    />
                    <div className="milestone-actions">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? '...' : 'Add'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsAdding(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    className="health-add-btn"
                    onClick={() => setIsAdding(true)}
                >
                    <Plus size={16} />
                    Add Milestone
                </button>
            )}
        </div>
    );
}
