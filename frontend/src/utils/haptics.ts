import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const hapticImpact = async (style = ImpactStyle.Light) => {
  if (Capacitor.isNativePlatform()) await Haptics.impact({ style });
};

export const hapticNotification = async (type = NotificationType.Success) => {
  if (Capacitor.isNativePlatform()) await Haptics.notification({ type });
};

export const hapticSelection = async () => {
  if (Capacitor.isNativePlatform()) await Haptics.selectionStart();
};
