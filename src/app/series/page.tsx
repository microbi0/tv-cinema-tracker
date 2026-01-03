'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { tmdb, getImageUrl } from '@/lib/tmdb';
import Link from 'next/link';
import { useTracking } from '@/hooks/useTracking';
import { CheckCircle2, Bookmark, MonitorPlay, Ghost, Star, History, Calendar, Sparkles, Tv, OctagonX, Play, Dices, X, Popcorn } from 'lucide-react';
import HorizontalSeriesCard from '@/components/HorizontalSeriesCard';
import MediaCard from '@/components/MediaCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function SeriesPage() {
    const { getTrackedSeriesIds, watched, watchlist, favorites, lastWatched, getWatchlistByType, getNextEpisode, getLastWatchedTime, isFavorite, isDropped, getSeriesStatus, trackingLoading, seriesStatuses, episodeDetails, setEpisodeDetails, toggleEpisode } = useTracking();
    const [displayItems, setDisplayItems] = useState<any[]>([]);
    const views = ['watchlist', 'calendar', 'watched', 'favorites'] as const;
    const [view, setView] = useState<typeof views[number]>('watchlist');
    const [initialLoading, setInitialLoading] = useState(true);
    const [showRandomModal, setShowRandomModal] = useState(false);
    const [randomSeries, setRandomSeries] = useState<any>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [currentShuffleItem, setCurrentShuffleItem] = useState<any>(null);

    const handleRandomSeries = async () => {
        if (!watchlistCategories?.notStarted || watchlistCategories.notStarted.length === 0) return;

        setShowRandomModal(true);
        setIsShuffling(true);

        const items = watchlistCategories.notStarted;

        // Shuffle animation
        let currentIndex = 0;
        const shuffleInterval = setInterval(() => {
            setCurrentShuffleItem(items[Math.floor(Math.random() * items.length)]);
        }, 120);

        // Slow down and pick final
        setTimeout(() => {
            clearInterval(shuffleInterval);
            const finalItem = items[Math.floor(Math.random() * items.length)];
            setRandomSeries(finalItem);
            setIsShuffling(false);
        }, 2000);
    };

    const fetchSeries = async (ids: number[]) => {
        if (!ids || ids.length === 0) {
            setDisplayItems([]);
            setInitialLoading(false);
            return;
        }

        try {
            const existingIds = new Set(displayItems.map(item => item.id));
            const neededIds = ids.filter(id => !existingIds.has(id));

            if (neededIds.length === 0) {
                setInitialLoading(false);
                return;
            }

            const BATCH_SIZE = 50;
            for (let i = 0; i < neededIds.length; i += BATCH_SIZE) {
                const batch = neededIds.slice(i, i + BATCH_SIZE);
                const results = await Promise.all(
                    batch.map(id => tmdb.getDetailsCached(id, 'tv').catch(() => null))
                );

                const validResults = results.filter((r: any) => r && r.id);
                if (validResults.length > 0) {
                    setDisplayItems(prev => {
                        const newOnes = validResults.filter(r => !prev.some(p => p.id === r.id));
                        return [...prev, ...newOnes];
                    });
                }
                if (i === 0) setInitialLoading(false);
            }
        } catch (error) {
            console.error("Error fetching series:", error);
        } finally {
            setInitialLoading(false);
        }
    };

    const watchlistIds = getWatchlistByType('tv');
    const trackedIds = getTrackedSeriesIds();
    const favoriteIds = favorites.filter(f => f.type === 'tv').map(f => f.id);
    const allUniqueIds = useMemo(() => Array.from(new Set([...watchlistIds, ...trackedIds, ...favoriteIds])).sort((a, b) => b - a), [watchlistIds, trackedIds, favoriteIds]);

    // Initial sync load from cache
    useEffect(() => {
        if (displayItems.length === 0 && allUniqueIds.length > 0) {
            const cachedItems = allUniqueIds
                .map(id => tmdb.getDetailsSync(id, 'tv'))
                .filter(Boolean);
            if (cachedItems.length > 0) {
                setDisplayItems(cachedItems);
                setInitialLoading(false);
            }
        }
    }, [allUniqueIds]);

    useEffect(() => {
        if (!trackingLoading && allUniqueIds.length > 0) {
            fetchSeries(allUniqueIds);
        } else if (!trackingLoading && allUniqueIds.length === 0) {
            setInitialLoading(false);
        }
    }, [allUniqueIds, trackingLoading]);

    useEffect(() => {
        let isActive = true;
        const updateDetails = async () => {
            if (displayItems.length === 0) return;
            const itemsToFetch = displayItems.filter(item => {
                const nextEp = getNextEpisode(item.id, item.seasons);
                if (!nextEp) return false;
                const cached = episodeDetails[item.id];
                return !cached || cached.s !== nextEp.season || cached.e !== nextEp.episode;
            });

            if (itemsToFetch.length === 0) return;

            // Fetch all needed details in parallel - semaphore in tmdb.ts will manage load
            const newBatchDetails: Record<number, any> = {};
            await Promise.all(itemsToFetch.map(async (item) => {
                const nextEp = getNextEpisode(item.id, item.seasons);
                if (nextEp) {
                    try {
                        const season = await tmdb.getSeasonCached(item.id, nextEp.season);
                        if (!isActive) return;
                        const ep = season?.episodes?.find((e: any) => e.episode_number === nextEp.episode);
                        if (ep) {
                            newBatchDetails[item.id] = { name: ep.name, airDate: ep.air_date, s: nextEp.season, e: nextEp.episode };
                        }
                    } catch (e) { }
                }
            }));

            if (isActive && Object.keys(newBatchDetails).length > 0) {
                setEpisodeDetails(prev => ({ ...prev, ...newBatchDetails }));
            }
        };
        updateDetails();
        return () => { isActive = false; };
    }, [displayItems, watched]);

    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const SIX_MONTHS_MS = 182.5 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const STOPPED_STATUSES = ['stopped', 'stoped', 'dropped', 'abandoned', 'parada', 'descontinuada', 'abandonada'];
    const ENDED_STATUSES = ['ended', 'canceled', 'cancelled'];

    const baseItems = useMemo(() => {
        return displayItems.filter(item => {
            const status = (getSeriesStatus(item.id) || '').toLowerCase().trim();
            const isStopped = STOPPED_STATUSES.includes(status);
            const isEnded = ENDED_STATUSES.includes(status);

            if (view === 'watchlist') {
                return watchlistIds.includes(item.id) && !isStopped && !isEnded;
            }
            if (view === 'watched') {
                return (trackedIds.includes(item.id) || isStopped || isEnded) && (getNextEpisode(item.id, item.seasons) === null || isStopped || isEnded);
            }
            if (view === 'favorites') return isFavorite(item.id, 'tv');
            if (view === 'calendar') return watchlistIds.includes(item.id) || trackedIds.includes(item.id);
            return false;
        });
    }, [displayItems, view, watchlistIds, trackedIds, favorites, seriesStatuses]);

    const filteredItems = useMemo(() => {
        return baseItems.filter(item => {
            const airDate = episodeDetails[item.id]?.airDate;
            const isFuture = airDate ? new Date(airDate).getTime() > now : false;

            if (view === 'calendar') return isFuture || !airDate;
            if (view === 'watchlist') {
                const nextEp = getNextEpisode(item.id, item.seasons);
                const hasPremiered = item.first_air_date && new Date(item.first_air_date).getTime() <= now;
                return nextEp !== null && !isFuture && hasPremiered;
            }
            return true;
        });
    }, [baseItems, view, episodeDetails, watched]);

    const upcomingByMonth = useMemo(() => {
        if (view !== 'calendar') return {};
        const upcoming = filteredItems.sort((a, b) => {
            const dateA = episodeDetails[a.id]?.airDate || '9999-12-31';
            const dateB = episodeDetails[b.id]?.airDate || '9999-12-31';
            return new Date(dateA).getTime() - new Date(dateB).getTime();
        });

        return upcoming.reduce((acc: Record<string, any[]>, item) => {
            const ad = episodeDetails[item.id]?.airDate;
            if (!ad) {
                const key = 'Sem data de estreia';
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
            }
            const date = new Date(ad);
            const monthName = date.toLocaleDateString('pt-PT', { month: 'long' });
            const monthKey = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(item);
            return acc;
        }, {});
    }, [filteredItems, view, episodeDetails]);

    const watchlistCategories = useMemo(() => {
        if (view !== 'watchlist') return null;

        const ongoing = filteredItems.filter(item => {
            const nextEp = getNextEpisode(item.id, item.seasons);
            // Must have started (not 1x1)
            return nextEp && !(nextEp.season === 1 && nextEp.episode === 1);
        });

        const notStarted = filteredItems.filter(item => {
            const nextEp = getNextEpisode(item.id, item.seasons);
            // Must have a premiere date and it must be in the past
            const hasPremiered = item.first_air_date && new Date(item.first_air_date).getTime() <= now;
            return nextEp && nextEp.season === 1 && nextEp.episode === 1 && hasPremiered;
        }).sort((a, b) => new Date(b.first_air_date || 0).getTime() - new Date(a.first_air_date || 0).getTime());

        const thisWeek = ongoing.filter(item => {
            const ad = episodeDetails[item.id]?.airDate;
            return ad && new Date(ad).getTime() <= now && (now - new Date(ad).getTime() <= SEVEN_DAYS_MS);
        });

        // "Acompanhando" logic:
        // 1. Not in "This Week"
        // 2. Either marked as seen in the last 30 days OR has an episode released in the last 30 days
        const activeWatching = ongoing.filter(item => {
            if (thisWeek.some(tw => tw.id === item.id)) return false;

            const lastSeenTime = getLastWatchedTime(item.id) || 0;
            const isRecentSeen = (now - lastSeenTime <= THIRTY_DAYS_MS);

            const ad = episodeDetails[item.id]?.airDate;
            const isRecentRelease = ad && (now - new Date(ad).getTime() <= THIRTY_DAYS_MS);

            return isRecentSeen || isRecentRelease;
        });

        // "Deixadas para Trás": > 30 days and <= 6 months
        const leftBehind = ongoing.filter(item => {
            if (thisWeek.some(tw => tw.id === item.id)) return false;
            if (activeWatching.some(aw => aw.id === item.id)) return false;

            const lastSeenTime = getLastWatchedTime(item.id) || 0;
            const diff = now - lastSeenTime;
            return diff > THIRTY_DAYS_MS && diff <= SIX_MONTHS_MS;
        });

        // "Abandonadas": > 6 months
        const abandoned = ongoing.filter(item => {
            if (thisWeek.some(tw => tw.id === item.id)) return false;
            if (activeWatching.some(aw => aw.id === item.id)) return false;
            if (leftBehind.some(lb => lb.id === item.id)) return false;

            const lastSeenTime = getLastWatchedTime(item.id) || 0;
            return (now - lastSeenTime > SIX_MONTHS_MS);
        });

        return { thisWeek, activeWatching, leftBehind, abandoned, notStarted };
    }, [filteredItems, view, episodeDetails, watched, lastWatched]);

    const watchedByYear = useMemo(() => {
        if (view !== 'watched') return [];
        const items = [...filteredItems].sort((a, b) => {
            const timeA = getLastWatchedTime(a.id) || 0;
            const timeB = getLastWatchedTime(b.id) || 0;
            return timeB - timeA;
        });

        const groups: Record<string, any[]> = {};
        items.forEach(item => {
            const time = getLastWatchedTime(item.id);
            const year = time ? new Date(time).getFullYear().toString() : 'Antigos';
            if (!groups[year]) groups[year] = [];
            groups[year].push(item);
        });

        return Object.entries(groups).sort((a, b) => {
            if (a[0] === 'Antigos') return 1;
            if (b[0] === 'Antigos') return -1;
            return parseInt(b[0]) - parseInt(a[0]);
        });
    }, [filteredItems, view, lastWatched]);
    const handleDragEnd = (event: any, info: any) => {
        const threshold = 100;
        const velocityThreshold = 800;
        const currentIdx = views.indexOf(view);

        const isIntentionalSwipeLeft = info.offset.x < -threshold || (info.velocity.x < -velocityThreshold && info.offset.x < -50);
        const isIntentionalSwipeRight = info.offset.x > threshold || (info.velocity.x > velocityThreshold && info.offset.x > 50);

        if (isIntentionalSwipeLeft) {
            if (currentIdx < views.length - 1) {
                setView(views[currentIdx + 1]);
            }
        } else if (isIntentionalSwipeRight && currentIdx > 0) {
            setView(views[currentIdx - 1]);
        }
    };

    const tabIndicatorVariants = {
        animate: {
            opacity: [0.95, 1, 0.95],
            scale: [0.99, 1, 0.99],
        },
        transition: {
            layout: { type: "spring" as const, stiffness: 450, damping: 18, mass: 0.8 },
            opacity: { repeat: Infinity, duration: 2, ease: "easeInOut" as const },
            scale: { repeat: Infinity, duration: 2, ease: "easeInOut" as const }
        }
    };

    return (
        <div className="h-auto max-w-full pb-24">
            <div className="sticky top-0 z-50 bg-black/70 backdrop-blur-md px-5 pt-14 pb-4 border-b border-white/5">
                <header className="mb-4 flex items-center justify-between">
                    <h1 className="text-3xl font-black flex items-center gap-2">
                        <Tv size={24} className="text-white" />
                        Séries
                    </h1>
                    <button
                        onClick={handleRandomSeries}
                        className="h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 border border-white/5"
                        title="Sorteio Aleatório"
                    >
                        <Dices size={24} />
                    </button>
                </header>

                <div className="flex p-1 bg-neutral-900/50 rounded-xl border border-white/5">
                    <button
                        onClick={() => setView('watchlist')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10 ${view === 'watchlist' ? 'text-black px-4' : 'text-neutral-500 hover:text-white'}`}
                    >
                        <Bookmark size={16} />
                        <AnimatePresence mode="wait">
                            {view === 'watchlist' && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    Watchlist
                                </motion.span>
                            )}
                        </AnimatePresence>
                        {view === 'watchlist' && (
                            <motion.div
                                layoutId="activeTabSeries"
                                className="absolute inset-0 bg-white rounded-lg shadow-lg shadow-white/20 -z-10"
                                animate={tabIndicatorVariants.animate}
                                transition={tabIndicatorVariants.transition}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setView('calendar')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10 ${view === 'calendar' ? 'text-black px-4' : 'text-neutral-500 hover:text-white'}`}
                    >
                        <Calendar size={16} />
                        <AnimatePresence mode="wait">
                            {view === 'calendar' && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    Estreias
                                </motion.span>
                            )}
                        </AnimatePresence>
                        {view === 'calendar' && (
                            <motion.div
                                layoutId="activeTabSeries"
                                className="absolute inset-0 bg-white rounded-lg shadow-lg shadow-white/20 -z-10"
                                animate={tabIndicatorVariants.animate}
                                transition={tabIndicatorVariants.transition}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setView('watched')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10 ${view === 'watched' ? 'text-black px-4' : 'text-neutral-500 hover:text-white'}`}
                    >
                        <CheckCircle2 size={16} />
                        <AnimatePresence mode="wait">
                            {view === 'watched' && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    Visto
                                </motion.span>
                            )}
                        </AnimatePresence>
                        {view === 'watched' && (
                            <motion.div
                                layoutId="activeTabSeries"
                                className="absolute inset-0 bg-white rounded-lg shadow-lg shadow-white/20 -z-10"
                                animate={tabIndicatorVariants.animate}
                                transition={tabIndicatorVariants.transition}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setView('favorites')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all relative z-10 ${view === 'favorites' ? 'text-black px-4' : 'text-neutral-500 hover:text-white'}`}
                    >
                        <Star size={16} fill={view === 'favorites' ? "black" : "none"} />
                        <AnimatePresence mode="wait">
                            {view === 'favorites' && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="overflow-hidden whitespace-nowrap"
                                >
                                    Favoritos
                                </motion.span>
                            )}
                        </AnimatePresence>
                        {view === 'favorites' && (
                            <motion.div
                                layoutId="activeTabSeries"
                                className="absolute inset-0 bg-white rounded-lg shadow-lg shadow-white/20 -z-10"
                                animate={tabIndicatorVariants.animate}
                                transition={tabIndicatorVariants.transition}
                            />
                        )}
                    </button>
                </div>
            </div>

            <main className="px-5 pt-4">
                {initialLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-500 gap-4 opacity-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">A carregar...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            drag="x"
                            dragDirectionLock
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.15}
                            onDragEnd={handleDragEnd}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                            className="space-y-12 will-change-transform"
                        >
                            {filteredItems.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-neutral-500 opacity-40">
                                    <Ghost size={64} className="mb-4" />
                                    <p className="text-lg font-bold">Vazio</p>
                                </div>
                            )}

                            {view === 'watchlist' && watchlistCategories && (
                                <div className="space-y-10">
                                    {[
                                        { title: 'Esta Semana', items: watchlistCategories.thisWeek, icon: <Sparkles size={18} /> },
                                        { title: 'Acompanhando', items: watchlistCategories.activeWatching, icon: <Tv size={18} /> },
                                        { title: 'Deixadas para Trás', items: watchlistCategories.leftBehind, icon: <History size={18} /> },
                                        { title: 'Abandonadas', items: watchlistCategories.abandoned, icon: <OctagonX size={18} /> }
                                    ].map(cat => cat.items.length > 0 && (
                                        <section key={cat.title} className="space-y-4">
                                            <h2 className="text-xl font-black text-white flex items-center gap-2 px-1">
                                                {cat.icon} {cat.title}
                                            </h2>
                                            <div className="flex flex-col gap-1.5">
                                                <AnimatePresence mode="popLayout" initial={false}>
                                                    {cat.items.map(item => (
                                                        <HorizontalSeriesCard
                                                            key={item.id}
                                                            id={item.id}
                                                            name={item.original_name || item.name}
                                                            posterPath={item.poster_path}
                                                            backdropPath={item.backdrop_path}
                                                            nextEpisode={getNextEpisode(item.id, item.seasons)}
                                                            episodeDetails={episodeDetails[item.id]}
                                                            seasons={item.seasons}
                                                            status={getSeriesStatus(item.id)}
                                                        />
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        </section>
                                    ))}

                                    {watchlistCategories.notStarted.length > 0 && (
                                        <section className="space-y-4">
                                            <h2 className="text-xl font-black text-white flex items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <Play size={18} fill="white" /> Para Começar
                                                </div>
                                                <button
                                                    onClick={handleRandomSeries}
                                                    className="p-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-full transition-all active:scale-95"
                                                    title="Sorteio Aleatório"
                                                >
                                                    <Dices size={20} />
                                                </button>
                                            </h2>
                                            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5">
                                                <AnimatePresence mode="popLayout" initial={false}>
                                                    {watchlistCategories.notStarted.map(item => (
                                                        <MediaCard
                                                            key={item.id}
                                                            id={item.id}
                                                            title={item.original_name || item.name}
                                                            posterPath={item.poster_path}
                                                            rating={item.vote_average}
                                                            type="tv"
                                                            year={item.first_air_date}
                                                            isDropped={isDropped(item.id)}
                                                            status={getSeriesStatus(item.id)}
                                                            disableSwipe={true}
                                                            showMarkFirstButton={true}
                                                            onMarkFirst={() => toggleEpisode(item.id, 1, 1, item.seasons)}
                                                        />
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            )}

                            {view === 'calendar' && (
                                <div className="space-y-12 pb-20">
                                    {Object.keys(upcomingByMonth).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-neutral-500 opacity-40">
                                            <Calendar size={64} className="mb-4" />
                                            <p className="text-lg font-bold">Sem estreias</p>
                                            <p className="text-sm text-center max-w-[200px]">Não tens episódios com data de estreia anunciada.</p>
                                        </div>
                                    ) : (
                                        Object.entries(upcomingByMonth)
                                            .sort(([a], [b]) => {
                                                if (a === 'Sem data de estreia') return 1;
                                                if (b === 'Sem data de estreia') return -1;
                                                return 0;
                                            })
                                            .map(([month, items]) => (
                                                <section key={month} className="space-y-6">
                                                    <h2 className="text-xl font-black text-white flex items-center gap-2 px-1 capitalize">
                                                        {month}
                                                    </h2>
                                                    <div className="flex flex-col gap-3">
                                                        {items.map((item: any) => (
                                                            <HorizontalSeriesCard
                                                                key={item.id}
                                                                id={item.id}
                                                                name={item.original_name || item.name}
                                                                posterPath={item.poster_path}
                                                                backdropPath={item.backdrop_path}
                                                                nextEpisode={getNextEpisode(item.id, item.seasons)}
                                                                episodeDetails={episodeDetails[item.id]}
                                                                seasons={item.seasons}
                                                                status={getSeriesStatus(item.id)}
                                                                showCountdown={true}
                                                            />
                                                        ))}
                                                    </div>
                                                </section>
                                            ))
                                    )}
                                </div>
                            )}

                            {view === 'favorites' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black text-white px-1 flex items-center gap-2">
                                        <Star size={20} fill="white" />
                                        Séries Favoritas
                                    </h2>
                                    <div className="grid grid-cols-3 gap-3">
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            {filteredItems.map(item => (
                                                <MediaCard
                                                    key={item.id}
                                                    id={item.id}
                                                    title={item.original_name || item.name}
                                                    posterPath={item.poster_path}
                                                    rating={item.vote_average}
                                                    type="tv"
                                                    year={item.first_air_date}
                                                    isDropped={isDropped(item.id)}
                                                    status={getSeriesStatus(item.id)}
                                                    disableSwipe={true}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}

                            {view === 'watched' && (
                                <div className="space-y-12">
                                    {watchedByYear.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-neutral-500 opacity-40">
                                            <CheckCircle2 size={64} className="mb-4" />
                                            <p className="text-lg font-bold">Nada visto ainda</p>
                                        </div>
                                    ) : (
                                        watchedByYear.map(([year, items]) => (
                                            <section key={year} className="space-y-6">
                                                <h2 className="text-xl font-black text-white px-1 flex items-center gap-2">
                                                    <History size={20} className="text-neutral-400" />
                                                    {year}
                                                </h2>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <AnimatePresence mode="popLayout" initial={false}>
                                                        {items.map(item => (
                                                            <MediaCard
                                                                key={item.id}
                                                                id={item.id}
                                                                title={item.original_name || item.name}
                                                                posterPath={item.poster_path}
                                                                rating={item.vote_average}
                                                                type="tv"
                                                                isDropped={isDropped(item.id)}
                                                                status={getSeriesStatus(item.id)}
                                                                disableSwipe={true}
                                                            />
                                                        ))}
                                                    </AnimatePresence>
                                                </div>
                                            </section>
                                        ))
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </main>
            <AnimatePresence>
                {showRandomModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 text-white">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isShuffling && setShowRandomModal(false)}
                            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="relative w-full max-w-sm overflow-hidden"
                        >
                            <div className="relative aspect-[2/3] w-full rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/10">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    {(isShuffling ? currentShuffleItem : randomSeries) && (
                                        <motion.div
                                            key={(isShuffling ? (currentShuffleItem?.id || Math.random()) : randomSeries.id)}
                                            initial={{ y: 200, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -200, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                            className="absolute inset-0"
                                        >
                                            <img
                                                src={getImageUrl((isShuffling ? currentShuffleItem : randomSeries).poster_path, 'large')!}
                                                alt="Poster"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!isShuffling && randomSeries && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="absolute inset-0 flex flex-col justify-end p-8 text-center"
                                    >
                                        <Link
                                            href={`/series-detail?id=${randomSeries.id}`}
                                            className="flex flex-col items-center"
                                            onClick={() => setShowRandomModal(false)}
                                        >
                                            <h2 className="text-3xl font-black text-white leading-tight mb-2 uppercase tracking-tighter italic text-shadow-lg">
                                                {randomSeries.original_name || randomSeries.name}
                                            </h2>

                                            {randomSeries.genres && (
                                                <div className="flex justify-center gap-2 mb-4">
                                                    {randomSeries.genres.slice(0, 2).map((g: any) => (
                                                        <span key={g.id} className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 border border-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                                                            {g.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <p className="text-sm text-white/80 line-clamp-3 font-medium leading-relaxed">
                                                {randomSeries.overview}
                                            </p>
                                        </Link>
                                    </motion.div>
                                )}

                                {isShuffling && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <Dices size={48} className="text-white animate-bounce" />
                                                <Sparkles size={24} className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white animate-pulse">A sortear...</span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => !isShuffling && setShowRandomModal(false)}
                                    className="absolute top-6 right-6 h-12 w-12 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 z-20 active:scale-90 transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
