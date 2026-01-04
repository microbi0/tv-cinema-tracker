const TMDB_API_KEY = '26706affa3b5c915903f13349bce0f4c';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyNjcwNmFmZmEzYjVjOTE1OTAzZjEzMzQ5YmNlMGY0YyIsIm5iZiI6MTY3NjQxNzI3MC43MjgsInN1YiI6IjYzZWMxOGY2MWI3Mjk0MDA4NjZkMGUxNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.EIs9L4mG448NycxlkSDieo0p3oNR06nJlmP5KCaKLTc';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Simple concurrency semaphore
const MAX_CONCURRENT_REQUESTS = 15;
let activeRequests = 0;
const requestQueue: (() => void)[] = [];

const processQueue = () => {
    if (activeRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
        const next = requestQueue.shift();
        next?.();
    }
};

const throttledFetch = (url: string, options: any): Promise<Response> => {
    return new Promise((resolve, reject) => {
        const execute = async () => {
            activeRequests++;
            try {
                const res = await fetch(url, options);
                resolve(res);
            } catch (e) {
                reject(e);
            } finally {
                activeRequests--;
                processQueue();
            }
        };
        requestQueue.push(execute);
        processQueue();
    });
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchTMDB(endpoint: string, params: Record<string, string> = {}) {
    const apiKey = TMDB_API_KEY;
    const accessToken = TMDB_ACCESS_TOKEN;

    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', apiKey);

    // Default to en-US for posters/original feel, but we can override
    // Dynamic Settings
    let lang = 'pt-PT';
    let region = 'PT';
    if (typeof window !== 'undefined') {
        try {
            const settings = localStorage.getItem('cinetracker_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                if (parsed.language) lang = parsed.language;
                if (parsed.region) region = parsed.region;
            }
        } catch { }
    }

    // Default to en-US for posters/original feel, but we can override
    const defaultParams = {
        language: lang,
        region: region,
        include_image_language: 'en,null'
    };

    const finalParams = { ...defaultParams, ...params };

    Object.entries(finalParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    let retries = 3;
    while (retries > 0) {
        try {
            const response = await throttledFetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    accept: 'application/json',
                },
            });

            if (response.status === 429) {
                // Rate limited
                const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
                await sleep(retryAfter * 1000 + 500);
                retries--;
                continue;
            }

            if (!response.ok) {
                console.warn(`TMDB API warning [${response.status}]: ${url.toString()}`);
                return { results: [], seasons: [], episodes: [], genres: [], credits: { cast: [] }, videos: { results: [] }, translations: { translations: [] } };
            }

            return await response.json();
        } catch (error) {
            console.error(`TMDB fetch failed (Network error) for ${url.toString()}:`, error);
            if (retries === 1) return { results: [], seasons: [], episodes: [], genres: [], credits: { cast: [] }, videos: { results: [] }, translations: { translations: [] } };
            await sleep(1000); // Wait 1s before network retry
            retries--;
        }
    }
}

const CACHE_KEY = 'cinetracker_api_library';
let memoryCache: any = null;
let saveTimeout: any = null;

function getCache() {
    if (typeof window === 'undefined') return {};
    if (memoryCache) return memoryCache;
    try {
        const c = localStorage.getItem(CACHE_KEY);
        if (!c) {
            memoryCache = {};
            return {};
        }
        memoryCache = JSON.parse(c);
        return memoryCache;
    } catch {
        memoryCache = {};
        return {};
    }
}

function saveToCache(key: string, data: any) {
    if (typeof window === 'undefined') return;
    try {
        const c = getCache();
        c[key] = { data, timestamp: Date.now() };
        memoryCache = { ...c };

        // Debounce saving to localStorage to avoid blocking the UI thread
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
            } catch (e) { console.warn("Cache persistence failed", e); }
        }, 1000); // Wait 1s of inactivity before saving
    } catch (e) { console.warn("Cache save failed", e); }
}

