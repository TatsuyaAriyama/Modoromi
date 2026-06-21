import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => Capacitor.isNativePlatform();

/** True only on Android (where background-service battery rules apply). */
export const isAndroid = (): boolean => Capacitor.getPlatform() === 'android';
