'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useCallback } from 'react';

export const useHaptic = () => {
    const triggerLight = useCallback(async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Light });
        } catch (e) {
            // Capacitor might not be available
        }
    }, []);

    const triggerMedium = useCallback(async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (e) {
            // Capacitor might not be available
        }
    }, []);

    const triggerHeavy = useCallback(async () => {
        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } catch (e) {
            // Capacitor might not be available
        }
    }, []);

    const triggerSelection = useCallback(async () => {
        try {
            await Haptics.selectionStart();
            await Haptics.selectionChanged();
        } catch (e) {
            // Capacitor might not be available
        }
    }, []);

    return { triggerLight, triggerMedium, triggerHeavy, triggerSelection };
};
