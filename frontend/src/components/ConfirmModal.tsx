import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useTranslation('common');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={onCancel}>
              <X size={20} />
            </button>
            <div className="confirm-modal-content">
              {icon || <Trash2 size={32} className="confirm-icon" />}
              <h3>{title || t('deleteConfirmTitle')}</h3>
              <p>{message || t('deleteConfirmMessage')}</p>
              <div className="confirm-modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={onCancel}
                >
                  {cancelLabel || t('cancel')}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={onConfirm}
                >
                  {confirmLabel || t('delete')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
