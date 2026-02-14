import { useCallback } from 'react';
import { rescheduleAll } from '../utils/notificationScheduler';

export function useNotificationSync(babyId: number | undefined, babyName: string | undefined) {
  const reschedule = useCallback(() => {
    if (babyId && babyName) {
      rescheduleAll(babyId, babyName);
    }
  }, [babyId, babyName]);

  return { reschedule };
}
