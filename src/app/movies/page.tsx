'use client';

import { useEffect, useState, useMemo } from 'react';
import { tmdb, getImageUrl } from '@/lib/tmdb';
import Link from 'next/link';
import MediaCard from '@/components/MediaCard';
import { useTracking } from '@/hooks/useTracking';
import { Popcorn, Dices, X, Sparkles, CalendarDays, Clapperboard, CheckCircle2, Bookmark, LayoutGrid, ListFilter, Calendar, Ghost, Rocket, Flame, History, Sword, Map as MapIcon, Palette, Laugh, ShieldAlert, FileText, Theater, Heart, Wand2, Landmark, Skull, Music, Search, Atom, Zap, Swords, Mountain, HelpCircle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MoviesPage() {
    const { getTrackedMovieIds, watched, watchlist, favorites, getWatchlistByType, isMovieWatched, getLastWatchedTime, isFavorite, toggleMovie } = useTracking();
    const [displayItems, setDisplayItems] = useState<any[]>([]);
    const views = ['watchlist', 'calendar', 'watched', 'favorites'] as const;
    const [view, setView] = useState<typeof views[number]>('watchlist');
    const [layout, setLayout] = useState<'grid' | 'date' | 'genres' | 'history'>('date');
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [showRandomModal, setShowRandomModal] = useState(false);
    const [randomMovie, setRandomMovie] = useState<any>(null);
    const [isShuffling, setIsShuffling] = useState(false);
    const [currentShuffleItem, setCurrentShuffleItem] = useState<any>(null);

    const getPTReleaseDate = (item: any) => {
        const ptDates = item.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'PT');
        if (ptDates) {
            const prioritized = ptDates.release_dates.find((d: any) => d.type === 3) || ptDates.release_dates[0];
            return prioritized.release_date;
        }
        return item.release_date;
    };

    const fetchData = async (ids: number[]) => {
        if (ids.length === 0) {
            setDisplayItems([]);
            setLoading(false);
            return;
        }

        try {
            const existingIds = new Set(displayItems.map(item => item.id));
            const neededIds = ids.filter(id => !existingIds.has(id));

            if (neededIds.length === 0) {
                setLoading(false);
                return;
            }

            const BATCH_SIZE = 50;
            for (let i = 0; i < neededIds.length; i += BATCH_SIZE) {
                const batch = neededIds.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(
                    batch.map(id => tmdb.getDetailsCached(id, 'movie').catch(() => null))
                );

                const validResults = batchResults.filter((r: any) => r && r.id);
                if (validResults.length > 0) {
                    setDisplayItems(prev => {
                        const newOnes = validResults.filter(r => !prev.some(p => p.id === r.id));
                        return [...prev, ...newOnes];
                    });
                }
                if (i === 0) setLoading(false);
                setProgress(prev => prev + validResults.length);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const watchlistIds = getWatchlistByType('movie');
    const trackedIds = getTrackedMovieIds();
    const favoriteIds = favorites.filter(f => f.type === 'movie').map(f => f.id);
    const allUniqueIds = useMemo(() => Array.from(new Set([...watchlistIds, ...trackedIds, ...favoriteIds])).sort((a, b) => b - a), [watchlistIds, trackedIds, favoriteIds]);

    // Initial sync load from cache to avoid "loading" flash
    useEffect(() => {
        if (displayItems.length === 0) {
            const cachedItems = allUniqueIds
                .map(id => tmdb.getDetailsSync(id, 'movie'))
                .filter(Boolean);
            if (cachedItems.length > 0) {
                setDisplayItems(cachedItems);
                setLoading(false);
            }
        }
    }, [allUniqueIds]);

    useEffect(() => {
        fetchData(allUniqueIds);
    }, [allUniqueIds]);

    const now = Date.now();
    const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;
    const tenWeeksAgo = now - 70 * 24 * 60 * 60 * 1000;
    const currentYear = new Date().getFullYear();
    const startOfCurrentYear = new Date(currentYear, 0, 1).getTime();
    const year1 = currentYear - 1;
    const year2 = currentYear - 2;

    const filteredItems = useMemo(() => {
        return displayItems.filter(item => {
            const relDate = getPTReleaseDate(item);
            const isFuture = relDate ? new Date(relDate).getTime() > now : false;

            if (view === 'favorites') return isFavorite(item.id, 'movie');
            if (view === 'calendar') return isFuture;
            if (view === 'watched') return isMovieWatched(item.id);
            if (view === 'watchlist') return watchlistIds.includes(item.id) && !isMovieWatched(item.id) && !isFuture;
            return false;
        });
    }, [displayItems, view, watchlistIds, watched, favorites]);

    const categorizedByDate = useMemo(() => {
        if (layout !== 'date') return [];

        const alreadyCategorized = new Set<number>();
        const sections: Array<{ name: string, icon: any, items: any[] }> = [];

        // 1. No Cinema (Last 3 weeks)
        const noCinemaItems = filteredItems.filter(m => {
            const dateStr = getPTReleaseDate(m);
            if (!dateStr) return false;
            const time = new Date(dateStr).getTime();
            return time >= threeWeeksAgo && time <= now;
        }).sort((a, b) => new Date(getPTReleaseDate(b)).getTime() - new Date(getPTReleaseDate(a)).getTime());

        if (noCinemaItems.length > 0) {
            sections.push({
                name: 'No Cinema',
                icon: <Popcorn size={24} className="text-white" />,
                items: noCinemaItems
            });
            noCinemaItems.forEach(m => alreadyCategorized.add(m.id));
        }

        // 2. Recentes (3 to 10 weeks)
        const recenteItems = filteredItems.filter(m => {
            if (alreadyCategorized.has(m.id)) return false;
            const dateStr = getPTReleaseDate(m);
            if (!dateStr) return false;
            const time = new Date(dateStr).getTime();
            return time >= tenWeeksAgo && time < threeWeeksAgo;
        }).sort((a, b) => new Date(getPTReleaseDate(b)).getTime() - new Date(getPTReleaseDate(a)).getTime());

        if (recenteItems.length > 0) {
            sections.push({
                name: 'Recentes',
                icon: <Sparkles size={24} className="text-white" />,
                items: recenteItems
            });
            recenteItems.forEach(m => alreadyCategorized.add(m.id));
        }

        // 3. Organizado por Anos
        const remainingWithDates = filteredItems.filter(m => {
            if (alreadyCategorized.has(m.id)) return false;
            const dateStr = getPTReleaseDate(m);
            if (!dateStr) return false;
            const time = new Date(dateStr).getTime();
            return time <= now;
        });

        const yearGroups: Record<number, any[]> = {};
        const classicItems: any[] = [];

        remainingWithDates.forEach(m => {
            const year = new Date(getPTReleaseDate(m)).getFullYear();
            if (year >= 2000) {
                if (!yearGroups[year]) yearGroups[year] = [];
                yearGroups[year].push(m);
            } else {
                classicItems.push(m);
            }
        });

        Object.keys(yearGroups)
            .map(Number)
            .sort((a, b) => b - a)
            .forEach(year => {
                const isCurrent = year === currentYear;
                const opacityClass = isCurrent ? 'opacity-100' : year === currentYear - 1 ? 'opacity-70' : year === currentYear - 2 ? 'opacity-50' : 'opacity-30';
                sections.push({
                    name: isCurrent ? 'Este Ano' : year.toString(),
                    icon: <CalendarDays size={24} className={`text-white ${opacityClass}`} />,
                    items: yearGroups[year].sort((a, b) => new Date(getPTReleaseDate(b)).getTime() - new Date(getPTReleaseDate(a)).getTime())
                });
                yearGroups[year].forEach(m => alreadyCategorized.add(m.id));
            });

        // 4. Clássicos (Before year 2000)
        if (classicItems.length > 0) {
            sections.push({
                name: 'Clássicos',
                icon: <History size={24} className="text-white opacity-20" />,
                items: classicItems.sort((a, b) => new Date(getPTReleaseDate(b)).getTime() - new Date(getPTReleaseDate(a)).getTime())
            });
            classicItems.forEach(m => alreadyCategorized.add(m.id));
        }

        // 5. Antigos / Sem Data (Only if not already categorized and NOT in the future)
        const antigosItems = filteredItems.filter(m => {
            if (alreadyCategorized.has(m.id)) return false;
            const dateStr = getPTReleaseDate(m);
            if (!dateStr) return true; // Items without date stay here
            const time = new Date(dateStr).getTime();
            return time <= now; // Still exclude future releases
        }).sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)); // Changed to descending

        if (antigosItems.length > 0) {
            sections.push({
                name: 'Antigos',
                icon: <Ghost size={24} className="text-white opacity-10" />,
                items: antigosItems
            });
        }

        return sections.map(s => ({ title: s.name, icon: s.icon, items: s.items }));
    }, [filteredItems, layout, threeWeeksAgo, tenWeeksAgo, now]);

    const categorizedByGenre = useMemo(() => {
        if (layout !== 'genres') return {};
        const genres = filteredItems.reduce((acc: any, movie: any) => {
            const primaryGenre = movie.genres?.[0]?.name || 'Outro';
            if (!acc[primaryGenre]) acc[primaryGenre] = [];
            acc[primaryGenre].push(movie);
            return acc;
        }, {});
        // Sort items in each genre by date
        Object.keys(genres).forEach(g => {
            genres[g].sort((a: any, b: any) => new Date(getPTReleaseDate(b) || 0).getTime() - new Date(getPTReleaseDate(a) || 0).getTime());
        });
        return genres;
    }, [filteredItems, layout]);

    const sortedByHistory = useMemo(() => {
        if (layout !== 'history') return [];
        return [...filteredItems].sort((a, b) => {
            const timeA = getLastWatchedTime(`movie_${a.id}`) || 0;
            const timeB = getLastWatchedTime(`movie_${b.id}`) || 0;
            return timeB - timeA;
        });
    }, [filteredItems, layout]);

    const upcomingByMonth = useMemo(() => {
        if (view !== 'calendar') return {};
        const calendarItems = filteredItems.sort((a, b) => new Date(getPTReleaseDate(a) || 0).getTime() - new Date(getPTReleaseDate(b) || 0).getTime());
        return calendarItems.reduce((acc: Record<string, any[]>, item) => {
            const relDate = getPTReleaseDate(item);
            if (!relDate) return acc;
            const date = new Date(relDate);
            const monthName = date.toLocaleDateString('pt-PT', { month: 'long' });
            const monthKey = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(item);
            return acc;
        }, {});
    }, [filteredItems, view]);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.02, delayChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 15 },
        show: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring" as const, stiffness: 450, damping: 35, mass: 0.8 }
        }
    };

    const handleDragEnd = (event: any, info: any) => {
        const threshold = 100;
        const velocityThreshold = 800;
        const currentIdx = views.indexOf(view);

        const isIntentionalSwipeLeft = info.offset.x < -threshold || (info.velocity.x < -velocityThreshold && info.offset.x < -50);
        const isIntentionalSwipeRight = info.offset.x > threshold || (info.velocity.x > velocityThreshold && info.offset.x > 50);

        if (isIntentionalSwipeLeft) {
            // Swipe Left (Finger moves left)
            if (currentIdx === views.indexOf('favorites')) {
                setView('watched');
            } else if (currentIdx < views.length - 1) {
                setView(views[currentIdx + 1]);
            }
        } else if (isIntentionalSwipeRight && currentIdx > 0) {
            // Swipe Right (Finger moves right)
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

    const genreIconMap: Record<string, any> = {
        'Ação': <Sword size={24} className="text-white" />,
        'Aventura': <MapIcon size={24} className="text-white" />,
        'Animação': <Palette size={24} className="text-white" />,
        'Comédia': <Laugh size={24} className="text-white" />,
        'Crime': <ShieldAlert size={24} className="text-white" />,
        'Documentário': <FileText size={24} className="text-white" />,
        'Drama': <Theater size={24} className="text-white" />,
        'Família': <Heart size={24} className="text-white" />,
        'Fantasia': <Wand2 size={24} className="text-white" />,
        'História': <Landmark size={24} className="text-white" />,
        'Terror': <Skull size={24} className="text-white" />,
        'Música': <Music size={24} className="text-white" />,
        'Mistério': <Search size={24} className="text-white" />,
        'Romance': <Heart size={24} className="text-white" />,
        'Ficção científica': <Atom size={24} className="text-white" />,
        'Suspense': <Zap size={24} className="text-white" />,
        'Guerra': <Swords size={24} className="text-white" />,
        'Faroeste': <Mountain size={24} className="text-white" />,
        'Outro': <HelpCircle size={24} className="text-white" />
    };


    const getCountdown = (dateStr?: string) => {
        if (!dateStr) return { value: '', label: '' };
        const diff = new Date(dateStr).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days <= 0) return { value: '!', label: 'Hoje' };
        if (days < 7) return { value: days.toString(), label: days === 1 ? 'Dia' : 'Dias' };
        const weeks = Math.floor(days / 7);
        if (weeks < 4) return { value: weeks.toString(), label: weeks === 1 ? 'Semana' : 'Semanas' };
        const months = Math.floor(days / 30);
        return { value: months.toString(), label: months === 1 ? 'Mês' : 'Meses' };
    };

    const cycleLayout = () => {
        if (layout === 'grid') setLayout('date');
        else if (layout === 'date') setLayout('genres');
        else if (layout === 'genres' && view === 'watched') setLayout('history');
        else setLayout('grid');
    };

    const handleRandomMovie = () => {
        const watchlistMovies = displayItems.filter(item =>
            watchlistIds.includes(item.id) && !isMovieWatched(item.id)
        );

        if (watchlistMovies.length === 0) return;

        setShowRandomModal(true);
        setIsShuffling(true);
        setRandomMovie(null);

        let count = 0;
        const maxCounts = 12;
        const interval = setInterval(() => {
            const randomIdx = Math.floor(Math.random() * watchlistMovies.length);
            setCurrentShuffleItem(watchlistMovies[randomIdx]);
            count++;

            if (count >= maxCounts) {
                clearInterval(interval);
                const finalIdx = Math.floor(Math.random() * watchlistMovies.length);
                const finalMovie = watchlistMovies[finalIdx];
                setRandomMovie(finalMovie);
                setIsShuffling(false);
            }
        }, 150);
    };

    return (
        <div className="relative h-auto max-w-full">
            {/* Sticky Header with Gaussian Blur */}
            <div className="sticky top-0 z-50 bg-black/60 backdrop-blur-md px-5 pt-16 pb-4 border-b border-white/5">
                <header className="mb-4 flex items-center justify-between">
                    <h1 className="text-3xl font-black tracking-normal flex items-center gap-2">
                        <Clapperboard size={28} className="text-white" />
                        Filmes
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRandomMovie}
                            className="h-12 w-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 border border-white/5"
                            title="Sorteio Aleatório"
                        >
                            <Dices size={24} />
                        </button>
                        <button
                            onClick={cycleLayout}
                            className="h-12 px-4 flex items-center justify-center gap-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95 border border-white/5"
                        >
                            {layout === 'grid' && (
                                <>
                                    <LayoutGrid size={18} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Geral</span>
                                </>
                            )}
                            {layout === 'date' && (
                                <>
                                    <Calendar size={18} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Data</span>
                                </>
                            )}
                            {layout === 'genres' && (
                                <>
                                    <ListFilter size={18} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Género</span>
                                </>
                            )}
                            {layout === 'history' && (
                                <>
                                    <History size={18} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Histórico</span>
                                </>
                            )}
                        </button>
                    </div>
                </header>

                <div className="flex p-1 bg-neutral-900/50 rounded-xl border border-white/5 relative">
                    <button
                        onClick={() => {
                            setView('watchlist');
                            if (layout === 'history') setLayout('grid');
                        }}
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
                                layoutId="movieTab"
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
                                layoutId="movieTab"
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
                                layoutId="movieTab"
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
                                layoutId="movieTab"
                                className="absolute inset-0 bg-white rounded-lg shadow-lg shadow-white/20 -z-10"
                                animate={tabIndicatorVariants.animate}
                                transition={tabIndicatorVariants.transition}
                            />
                        )}
                    </button>
                </div>
            </div>

            <div className="px-5 pt-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white mb-4"></div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-40">A carregar biblioteca ({progress})...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view + layout}
                            drag="x"
                            dragDirectionLock
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={handleDragEnd}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                            className="space-y-12 will-change-transform"
                        >
                            {filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
                                    <Ghost size={64} className="mb-6 opacity-20" />
                                    <p className="text-xl font-bold mb-2">Nada por aqui</p>
                                    <p className="text-sm opacity-60 text-center max-w-xs">
                                        {view === 'watchlist' ? 'Os filmes que adicionares à Watchlist aparecerão aqui.' :
                                            view === 'watched' ? 'Os filmes que marcares como vistos aparecerão aqui.' :
                                                'Os teus filmes favoritos aparecerão aqui.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-12 pb-20 pt-4">
                                    {view === 'favorites' ? (
                                        <div className="space-y-6">
                                            <h2 className="text-xl font-black text-white px-1 flex items-center gap-2">
                                                <Star size={20} fill="white" />
                                                Filmes Favoritos
                                            </h2>
                                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                                {filteredItems.map((item: any) => (
                                                    <MediaCard
                                                        key={item.id}
                                                        id={item.id}
                                                        title={item.original_title || item.title}
                                                        posterPath={item.poster_path}
                                                        rating={item.vote_average}
                                                        type="movie"
                                                        year={item.release_date}
                                                        disableSwipe={true}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : view === 'calendar' ? (
                                        <div className="space-y-12">
                                            {Object.keys(upcomingByMonth).length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
                                                    <Calendar size={64} className="mb-6 opacity-20" />
                                                    <p className="text-xl font-bold mb-2">Sem estreias</p>
                                                    <p className="text-sm opacity-60 text-center max-w-xs">Não tens filmes com data de estreia anunciada na tua watchlist.</p>
                                                </div>
                                            ) : (
                                                Object.entries(upcomingByMonth).map(([month, items]) => (
                                                    <section key={month} className="space-y-6">
                                                        <h2 className="text-xl font-black text-white flex items-center gap-2 px-1 capitalize">
                                                            {month}
                                                        </h2>
                                                        <div className="flex flex-col gap-3">
                                                            {items.map((item: any) => {
                                                                const countdown = getCountdown(getPTReleaseDate(item));
                                                                return (
                                                                    <motion.div
                                                                        key={item.id}
                                                                        initial={{ opacity: 0, y: 20 }}
                                                                        whileInView={{ opacity: 1, y: 0 }}
                                                                        viewport={{ once: true }}
                                                                        onClick={() => window.location.href = `/movie-detail?id=${item.id}`}
                                                                        className="relative flex items-center gap-4 bg-white/5 border border-white/10 rounded-3xl p-3 active:scale-[0.98] transition-all overflow-hidden"
                                                                    >
                                                                        <div className="relative h-24 w-16 flex-shrink-0 rounded-xl overflow-hidden shadow-lg bg-neutral-800">
                                                                            <img
                                                                                src={getImageUrl(item.poster_path, 'medium')!}
                                                                                alt={item.title}
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                                                        </div>

                                                                        <div className="flex-1 min-w-0 pr-4">
                                                                            <h3 className="text-lg font-bold text-white truncate mb-1">
                                                                                {item.original_title || item.title}
                                                                            </h3>
                                                                            <div className="flex items-center gap-2">
                                                                                <Calendar size={12} className="text-neutral-500" />
                                                                                <span className="text-xs font-bold text-neutral-400">
                                                                                    {new Date(getPTReleaseDate(item)).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex flex-col items-center justify-center h-14 w-14 text-white">
                                                                            <span className="text-2xl font-black leading-none">{countdown.value}</span>
                                                                            <span className="text-[12px] font-black uppercase tracking-tighter opacity-60">{countdown.label}</span>
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </section>
                                                ))
                                            )}
                                        </div>
                                    ) : layout === 'date' ? (
                                        /* Date Layout */
                                        <div className="space-y-12">
                                            {categorizedByDate.map((section) => (
                                                <section key={section.title} className="space-y-6">
                                                    <h2 className="text-xl font-black text-white flex items-center gap-2 px-1">
                                                        {section.icon} {section.title}
                                                    </h2>
                                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                                        {section.items.map((item: any) => (
                                                            <MediaCard
                                                                key={item.id}
                                                                id={item.id}
                                                                title={item.original_title || item.title}
                                                                posterPath={item.poster_path}
                                                                rating={item.vote_average}
                                                                type="movie"
                                                                year={getPTReleaseDate(item)}
                                                                disableSwipe={true}
                                                            />
                                                        ))}
                                                    </div>
                                                </section>
                                            ))}
                                        </div>
                                    ) : layout === 'genres' ? (
                                        /* Genres Layout */
                                        <div className="space-y-12">
                                            {Object.entries(categorizedByGenre).map(([genre, items]: [string, any]) => (
                                                <div key={genre} className="space-y-4">
                                                    <h2 className="text-xl font-black text-white flex items-center gap-2 px-1">
                                                        {genreIconMap[genre] || <Popcorn size={24} />} {genre}
                                                    </h2>
                                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                                        {items.map((item: any) => (
                                                            <MediaCard
                                                                key={item.id}
                                                                id={item.id}
                                                                title={item.original_title || item.title}
                                                                posterPath={item.poster_path}
                                                                rating={item.vote_average}
                                                                type="movie"
                                                                year={item.release_date}
                                                                disableSwipe={true}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : layout === 'history' ? (
                                        /* History Layout */
                                        <div className="space-y-6">
                                            <h2 className="text-xl font-black text-white px-1 flex items-center gap-2">
                                                <History size={24} /> Vistos Recentemente
                                            </h2>
                                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                                {sortedByHistory.map((item: any) => (
                                                    <MediaCard
                                                        key={item.id}
                                                        id={item.id}
                                                        title={item.original_title || item.title}
                                                        posterPath={item.poster_path}
                                                        rating={item.vote_average}
                                                        type="movie"
                                                        year={item.release_date}
                                                        disableSwipe={true}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Grid Layout */
                                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                            {filteredItems.map((item: any) => (
                                                <div key={item.id} className="animate-fade-in">
                                                    <MediaCard
                                                        id={item.id}
                                                        title={item.original_title || item.title}
                                                        posterPath={item.poster_path}
                                                        rating={item.vote_average}
                                                        type="movie"
                                                        year={item.release_date}
                                                        disableSwipe={true}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>

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
                                    {(isShuffling ? currentShuffleItem : randomMovie) && (
                                        <motion.div
                                            key={(isShuffling ? (currentShuffleItem?.id || Math.random()) : randomMovie.id)}
                                            initial={{ y: 200, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -200, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                            className="absolute inset-0"
                                        >
                                            <img
                                                src={getImageUrl((isShuffling ? currentShuffleItem : randomMovie).poster_path, 'large')!}
                                                alt="Poster"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {!isShuffling && randomMovie && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="absolute inset-0 flex flex-col justify-end p-8 text-center"
                                    >
                                        <Link
                                            href={`/movie-detail?id=${randomMovie.id}`}
                                            className="flex flex-col items-center"
                                            onClick={() => setShowRandomModal(false)}
                                        >
                                            <h2 className="text-3xl font-black text-white leading-tight mb-2 uppercase tracking-tighter italic text-shadow-lg">
                                                {randomMovie.title}
                                            </h2>

                                            {randomMovie.genres && (
                                                <div className="flex justify-center gap-2 mb-4">
                                                    {randomMovie.genres.slice(0, 2).map((g: any) => (
                                                        <span key={g.id} className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 border border-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                                                            {g.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <p className="text-sm text-white/80 line-clamp-3 font-medium leading-relaxed">
                                                {randomMovie.overview}
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

            <div className="h-[85px]" />
        </div>
    );
}
