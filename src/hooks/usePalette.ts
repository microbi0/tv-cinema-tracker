'use client';

import { useState, useEffect, useRef } from 'react';

const PALETTE_CACHE_KEY = 'cinetracker_palette_cache';

// In-memory cache for ultra-fast access
let memoryCache: Record<string, { hex: string; rgb: string; contrast: string }> | null = null;

function getCache() {
    if (memoryCache) return memoryCache;
    if (typeof window === 'undefined') return {};
    try {
        const cached = localStorage.getItem(PALETTE_CACHE_KEY);
        memoryCache = cached ? JSON.parse(cached) : {};
        return memoryCache || {};
    } catch (e) {
        return {};
    }
}

function setCache(url: string, palette: { hex: string; rgb: string; contrast: string }) {
    const cache = getCache();
    cache[url] = palette;
    // Debounce localStorage write or just keep it in memory mostly
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(PALETTE_CACHE_KEY, JSON.stringify(cache));
        } catch (e) { }
    }
}

const DEFAULT_PALETTE = { hex: '#1e1e1e', rgb: '30, 30, 30', contrast: '#ffffff' };

/**
 * Hook to extract the dominant color from an image.
 * Heavily optimized for mobile performance.
 */
export function usePalette(imageUrl: string | null, skip: boolean = false) {
    const [palette, setPalette] = useState(() => {
        if (!imageUrl) return DEFAULT_PALETTE;
        const cache = getCache();
        return cache[imageUrl] || DEFAULT_PALETTE;
    });

    const lastUrl = useRef<string | null>(null);

    useEffect(() => {
        if (skip || !imageUrl || imageUrl === lastUrl.current) return;

        const cache = getCache();
        if (cache[imageUrl]) {
            if (cache[imageUrl].hex !== palette.hex) {
                setPalette(cache[imageUrl]);
            }
            lastUrl.current = imageUrl;
            return;
        }

        lastUrl.current = imageUrl;

        const runExtraction = () => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            // Use TMDB small image for extraction to save bandwidth and CPU
            img.src = imageUrl;

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true } as any) as CanvasRenderingContext2D | null;
                    if (!ctx) return;

                    canvas.width = 10;
                    canvas.height = 10;
                    ctx.drawImage(img, 0, 0, 10, 10);

                    const imageData = ctx.getImageData(0, 0, 10, 10).data;
                    let rTotal = 0, gTotal = 0, bTotal = 0;

                    for (let i = 0; i < imageData.length; i += 4) {
                        rTotal += imageData[i];
                        gTotal += imageData[i + 1];
                        bTotal += imageData[i + 2];
                    }

                    const count = 100;
                    let dr = Math.round(rTotal / count);
                    let dg = Math.round(gTotal / count);
                    let db = Math.round(bTotal / count);

                    // Boost saturation for better aesthetics
                    const maxVal = Math.max(dr, dg, db);
                    if (maxVal < 120 && maxVal > 0) {
                        const factor = 130 / maxVal;
                        dr = Math.min(255, Math.round(dr * factor));
                        dg = Math.min(255, Math.round(dg * factor));
                        db = Math.min(255, Math.round(db * factor));
                    }

                    const finalLum = (0.299 * dr + 0.587 * dg + 0.114 * db) / 255;
                    const contrast = finalLum > 0.6 ? '#000000' : '#ffffff';

                    const newPalette = {
                        hex: `rgb(${dr}, ${dg}, ${db})`,
                        rgb: `${dr}, ${dg}, ${db}`,
                        contrast
                    };

                    setPalette(newPalette);
                    setCache(imageUrl, newPalette);
                } catch (e) { }
            };
        };

        // Delay extraction longer to not fight with scrolling
        const timer = setTimeout(() => {
            if (globalThis.requestIdleCallback) {
                globalThis.requestIdleCallback(runExtraction, { timeout: 2000 });
            } else {
                setTimeout(runExtraction, 500);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [imageUrl, skip]);

    return palette;
}