export const tmdb = {
    getTrendingMovies: (page: number = 1) => fetchTMDB('/trending/movie/day', { page: page.toString() }),
    getTrendingSeries: (page: number = 1) => fetchTMDB('/trending/tv/day', { page: page.toString() }),
    getTrendingMoviesCached: async (page: number = 1) => {
        const key = `trending_movie_${page}`;
        const cache = getCache();
        // Trending changes daily, so cache for 12 hours is safe
        if (cache[key] && (Date.now() - cache[key].timestamp < 12 * 60 * 60 * 1000)) {
            return cache[key].data;
        }
        const data = await fetchTMDB('/trending/movie/day', { page: page.toString() });
        if (data && data.results) {
            saveToCache(key, data);
            return data;
        }
        return data;
    },
    getTrendingSeriesCached: async (page: number = 1) => {
        const key = `trending_series_${page}`;
        const cache = getCache();
        if (cache[key] && (Date.now() - cache[key].timestamp < 12 * 60 * 60 * 1000)) {
            return cache[key].data;
        }
        const data = await fetchTMDB('/trending/tv/day', { page: page.toString() });
        if (data && data.results) {
            saveToCache(key, data);
            return data;
        }
        return data;
    },
    search: (query: string, type: 'movie' | 'tv' | 'multi' = 'multi', page: number = 1) =>
        fetchTMDB(`/search/${type}`, { query, page: page.toString() }),
    getDetails: (id: number, type: 'movie' | 'tv') =>
        fetchTMDB(`/${type}/${id}`, {
            append_to_response: 'credits,videos,recommendations,watch/providers,images,translations,release_dates,reviews', include_video_language: 'en,null', include_image_language: 'en,null',
        }),
    // Optimized version with local persistence
    getDetailsCached: async (id: number, type: 'movie' | 'tv') => {
        // Read language from settings to include in cache key
        let lang = 'pt-PT';
        try {
            const s = localStorage.getItem('cinetracker_settings');
            if (s) lang = JSON.parse(s).language || 'pt-PT';
        } catch { }

        const key = `${type}_${id}_${lang}_v4`;
        const cache = getCache();
        // Cache valid for 3 days
        if (cache[key] && (Date.now() - cache[key].timestamp < 3 * 24 * 60 * 60 * 1000)) {
            return cache[key].data;
        }
        const data = await fetchTMDB(`/${type}/${id}`, {
            append_to_response: 'credits,videos,recommendations,watch/providers,images,translations,release_dates,reviews,external_ids', include_video_language: 'en,null', include_image_language: 'en,null',
        });

        // If no reviews in the requested language, try to fetch them in English
        if (data && (!data.reviews || data.reviews.results.length === 0)) {
            try {
                const enReviews = await fetchTMDB(`/${type}/${id}/reviews`, { language: 'en-US' });
                if (enReviews && enReviews.results?.length > 0) {
                    data.reviews = enReviews;
                }
            } catch (e) {
                console.warn("Failed to fetch English reviews", e);
            }
        }

        if (data && data.id) {
            saveToCache(key, data);
            return data;
        }
        return null; // Return null if invalid data
    },
    getSeasonDetails: (seriesId: number, seasonNumber: number) =>
        fetchTMDB(`/tv/${seriesId}/season/${seasonNumber}`),
    // Optimized version for seasons
    getSeasonCached: async (seriesId: number, seasonNumber: number) => {
        // Read language from settings to include in cache key
        let lang = 'pt-PT';
        try {
            const s = localStorage.getItem('cinetracker_settings');
            if (s) lang = JSON.parse(s).language || 'pt-PT';
        } catch { }

        const key = `tv_${seriesId}_s${seasonNumber}_${lang}`;
        const cache = getCache();
        if (cache[key] && (Date.now() - cache[key].timestamp < 7 * 24 * 60 * 60 * 1000)) {
            return cache[key].data;
        }
        const data = await fetchTMDB(`/tv/${seriesId}/season/${seasonNumber}`);
        if (data && data.episodes && data.episodes.length > 0) {
            saveToCache(key, data);
            return data;
        }
        return null;
    },
    find: (externalId: string, source: 'imdb_id' | 'tvdb_id') =>
        fetchTMDB(`/find/${externalId}`, { external_source: source }),
    getPersonDetails: (id: number) =>
        fetchTMDB(`/person/${id}`),
    getPersonCombinedCredits: (id: number) =>
        fetchTMDB(`/person/${id}/combined_credits`),
    getPersonDetailsCached: async (id: number) => {
        let lang = 'pt-PT';
        try {
            const s = localStorage.getItem('cinetracker_settings');
            if (s) lang = JSON.parse(s).language || 'pt-PT';
        } catch { }

        const key = `person_${id}_${lang}`;
        const cache = getCache();
        if (cache[key] && (Date.now() - cache[key].timestamp < 7 * 24 * 60 * 60 * 1000)) {
            return cache[key].data;
        }

        const [details, credits] = await Promise.all([
            fetchTMDB(`/person/${id}`),
            fetchTMDB(`/person/${id}/combined_credits`)
        ]);

        const data = { ...details, combined_credits: credits };
        if (data && data.id) {
            saveToCache(key, data);
            return data;
        }
        return null;
    },
    getDetailsSync: (id: number, type: 'movie' | 'tv') => {
        if (typeof window === 'undefined') return null;
        let lang = 'pt-PT';
        try {
            const s = localStorage.getItem('cinetracker_settings');
            if (s) lang = JSON.parse(s).language || 'pt-PT';
        } catch { }

        const key = `${type}_${id}_${lang}_v4`;
        const cache = getCache();
        if (cache[key] && (Date.now() - cache[key].timestamp < 7 * 24 * 60 * 60 * 1000)) {
            return cache[key].data;
        }
        return null;
    },
    clearCache: () => {
        if (typeof window === 'undefined') return;
        try {
            memoryCache = {};
            localStorage.removeItem(CACHE_KEY);
        } catch (e) { console.warn("Cache clear failed", e); }
    },
    getMovieGenres: () => fetchTMDB('/genre/movie/list'),
    getSeriesGenres: () => fetchTMDB('/genre/tv/list'),
    discoverByGenre: async (type: 'movie' | 'tv', genreId: number, page: number = 1) => {
        const key = `discover_${type}_${genreId}_${page}`;
        const cache = getCache();
        // Cache for 12 hours
        if (cache[key] && (Date.now() - cache[key].timestamp < 12 * 60 * 60 * 1000)) {
            return cache[key].data;
        }

        const sortField = type === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc';
        const data = await fetchTMDB(`/discover/${type}`, {
            with_genres: genreId.toString(),
            sort_by: sortField,
            page: page.toString(),
            'vote_count.gte': '10',
        });

        if (data && data.results && data.results.length > 0) {
            saveToCache(key, data);
        }
        return data;
    },
    getCollection: (id: number) => fetchTMDB(`/collection/${id}`),
};

export const getImageUrl = (path: string | null | undefined, size: 'logo' | 'small' | 'medium' | 'large' | 'original' = 'medium') => {
    if (!path || typeof path !== 'string') return null;
    const sizes = {
        logo: 'w185',
        small: 'w342',
        medium: 'w500',
        large: 'w780',
        original: 'original',
    };
    return `https://image.tmdb.org/t/p/${sizes[size]}${path}`;
};
