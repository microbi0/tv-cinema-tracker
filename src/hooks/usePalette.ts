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

const FIXED_PALETTE = { hex: '#D6D6B1', rgb: '214, 214, 177', contrast: '#000000' };

/**
 * Hook to extract the dominant color from an image.
 * Now hardcoded to a fixed accent color: #40BFC7
 */
export function usePalette(imageUrl: string | null, skip: boolean = false) {
    return FIXED_PALETTE;
}
