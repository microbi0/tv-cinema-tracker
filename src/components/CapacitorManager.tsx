'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function CapacitorManager() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Initialize Status Bar for Android/iOS
        try {
            StatusBar.setStyle({ style: Style.Dark });
            StatusBar.setBackgroundColor({ color: '#000000' });
        } catch (err) {
            // Ignore if status bar is not available
        }

        // Handle Back Button
        const backHandler = App.addListener('backButton', ({ canGoBack }) => {
            const isSearchOpen = searchParams.get('search') === 'true';
            const cleanPath = pathname?.replace(/\/$/, '') || '';
            const isMainPage = cleanPath === '' || cleanPath === '/series' || cleanPath === '/movies';

            if (isSearchOpen) {
                // If search is open, close it using the existing close logic (remove param)
                const params = new URLSearchParams(window.location.search);
                params.delete('search');
                const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
                router.push(newUrl);
            } else if (isMainPage) {
                // If on main pages, do nothing to prevent exiting app
            } else {
                // Otherwise go back
                router.back();
            }
        });

        // Handle Deep Links (Trakt Redirect)
        const urlHandler = App.addListener('appUrlOpen', (data) => {
            try {
                // Expected format: tvcinema://settings?code=...
                // slug or path might vary depending on how capacitor parses it, but `data.url` is the full string
                const url = new URL(data.url);
                if (url.host === 'settings' || url.pathname.includes('settings')) {
                    const code = url.searchParams.get('code');
                    if (code) {
                        // Force navigation to settings with the code
                        router.push(`/settings?code=${code}`);
                    }
                }
            } catch (e) {
                console.error('Error handling deep link:', e);
            }
        });

        // Handle Global Clicks for Haptic Feedback
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // 1. Identify "Special" Menu/Nav Items (Medium Feedback)
            // - Bottom Nav (contained in a <nav> or has .glass-dark)
            // - Top Fixed Header (contained in .fixed.top-0)
            // - Search Overlay (contained in .fixed.inset-0)
            const isBottomNav = target.closest('nav') || target.closest('.glass-dark');
            const isTopMenu = target.closest('.fixed.top-0');
            const isSearchOverlay = target.closest('.fixed.inset-0');

            const isMenu = !!(isBottomNav || isTopMenu || isSearchOverlay);

            try {
                if (isMenu) {
                    // Special feedback for menu items
                    Haptics.impact({ style: ImpactStyle.Medium });
                } else {
                    // Standard feedback for all other clicks
                    Haptics.impact({ style: ImpactStyle.Light });
                }
            } catch (err) {
                // Ignore if haptics fail or not available
            }
        };

        window.addEventListener('click', handleGlobalClick, true);

        return () => {
            backHandler.then(h => h.remove());
            urlHandler.then(h => h.remove());
            window.removeEventListener('click', handleGlobalClick, true);
        };
    }, [pathname, router, searchParams]);

    return null;
}
