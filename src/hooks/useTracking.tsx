'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tmdb } from '@/lib/tmdb';

export type WatchlistItem = {
    id: number;
    type: 'movie' | 'tv';
};

// Helper to safely set localStorage without crashing the app on quota exceeded
const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // QuotaExceededError or other storage errors
        console.warn(`Failed to save to localStorage for key "${key}". Storage full?`, e);
        // We could optionally try to clear the TMDB cache here to free space, but that's a side effect.
        // For now, simpler is safer: just don't crash.
        // Check if we can free up space from the cache
        try {
            const cacheKey = 'cinetracker_api_library';
            if (localStorage.getItem(cacheKey)) {
                // Nuclear option: clear cache to save user data
                console.warn("Attempting to clear TMDB cache to make space for user data...");
                localStorage.removeItem(cacheKey);
                try {
                    localStorage.setItem(key, value);
                    console.log("Successfully saved after clearing cache.");
                } catch (retryError) {
                    console.error("Still failed to save after cache clear.", retryError);
                }
            }
        } catch (cleanupError) {
            console.error("Failed to cleanup storage.", cleanupError);
        }
    }
};

interface TrackingContextType {
    watched: Record<string, boolean>;
    watchlist: WatchlistItem[];
    favorites: WatchlistItem[];
    dropped: Record<string, boolean>;
    lastWatched: Record<string, number>;
    seriesStatuses: Record<number, string>;
    episodeDetails: Record<number, { name: string, airDate: string, s: number, e: number }>;
    trackingLoading: boolean;
    toggleEpisode: (seriesId: number, season: number, episode: number, seasons?: any[]) => void;
    isEpisodeWatched: (seriesId: number, season: number, episode: number) => boolean;
    toggleSeriesWatched: (seriesId: number, seasons: { season_number: number, episode_count: number }[]) => void;
    toggleMovie: (movieId: number) => void;
    isMovieWatched: (movieId: number) => boolean;
    toggleWatchlist: (id: number, type: 'movie' | 'tv') => void;
    isInWatchlist: (id: number, type: 'movie' | 'tv') => boolean;
    toggleFavorite: (id: number, type: 'movie' | 'tv') => void;
    isFavorite: (id: number, type: 'movie' | 'tv') => boolean;
    toggleDropped: (seriesId: number) => void;
    isDropped: (seriesId: number) => boolean;
    getSeriesStatus: (id: number) => string;
    getTrackedSeriesIds: () => number[];
    getTrackedMovieIds: () => number[];
    getWatchlistByType: (type: 'movie' | 'tv') => number[];
    getLastWatchedTime: (id: number | string) => number | null;
    getNextEpisode: (seriesId: number, seasons: any[]) => { season: number, episode: number } | null;
    setEpisodeDetails: (details: Record<number, any> | ((prev: Record<number, any>) => Record<number, any>)) => void;
    exportData: () => boolean;
    importData: (jsonData: any) => boolean;
    importFromExternal: (data: { movies?: number[], series?: (number | { id: number, season: number, episode: number })[] }) => Promise<boolean>;
    importFromCSV: (csvContent: string, onProgress?: (percent: number) => void) => Promise<boolean>;
    importFromTraktZip: (zipFile: File, onProgress?: (percent: number) => void) => Promise<boolean>;
    clearAllData: () => boolean;
    getAnalystSummary: () => { vistas: any[], watchlistAtiva: any[], paraComecar: any[] };
    setCountry: (countryCode: string) => void;
    updateSeriesStatus: (id: number, status: string) => void;
    notificationSettings: { movies: boolean, series: boolean, trailers: boolean };
    updateNotificationSettings: (settings: { movies?: boolean, series?: boolean, trailers?: boolean }) => void;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

const BAN_STATUSES = ['stopped', 'stoped', 'dropped', 'abandoned', 'ended', 'canceled', 'cancelled', 'descontinuada', 'parada'];

export function TrackingProvider({ children }: { children: ReactNode }) {
    const [watched, setWatched] = useState<Record<string, boolean>>({});
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [favorites, setFavorites] = useState<WatchlistItem[]>([]);
    const [dropped, setDropped] = useState<Record<string, boolean>>({});
    const [lastWatched, setLastWatched] = useState<Record<string, number>>({});
    const [seriesStatuses, setSeriesStatuses] = useState<Record<number, string>>({});
    const [episodeDetails, setEpisodeDetailsState] = useState<Record<number, { name: string, airDate: string, s: number, e: number }>>({});
    const [notificationSettings, setNotificationSettings] = useState({ movies: true, series: true, trailers: true });
    const [knownTrailers, setKnownTrailers] = useState<Record<number, string[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const items: Record<string, (val: any) => void> = {
                'cinetracker_watched': setWatched,
                'cinetracker_watchlist': setWatchlist,
                'cinetracker_last_watched': setLastWatched,
                'cinetracker_favorites': setFavorites,
                'cinetracker_dropped': setDropped,
                'cinetracker_series_statuses': setSeriesStatuses,
                'cinetracker_episode_details': setEpisodeDetailsState,
                'cinetracker_known_trailers': setKnownTrailers
            };
            Object.entries(items).forEach(([key, setter]) => {
                const val = localStorage.getItem(key);
                if (val) {
                    const parsed = JSON.parse(val);
                    if (key === 'cinetracker_watchlist' || key === 'cinetracker_favorites') {
                        setter(Array.isArray(parsed) ? parsed : []);
                    } else {
                        setter(parsed);
                    }
                }
            });

            // Load specifically Notification Settings
            const ns = localStorage.getItem('cinetracker_notification_settings');
            if (ns) setNotificationSettings(JSON.parse(ns));
        } catch (e) { }
        setLoading(false);
    }, []);

    // Watchlist auto-filtering removed to prevent data loss and allow resumption of stopped series.
    // Filtering for display is now handled only at the UI level (SeriesPage).

    const toggleEpisode = (seriesId: number, season: number, episode: number, seasons?: any[]) => {
        const key = `tv_${seriesId}_s${season}_e${episode}`;
        const nv = !watched[key];
        const nW = { ...watched, [key]: nv };
        if (nv && seasons) {
            seasons.forEach(s => {
                if (s.season_number > 0 && s.season_number <= season) {
                    const max = s.season_number === season ? episode : s.episode_count;
                    for (let i = 1; i <= max; i++) nW[`tv_${seriesId}_s${s.season_number}_e${i}`] = true;
                }
            });
        }
        setWatched(nW);
        safeSetItem('cinetracker_watched', JSON.stringify(nW));
        if (nv) {
            const nL = { ...lastWatched, [seriesId]: Date.now(), [`tv_${seriesId}`]: Date.now() };
            setLastWatched(nL);
            safeSetItem('cinetracker_last_watched', JSON.stringify(nL));
        }
    };

    const isEpisodeWatched = (sid: number, s: number, e: number) => !!watched[`tv_${sid}_s${s}_e${e}`];

    const toggleSeriesWatched = (sid: number, seasons: any[]) => {
        const finished = getNextEpisode(sid, seasons) === null;
        const nW = { ...watched };
        seasons.forEach(s => { for (let i = 1; i <= s.episode_count; i++) nW[`tv_${sid}_s${s.season_number}_e${i}`] = !finished; });
        setWatched(nW);
        safeSetItem('cinetracker_watched', JSON.stringify(nW));
    };

    const toggleMovie = (id: number) => {
        const key = `movie_${id}`;
        const nv = !watched[key];
        const nW = { ...watched, [key]: nv };
        setWatched(nW);
        safeSetItem('cinetracker_watched', JSON.stringify(nW));
        if (nv) {
            const nL = { ...lastWatched, [`movie_${id}`]: Date.now() };
            setLastWatched(nL);
            safeSetItem('cinetracker_last_watched', JSON.stringify(nL));
        }
    };

    const isMovieWatched = (id: number) => !!watched[`movie_${id}`];

    const toggleWatchlist = (id: number, type: 'movie' | 'tv') => {
        const exists = watchlist.some(i => i.id === id && i.type === type);
        const next = exists ? watchlist.filter(i => !(i.id === id && i.type === type)) : [...watchlist, { id, type }];
        setWatchlist(next);
        safeSetItem('cinetracker_watchlist', JSON.stringify(next));

        // If adding a TV series that was previously marked as stopped/dropped, clear that status
        if (!exists && type === 'tv') {
            const currentStatus = (seriesStatuses[id] || '').toLowerCase().trim();
            const STOPPED_ONLY = ['stopped', 'stoped', 'dropped', 'abandoned', 'parada', 'descontinuada', 'abandonada'];
            if (STOPPED_ONLY.includes(currentStatus)) {
                updateSeriesStatus(id, 'continuing');
            }
        }
    };

    const isInWatchlist = (id: number, type: 'movie' | 'tv') => watchlist.some(i => i.id === id && i.type === type);

    const toggleFavorite = (id: number, type: 'movie' | 'tv') => {
        const favs = Array.isArray(favorites) ? favorites : [];
        const exists = favs.some(i => i.id === id && i.type === type);
        const next = exists
            ? favs.filter(i => !(i.id === id && i.type === type))
            : [...favs, { id, type }];
        setFavorites(next);
        safeSetItem('cinetracker_favorites', JSON.stringify(next));
    };

    const isFavorite = (id: number, type: 'movie' | 'tv') => {
        if (!Array.isArray(favorites)) return false;
        return favorites.some(i => i.id === id && i.type === type);
    };

    const toggleDropped = (id: number) => {
        const isCurrentlyStopped = BAN_STATUSES.includes((seriesStatuses[id] || '').toLowerCase().trim());
        if (isCurrentlyStopped) {
            updateSeriesStatus(id, 'continuing');
        } else {
            updateSeriesStatus(id, 'stopped');
        }
    };

    const isDropped = (id: number) => {
        const status = (seriesStatuses[id] || '').toLowerCase().trim();
        return BAN_STATUSES.includes(status);
    };
    const getSeriesStatus = (id: number) => seriesStatuses[id] || 'continuing';

    const updateSeriesStatus = (id: number, status: string) => {
        const normalizedStatus = status.toLowerCase().trim();
        const next = { ...seriesStatuses, [id]: normalizedStatus };
        setSeriesStatuses(next);
        safeSetItem('cinetracker_series_statuses', JSON.stringify(next));

        // Status update only - removal from watchlist auto-filtering is handled at the UI layer
    };

    const setEpisodeDetails = (details: Record<number, any> | ((prev: Record<number, any>) => Record<number, any>)) => {
        setEpisodeDetailsState(prev => {
            const next = typeof details === 'function' ? details(prev) : { ...prev, ...details };
            safeSetItem('cinetracker_episode_details', JSON.stringify(next));
            return next;
        });
    };

    const getTrackedSeriesIds = React.useCallback(() => {
        const ids = new Set<number>();
        // Add IDs from watched episodes
        Object.keys(watched).forEach(k => { if (k.startsWith('tv_')) ids.add(parseInt(k.split('_')[1])); });
        // Add IDs from series statuses (especially stopped/ended)
        Object.keys(seriesStatuses).forEach(id => ids.add(parseInt(id)));
        return Array.from(ids);
    }, [watched, seriesStatuses]);

    const getTrackedMovieIds = React.useCallback(() => {
        const ids = new Set<number>();
        Object.keys(watched).forEach(k => { if (k.startsWith('movie_') && watched[k]) ids.add(parseInt(k.split('_')[1])); });
        return Array.from(ids);
    }, [watched]);

    const getWatchlistByType = React.useCallback((t: 'movie' | 'tv') => watchlist.filter(i => i.type === t).map(i => i.id), [watchlist]);

    const getLastWatchedTime = (id: number | string) => {
        // Try prefixed first, then raw id
        return lastWatched[id as any] || lastWatched[`movie_${id}`] || lastWatched[`tv_${id}`] || null;
    };

    const getNextEpisode = React.useCallback((sid: number, seasons: any[]) => {
        if (!seasons) return null;
        const sorted = [...seasons].filter(s => s.season_number > 0).sort((a, b) => a.season_number - b.season_number);
        for (const s of sorted) {
            for (let ep = 1; ep <= s.episode_count; ep++) {
                if (!watched[`tv_${sid}_s${s.season_number}_e${ep}`]) return { season: s.season_number, episode: ep };
            }
        }
        return null;
    }, [watched]);

    const clearAllData = () => {
        localStorage.clear();
        setWatched({}); setWatchlist([]); setFavorites([]); setDropped({}); setLastWatched({}); setSeriesStatuses({}); setEpisodeDetailsState({});
        return true;
    };

    const exportData = () => {
        try {
            const rows = [['tmdb_id', 'type', 'season', 'episode', 'status', 'watched_at']];

            // Movies
            Object.keys(watched).forEach(key => {
                if (key.startsWith('movie_') && watched[key]) {
                    const id = key.split('_')[1];
                    const dateVal = lastWatched[`movie_${id}`] || lastWatched[id] || lastWatched[Number(id)];
                    let dateStr = '';
                    try {
                        if (dateVal) dateStr = new Date(dateVal).toISOString();
                    } catch (e) { }
                    rows.push([id, 'movie', '', '', '', dateStr]);
                }
            });

            // Series - Export the last watched episode for each series
            const trackedSeries = getTrackedSeriesIds();
            trackedSeries.forEach(id => {
                let maxS = 0;
                let maxE = 0;
                Object.keys(watched).forEach(key => {
                    if (key.startsWith(`tv_${id}_`)) {
                        const parts = key.split('_');
                        const sNum = parts[2].replace('s', '');
                        const eNum = parts[3].replace('e', '');
                        const s = parseInt(sNum);
                        const e = parseInt(eNum);
                        if (s > maxS || (s === maxS && e > maxE)) {
                            maxS = s;
                            maxE = e;
                        }
                    }
                });

                if (maxS > 0) {
                    const dateVal = lastWatched[`tv_${id}`] || lastWatched[id] || lastWatched[id.toString()];
                    let dateStr = '';
                    try {
                        if (dateVal) dateStr = new Date(dateVal).toISOString();
                    } catch (e) { }

                    const status = seriesStatuses[id] || seriesStatuses[id.toString() as any] || 'continuing';

                    rows.push([
                        id.toString(),
                        'tv',
                        maxS.toString(),
                        maxE.toString(),
                        status,
                        dateStr
                    ]);
                }
            });

            // Format as CSV with BOM and proper quoting
            const BOM = '\uFEFF';
            const csvContent = BOM + rows.map(r =>
                r.map(cell => {
                    const val = (cell || '').toString();
                    return `"${val.replace(/"/g, '""')}"`;
                }).join(',')
            ).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `backup_tv_cinema_${new Date().toISOString().split('T')[0]}.csv`);

            // Append to body to ensure it works in all browsers
            document.body.appendChild(link);
            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 200);

            return true;
        } catch (error) {
            console.error("Export failed:", error);
            return false;
        }
    };

    const importData = (jsonData: any) => {
        try {
            if (jsonData.watched) { setWatched(jsonData.watched); safeSetItem('cinetracker_watched', JSON.stringify(jsonData.watched)); }
            if (jsonData.watchlist) { setWatchlist(jsonData.watchlist); safeSetItem('cinetracker_watchlist', JSON.stringify(jsonData.watchlist)); }
            return true;
        } catch (e) { return false; }
    };

    const importFromCSV = async (csvContent: string, onProgress?: (p: number) => void) => {
        try {
            const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) return false;

            const nW = { ...watched }, nLw = { ...lastWatched }, nSs = { ...seriesStatuses };
            const headers = lines[0].trim().toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const get = (n: string) => {
                const index = headers.indexOf(n);
                if (index !== -1) return index;
                // Common aliases
                if (n === 'tmdb_id') return headers.indexOf('id') !== -1 ? headers.indexOf('id') : headers.indexOf('tmdb');
                if (n === 'status') return headers.indexOf('series_status') !== -1 ? headers.indexOf('series_status') : -1;
                return -1;
            };

            const iT = get('tmdb_id');
            const iTitle = get('title');
            const iType = get('type');
            const iS = get('season');
            const iE = get('episode');
            const iSt = get('status');
            const iAt = get('watched_at') !== -1 ? get('watched_at') : headers.indexOf('watched at');
            const iImdb = headers.indexOf('imdb_id') !== -1 ? headers.indexOf('imdb_id') : headers.indexOf('imdb');
            const iTvdb = headers.indexOf('tvdb_id') !== -1 ? headers.indexOf('tvdb_id') : headers.indexOf('tvdb');
            const iWl = headers.indexOf('is_watchlisted') !== -1 ? headers.indexOf('is_watchlisted') : headers.indexOf('watchlisted');
            const iW = headers.indexOf('is_watched') !== -1 ? headers.indexOf('is_watched') : headers.indexOf('watched');

            // Store resolved ID AND resolved Type
            const resMap: Record<string, { id: number, type: 'movie' | 'tv' }> = {};
            const itemToResolve: { title: string, type: 'movie' | 'tv' | 'multi', imdb?: string, tvdb?: string, key: string }[] = [];

            // Map unique title+type combinations to avoid redundant searches
            const seenKeys = new Set<string>();

            const parseLine = (line: string) => {
                // Better CSV parser to handle quotes
                const parts: string[] = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                        else inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        parts.push(current.trim().replace(/^"|"$/g, ''));
                        current = '';
                    } else current += char;
                }
                parts.push(current.trim().replace(/^"|"$/g, ''));
                return parts;
            };

            for (let i = 1; i < lines.length; i++) {
                const c = parseLine(lines[i]);
                if (iT > -1 && c[iT] && c[iT] !== '-1') continue; // already has TMDB ID

                const title = iTitle > -1 ? c[iTitle] : null;
                if (!title && !(iImdb > -1 && c[iImdb])) continue;

                let rawType = iType > -1 ? c[iType]?.toLowerCase() : 'multi';
                if (!rawType) rawType = 'multi';
                if (rawType.includes('show') || rawType.includes('series') || rawType.includes('episode')) rawType = 'tv';
                else if (rawType.includes('movie') || rawType.includes('film')) rawType = 'movie';
                else rawType = 'multi';

                const type: 'movie' | 'tv' | 'multi' = rawType as any;
                const imdb = iImdb > -1 ? c[iImdb] : undefined;
                const tvdb = iTvdb > -1 ? c[iTvdb] : undefined;

                const searchKey = `${title}|${type}|${imdb}`;
                if (!seenKeys.has(searchKey)) {
                    itemToResolve.push({ title: title || '', type, imdb, tvdb, key: searchKey });
                    seenKeys.add(searchKey);
                }
            }

            // Phase 1: Resolve IDs (30% of progress)
            for (let i = 0; i < itemToResolve.length; i += 5) {
                const batch = itemToResolve.slice(i, i + 5);
                await Promise.all(batch.map(async item => {
                    try {
                        // 1. Try IMDB
                        if (item.imdb) {
                            const r = await tmdb.find(item.imdb, 'imdb_id');
                            const found = r.movie_results?.[0] || r.tv_results?.[0];
                            if (found) {
                                const resType = r.movie_results?.[0] ? 'movie' : 'tv';
                                resMap[item.key] = { id: found.id, type: resType };
                                return;
                            }
                        }
                        // 2. Try TVDB if movie-like ID or known TVDB
                        if (item.tvdb && item.type === 'tv') {
                            const r = await tmdb.find(item.tvdb, 'tvdb_id');
                            if (r.tv_results?.[0]) {
                                resMap[item.key] = { id: r.tv_results[0].id, type: 'tv' };
                                return;
                            }
                        }
                        // 3. Fallback to Search
                        if (item.title) {
                            const cleanTitle = item.title.replace(/\s*\(\d{4}\)$/, '').trim();
                            const r = await tmdb.search(cleanTitle, item.type);
                            if (r.results?.[0]) {
                                const found = r.results[0];
                                const resolvedType = (found.media_type === 'movie' || item.type === 'movie') ? 'movie' : 'tv';
                                resMap[item.key] = { id: found.id, type: resolvedType };
                            }
                        }
                    } catch (e) { }
                }));
                if (onProgress) onProgress(Math.floor((i / itemToResolve.length) * 30));
            }

            // Phase 2: Process all lines
            const seriesData: Record<number, { maxS: number, maxE: number, st: Set<string>, at: string, wl: boolean }> = {};
            const moviesToImport: { id: number, watched: boolean, watchlisted: boolean, date?: string }[] = [];

            for (let i = 1; i < lines.length; i++) {
                const c = parseLine(lines[i]);
                let rawType = iType > -1 ? c[iType]?.toLowerCase() : 'multi';
                if (!rawType) rawType = 'multi';
                if (rawType.includes('show') || rawType.includes('series') || rawType.includes('episode')) rawType = 'tv';
                else if (rawType.includes('movie') || rawType.includes('film')) rawType = 'movie';
                else rawType = 'multi';
                const searchType = rawType as 'movie' | 'tv' | 'multi';

                const title = iTitle > -1 ? c[iTitle] : '';
                const imdb = iImdb > -1 ? c[iImdb] : '';
                const searchKey = `${title}|${searchType}|${imdb}`;

                let id: number | null = null;
                let finalType: 'movie' | 'tv' = (searchType === 'movie') ? 'movie' : 'tv';

                // 1. Try explicit ID
                if (iT > -1 && c[iT] && c[iT] !== '-1') {
                    id = parseInt(c[iT]);
                    if (searchType === 'movie') finalType = 'movie';
                    else if (searchType === 'tv') finalType = 'tv';
                    else {
                        const hasSeason = iS > -1 && c[iS] && c[iS] !== '0';
                        finalType = hasSeason ? 'tv' : 'movie';
                    }
                } else {
                    // 2. Try resolved map
                    const found = resMap[searchKey];
                    if (found) {
                        id = found.id;
                        finalType = found.type;
                    }
                }

                if (!id) continue;

                const isWlFlag = iWl > -1 && (c[iWl]?.toLowerCase() === 'true' || c[iWl] === '1');
                const isWatchedFlag = iW > -1 && (c[iW]?.toLowerCase() === 'true' || c[iW] === '1');

                if (finalType === 'movie') {
                    const status = iSt > -1 ? c[iSt].toLowerCase() : '';
                    const hasDate = iAt > -1 && c[iAt];
                    const isWatched = isWatchedFlag || !!hasDate || ['visto', 'watched', 'completed', 'vido'].includes(status);
                    moviesToImport.push({ id, watched: isWatched, watchlisted: isWlFlag, date: hasDate ? c[iAt] : undefined });
                } else {
                    if (!seriesData[id]) seriesData[id] = { maxS: 0, maxE: 0, st: new Set(), at: '', wl: false };
                    const s = iS > -1 ? parseInt(c[iS]) || 0 : 0;
                    const e = iE > -1 ? parseInt(c[iE]) || 0 : 0;
                    if (s > seriesData[id].maxS || (s === seriesData[id].maxS && e > seriesData[id].maxE)) {
                        seriesData[id].maxS = s; seriesData[id].maxE = e;
                    }
                    if (iSt > -1 && c[iSt]) seriesData[id].st.add(c[iSt].toLowerCase().trim());
                    if (iAt > -1 && c[iAt]) seriesData[id].at = c[iAt];
                    if (isWlFlag) seriesData[id].wl = true;
                }
            }

            // Phase 3: Finalize state (70% of progress)
            const sIds = Object.keys(seriesData).map(Number);
            const finalWl = [...watchlist];

            // Helper to add unique items to watchlist
            const addToWl = (id: number, type: 'movie' | 'tv') => {
                if (!finalWl.some(item => item.id === id && item.type === type)) {
                    finalWl.push({ id, type });
                }
            };

            // Add movies
            moviesToImport.forEach(m => {
                if (m.watched) {
                    nW[`movie_${m.id}`] = true;
                    if (m.date) nLw[`movie_${m.id}`] = new Date(m.date).getTime();
                    // Remove from watchlist if watched
                    const idx = finalWl.findIndex(item => item.id === m.id && item.type === 'movie');
                    if (idx !== -1) finalWl.splice(idx, 1);
                } else if (m.watchlisted) {
                    addToWl(m.id, 'movie');
                }
            });

            // Process Series
            for (let i = 0; i < sIds.length; i++) {
                const id = sIds[i]; const d = seriesData[id];
                const isStopped = BAN_STATUSES.some(b => d.st.has(b));

                if (isStopped) {
                    nSs[id] = 'stopped';
                } else {
                    nSs[id] = d.st.has('continuing') ? 'continuing' : (Array.from(d.st)[0] || 'continuing');
                }

                if (d.maxS > 0) {
                    try {
                        const dt = await tmdb.getDetails(id, 'tv');
                        (dt.seasons || []).forEach((s: any) => {
                            if (s.season_number > 0 && s.season_number <= d.maxS) {
                                const limit = s.season_number === d.maxS ? d.maxE : s.episode_count;
                                for (let ep = 1; ep <= limit; ep++) nW[`tv_${id}_s${s.season_number}_e${ep}`] = true;
                            }
                        });

                        let finished = true;
                        for (const s of (dt.seasons || [])) {
                            if (s.season_number === 0) continue;
                            for (let ep = 1; ep <= s.episode_count; ep++) {
                                if (!nW[`tv_${id}_s${s.season_number}_e${ep}`]) { finished = false; break; }
                            }
                            if (!finished) break;
                        }

                        if (!finished && !isStopped) {
                            addToWl(id, 'tv');
                        }
                    } catch { }
                    if (d.at) nLw[id] = new Date(d.at).getTime();
                } else if (!isStopped && d.wl) {
                    addToWl(id, 'tv');
                }
                if (onProgress) onProgress(30 + Math.floor((i / sIds.length) * 70));
            }

            setWatched(nW); setLastWatched(nLw); setSeriesStatuses(nSs); setWatchlist(finalWl);
            safeSetItem('cinetracker_watched', JSON.stringify(nW));
            safeSetItem('cinetracker_last_watched', JSON.stringify(nLw));
            safeSetItem('cinetracker_series_statuses', JSON.stringify(nSs));
            safeSetItem('cinetracker_watchlist', JSON.stringify(finalWl));
            return true;
        } catch (e) {
            console.error("CSV Import Error:", e);
            return false;
        }
    };

    const importFromTraktZip = async (zipFile: File, onProgress?: (percent: number) => void): Promise<boolean> => {
        try {
            console.log("Starting ZIP import...");
            if (onProgress) onProgress(5);

            const JSZipModule = await import('jszip');
            const JSZip = JSZipModule.default || JSZipModule;
            const zip = new JSZip();
            await zip.loadAsync(zipFile);

            console.log("ZIP Loaded. Files:", Object.keys(zip.files));
            if (onProgress) onProgress(10);

            const nW = { ...watched };
            const nLw = { ...lastWatched };
            const nSs = { ...seriesStatuses };
            let hasChanges = false;
            let anyFileProcessed = false;

            // Strategy: Process different file types independently

            // 1. --- CSV IMPORT LOGIC (Movies & Episodes) ---
            const movieCsvFiles = zip.file(/movies\.csv$/i).sort((a, b) => b.name.length - a.name.length);
            const episodeCsvFiles = zip.file(/episodes\.csv$/i).sort((a, b) => b.name.length - a.name.length);

            // Helper to parse CSV line respecting quotes
            const parseCSVLine = (line: string) => {
                const values: string[] = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                        else { inQuotes = !inQuotes; }
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    } else { current += char; }
                }
                values.push(current.trim());
                return values;
            };

            if (movieCsvFiles.length > 0) {
                anyFileProcessed = true;
                const text = await movieCsvFiles[0].async('text');
                const lines = text.split(/\r?\n/);
                if (lines.length > 1) {
                    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    const iTmdb = headers.indexOf('tmdb_id') !== -1 ? headers.indexOf('tmdb_id') : headers.indexOf('tmdb id');
                    const iDate = headers.indexOf('last_watched_at') !== -1 ? headers.indexOf('last_watched_at') : headers.indexOf('last watched at');
                    if (iTmdb !== -1) {
                        for (let i = 1; i < lines.length; i++) {
                            const cols = parseCSVLine(lines[i]);
                            if (!cols[iTmdb]) continue;
                            const id = parseInt(cols[iTmdb]);
                            if (id) {
                                nW[`movie_${id}`] = true;
                                if (iDate !== -1 && cols[iDate]) nLw[`movie_${id}`] = new Date(cols[iDate]).getTime();
                                hasChanges = true;
                            }
                        }
                    }
                }
            }

            if (episodeCsvFiles.length > 0) {
                anyFileProcessed = true;
                const text = await episodeCsvFiles[0].async('text');
                const lines = text.split(/\r?\n/);
                if (lines.length > 1) {
                    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    const iShowTmdb = headers.indexOf('show_tmdb_id') !== -1 ? headers.indexOf('show_tmdb_id') : headers.indexOf('show tmdb id');
                    const iSeason = headers.indexOf('season_number') !== -1 ? headers.indexOf('season_number') : headers.indexOf('season number');
                    const iEpisode = headers.indexOf('episode_number') !== -1 ? headers.indexOf('episode_number') : headers.indexOf('episode number');
                    const iDate = headers.indexOf('last_watched_at') !== -1 ? headers.indexOf('last_watched_at') : headers.indexOf('last watched at');
                    if (iShowTmdb !== -1 && iSeason !== -1 && iEpisode !== -1) {
                        for (let i = 1; i < lines.length; i++) {
                            const cols = parseCSVLine(lines[i]);
                            const showId = parseInt(cols[iShowTmdb]);
                            const s = parseInt(cols[iSeason]);
                            const e = parseInt(cols[iEpisode]);
                            if (showId && !isNaN(s) && !isNaN(e)) {
                                nW[`tv_${showId}_s${s}_e${e}`] = true;
                                if (iDate !== -1 && cols[iDate]) {
                                    const t = new Date(cols[iDate]).getTime();
                                    if (!nLw[`tv_${showId}`] || t > nLw[`tv_${showId}`]) nLw[`tv_${showId}`] = t;
                                }
                                hasChanges = true;
                            }
                        }
                    }
                }
            }

            // 2. --- JSON HISTORY IMPORT ---
            const historyJsonFiles = zip.file(/watched\/history-.*\.json$/i);
            if (historyJsonFiles.length > 0) {
                anyFileProcessed = true;
                for (const file of historyJsonFiles) {
                    try {
                        const items = JSON.parse(await file.async('text'));
                        if (Array.isArray(items)) {
                            for (const item of items) {
                                if (!item.watched_at) continue;
                                const time = new Date(item.watched_at).getTime();
                                if (item.type === 'movie' && item.movie?.ids?.tmdb) {
                                    const id = item.movie.ids.tmdb;
                                    nW[`movie_${id}`] = true;
                                    nLw[`movie_${id}`] = time;
                                    hasChanges = true;
                                } else if (item.type === 'episode' && item.episode && item.show?.ids?.tmdb) {
                                    const showId = item.show.ids.tmdb;
                                    nW[`tv_${showId}_s${item.episode.season}_e${item.episode.number}`] = true;
                                    if (!nLw[`tv_${showId}`] || time > nLw[`tv_${showId}`]) nLw[`tv_${showId}`] = time;
                                    hasChanges = true;
                                }
                            }
                        }
                    } catch (e) { }
                }
            }

            if (onProgress) onProgress(60);

            // 3. --- WATCHLIST IMPORT LOGIC (JSON) ---
            const watchlistFile = zip.file(/lists\/watchlist\.json$/i);
            if (watchlistFile.length > 0) {
                anyFileProcessed = true;
                try {
                    const items = JSON.parse(await watchlistFile[0].async('text'));
                    if (Array.isArray(items)) {
                        const currentWl = [...watchlist];
                        const existingIds = new Set(currentWl.map(i => `${i.id}_${i.type}`));
                        const newWl: WatchlistItem[] = [];
                        for (const item of items) {
                            let id: number | null = null;
                            let type: 'movie' | 'tv' | null = null;
                            if (item.type === 'movie' && item.movie?.ids?.tmdb) { id = item.movie.ids.tmdb; type = 'movie'; }
                            else if ((item.type === 'show' || item.type === 'season' || item.type === 'episode') && item.show?.ids?.tmdb) { id = item.show.ids.tmdb; type = 'tv'; }
                            if (id && type && !existingIds.has(`${id}_${type}`)) {
                                newWl.push({ id, type });
                                existingIds.add(`${id}_${type}`);
                                hasChanges = true;
                            }
                        }
                        if (newWl.length > 0) {
                            const finalWl = [...currentWl, ...newWl];
                            setWatchlist(finalWl);
                            safeSetItem('cinetracker_watchlist', JSON.stringify(finalWl));
                        }
                    }
                } catch (e) { }
            }

            // 4. --- HIDDEN ITEMS IMPORT LOGIC (Status = stopped) ---
            // Trakt puts these in hidden/hidden-progress-watched.json or sometimes shows.json in certain exports
            const hiddenFiles = [
                ...zip.file(/hidden\/hidden-progress-watched\.json$/i),
                ...zip.file(/hidden\/hidden-progress-collected\.json$/i),
                ...zip.file(/shows\.json$/i)
            ];

            if (hiddenFiles.length > 0) {
                console.log(`Found ${hiddenFiles.length} potential hidden items files.`);
                anyFileProcessed = true;
                for (const hFile of hiddenFiles) {
                    try {
                        const items = JSON.parse(await hFile.async('text'));
                        if (Array.isArray(items)) {
                            for (const item of items) {
                                if (item.type === 'show' || item.show) {
                                    let id = item.show?.ids?.tmdb;
                                    if (!id && item.show?.title) {
                                        try {
                                            const res = await tmdb.search(item.show.title, 'tv');
                                            if (res.results?.[0]) id = res.results[0].id;
                                            await new Promise(r => setTimeout(r, 100));
                                        } catch (err) { }
                                    }
                                    if (id) {
                                        nSs[id] = 'stopped';
                                        hasChanges = true;
                                    }
                                }
                            }
                        }
                    } catch (e) { }
                }
            }

            if (!anyFileProcessed) throw new Error("MissingCSV");

            // 5. --- AUTO-STOP LOGIC (Older than 1 year) ---
            const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            Object.keys(nLw).forEach(key => {
                if (key.startsWith('tv_')) {
                    if (now - nLw[key] > ONE_YEAR_MS) {
                        const id = parseInt(key.replace('tv_', ''));
                        if (!isNaN(id) && nSs[id] !== 'stopped') {
                            nSs[id] = 'stopped';
                            hasChanges = true;
                        }
                    }
                }
            });

            if (hasChanges) {
                setWatched(nW);
                setLastWatched(nLw);
                setSeriesStatuses(nSs);
                safeSetItem('cinetracker_watched', JSON.stringify(nW));
                safeSetItem('cinetracker_last_watched', JSON.stringify(nLw));
                safeSetItem('cinetracker_series_statuses', JSON.stringify(nSs));
                if (onProgress) onProgress(100);
                return true;
            }
            if (onProgress) onProgress(100);
            return false;
        } catch (e: any) {
            console.error("ZIP Import Error:", e);
            if (e.message === 'MissingCSV') throw e;
            return false;
        }
    };

    const getAnalystSummary = () => {
        const vistas: any[] = [];
        const watchlistAtiva: any[] = [];
        const paraComecar: any[] = [];

        // Rules:
        // 1. Vistas: Movies + Series with status stopped
        const movieIds = getTrackedMovieIds();
        movieIds.forEach(id => vistas.push({ id, type: 'movie' }));

        const seriesIds = getTrackedSeriesIds();
        seriesIds.forEach(id => {
            const status = (seriesStatuses[id] || '').toLowerCase().trim();
            const nextEp = getNextEpisode(id, []); // Need seasons for real check, but we follow rules
            const isStopped = BAN_STATUSES.includes(status);

            if (isStopped) {
                vistas.push({ id, type: 'tv', status: 'stopped' });
            } else {
                // Determine if started or not
                // This is a simplified check for the JSON output requirement
                const firstEpWatched = watched[`tv_${id}_s1_e1`];
                if (firstEpWatched) {
                    watchlistAtiva.push({
                        id,
                        type: 'tv',
                        last_watched: lastWatched[id] ? new Date(lastWatched[id]).toISOString() : null
                    });
                } else if (watchlist.some(i => i.id === id)) {
                    paraComecar.push({ id, type: 'tv' });
                }
            }
        });

        return { vistas, watchlistAtiva, paraComecar };
    };

    const setCountry = (countryCode: string) => {
        const mapping: Record<string, { language: string, region: string }> = {
            'PT': { language: 'pt-PT', region: 'PT' },
            'BR': { language: 'pt-BR', region: 'BR' },
            'ES': { language: 'es-ES', region: 'ES' },
            'FR': { language: 'fr-FR', region: 'FR' },
            'GB': { language: 'en-GB', region: 'GB' },
            'US': { language: 'en-US', region: 'US' }
        };
        const config = mapping[countryCode] || mapping['PT'];
        safeSetItem('cinetracker_settings', JSON.stringify(config));

        // Clear API cache to force refresh with new language
        import('../lib/tmdb').then(mod => mod.tmdb.clearCache());

        // Force reload to apply changes globally
        window.location.reload();
    };

    const updateNotificationSettings = (settings: { movies?: boolean, series?: boolean, trailers?: boolean }) => {
        setNotificationSettings(prev => {
            const next = { ...prev, ...settings };
            safeSetItem('cinetracker_notification_settings', JSON.stringify(next));
            return next;
        });
    };

    // Trailers Check Logic
    useEffect(() => {
        if (!notificationSettings.trailers || watchlist.length === 0) return;

        const checkNewTrailers = async () => {
            const newTrailersToNotify: { id: number, type: string, title: string, trailerKey: string }[] = [];
            const updatedKnownTrailers = { ...knownTrailers };

            // Only check a few at a time to avoid heavy API load
            const itemsToCheck = watchlist.slice(0, 15);

            for (const item of itemsToCheck) {
                try {
                    const videoData = await tmdb.getVideos(item.id, item.type);
                    const trailers = videoData.results?.filter((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || [];

                    if (trailers.length > 0) {
                        const known = updatedKnownTrailers[item.id] || [];
                        const latestTrailer = trailers[0];

                        if (!known.includes(latestTrailer.key)) {
                            const details = await tmdb.getDetailsCached(item.id, item.type);
                            newTrailersToNotify.push({
                                id: item.id,
                                type: item.type,
                                title: details.title || details.name,
                                trailerKey: latestTrailer.key
                            });
                            updatedKnownTrailers[item.id] = [...known, latestTrailer.key];
                        }
                    }
                } catch (e) { }
            }

            if (newTrailersToNotify.length > 0) {
                setKnownTrailers(updatedKnownTrailers);
                safeSetItem('cinetracker_known_trailers', JSON.stringify(updatedKnownTrailers));

                try {
                    const { LocalNotifications } = await import('@capacitor/local-notifications');
                    const perm = await LocalNotifications.checkPermissions();
                    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();

                    await LocalNotifications.schedule({
                        notifications: newTrailersToNotify.map((t, idx) => ({
                            title: `Novo Trailer: ${t.title}`,
                            body: `Vê agora o novo trailer de ${t.title}!`,
                            id: Math.floor(Date.now() / 1000) + idx,
                            extra: { url: `https://www.youtube.com/watch?v=${t.trailerKey}` },
                            schedule: { at: new Date(Date.now() + 1000) }
                        }))
                    });
                } catch (e) {
                    console.error("LocalNotifications error:", e);
                }
            }
        };

        checkNewTrailers();
        const interval = setInterval(checkNewTrailers, 2 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [notificationSettings.trailers, watchlist, knownTrailers]);

    // Notification listener for clicks
    useEffect(() => {
        const setupListener = async () => {
            try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
                    const url = action.notification.extra?.url;
                    if (url) window.open(url, '_blank');
                });
            } catch (e) { }
        };
        setupListener();
    }, []);

    const contextValue = React.useMemo(() => ({
        watched, watchlist, favorites, dropped, lastWatched, seriesStatuses, episodeDetails, trackingLoading: loading,
        toggleEpisode, isEpisodeWatched, toggleSeriesWatched, toggleMovie, isMovieWatched,
        toggleWatchlist, isInWatchlist, toggleFavorite, isFavorite, toggleDropped, isDropped,
        getSeriesStatus, updateSeriesStatus, getTrackedSeriesIds, getTrackedMovieIds, getWatchlistByType,
        getLastWatchedTime, getNextEpisode, setEpisodeDetails, exportData, importData, importFromExternal: async () => false,
        importFromCSV, importFromTraktZip, clearAllData, getAnalystSummary, setCountry,
        notificationSettings, updateNotificationSettings
    }), [
        watched, watchlist, favorites, dropped, lastWatched, seriesStatuses, episodeDetails, loading,
        toggleEpisode, isEpisodeWatched, toggleSeriesWatched, toggleMovie, isMovieWatched,
        toggleWatchlist, isInWatchlist, toggleFavorite, isFavorite, toggleDropped, isDropped,
        getSeriesStatus, updateSeriesStatus, getTrackedSeriesIds, getTrackedMovieIds, getWatchlistByType,
        getLastWatchedTime, getNextEpisode, setEpisodeDetails, exportData, importData,
        importFromCSV, importFromTraktZip, clearAllData, getAnalystSummary, setCountry,
        notificationSettings, updateNotificationSettings
    ]);

    return <TrackingContext.Provider value={contextValue}>{children}</TrackingContext.Provider>;
}

export function useTracking() {
    const context = useContext(TrackingContext);
    if (!context) throw new Error('useTracking error');
    return context;
}
