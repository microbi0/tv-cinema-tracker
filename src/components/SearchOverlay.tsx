'use client';

import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, User, Clapperboard, Tv, Flame, Zap, Compass, Palette, Ghost, Octagon, Video, Theater, Heart, Wand2, Landmark, Skull, Music, Atom, Swords, X, Crosshair, Laugh, Sword, Slice } from 'lucide-react';
import { tmdb, getImageUrl } from '@/lib/tmdb';
import MediaCard from '@/components/MediaCard';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTracking } from '@/hooks/useTracking';

export default function SearchOverlay() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isOpen = searchParams.get('search') === 'true';

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [popularMovies, setPopularMovies] = useState<any[]>([]);
    const [popularSeries, setPopularSeries] = useState<any[]>([]);
    const [recommendedMovies, setRecommendedMovies] = useState<any[]>([]);
    const [recommendedSeries, setRecommendedSeries] = useState<any[]>([]);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const { favorites, watchlist, watched, getWatchlistByType, getTrackedSeriesIds, getTrackedMovieIds } = useTracking();

    const [selectedGenre, setSelectedGenre] = useState<any>(null);

    const genres = [
        { id: 28, name: 'Ação', icon: Crosshair },
        { id: 12, name: 'Aventura', icon: Compass },
        { id: 16, name: 'Animação', icon: Ghost },
        { id: 35, name: 'Comédia', icon: Laugh },
        { id: 80, name: 'Crime', icon: Slice },
        { id: 99, name: 'DOC', icon: Video },
        { id: 18, name: 'Drama', icon: Sword },
        { id: 10751, name: 'Família', icon: Heart },
        { id: 14, name: 'Fantasia', icon: Wand2 },
        { id: 36, name: 'História', icon: Landmark },
        { id: 27, name: 'Terror', icon: Skull },
        { id: 10402, name: 'Música', icon: Music },
        { id: 9648, name: 'Mistério', icon: SearchIcon },
        { id: 10749, name: 'Romance', icon: Heart },
        { id: 53, name: 'Thriller', icon: Zap },
        { id: 10752, name: 'Guerra', icon: Swords },
    ];

    const GenreIcon = ({ genre, size = 20, className = "" }: { genre: any, size?: number, className?: string }) => {
        const Icon = genre.icon;
        return <Icon size={size} className={className} />;
    };

    const GenrePopup = ({ genre, onClose }: { genre: any, onClose: () => void }) => {
        const [type, setType] = useState<'movie' | 'tv'>('movie');
        const [items, setItems] = useState<any[]>([]);
        const [page, setPage] = useState(1);
        const [loading, setLoading] = useState(false);
        const [hasMore, setHasMore] = useState(true);

        const fetchItems = async (p: number, currentType: 'movie' | 'tv', isMounted: { current: boolean }) => {
            if (loading && p !== 1) return;
            setLoading(true);
            try {
                if (p === 1) {
                    const resp1 = await tmdb.discoverByGenre(currentType, genre.id, 1);
                    if (!isMounted.current) return;

                    const items1 = resp1.results || [];
                    setItems(items1);

                    // Background pre-fetch of next pages
                    (async () => {
                        try {
                            const [r2, r3] = await Promise.all([
                                tmdb.discoverByGenre(currentType, genre.id, 2),
                                tmdb.discoverByGenre(currentType, genre.id, 3)
                            ]);
                            if (!isMounted.current) return;

                            const more = [...(r2.results || []), ...(r3.results || [])];
                            if (more.length > 0) {
                                setItems(prev => {
                                    const combined = [...prev, ...more];
                                    return combined.filter((item, index, self) =>
                                        self.findIndex(t => t.id === item.id) === index
                                    );
                                });
                            }
                        } catch (e) { }
                    })();
                } else {
                    const pagesToFetch = [p * 3 - 2, p * 3 - 1, p * 3];
                    const responses = await Promise.all(pagesToFetch.map(pageNum => tmdb.discoverByGenre(currentType, genre.id, pageNum)));
                    if (!isMounted.current) return;

                    const newItems = responses.flatMap(r => r.results || []);
                    if (newItems.length === 0) setHasMore(false);
                    else setItems(prev => [...prev, ...newItems]);
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };

        const isMounted = useRef(true);

        useEffect(() => {
            isMounted.current = true;
            setItems([]);
            setPage(1);
            setHasMore(true);
            fetchItems(1, type, isMounted);
            return () => { isMounted.current = false; };
        }, [type, genre]);

        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop <= clientHeight + 100 && !loading && hasMore) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchItems(nextPage, type, isMounted);
            }
        };

        return (
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
                className="fixed inset-4 z-[150] bg-neutral-900 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col overflow-hidden"
            >
                <div className="flex-shrink-0 p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white/10 border border-white/10">
                            <GenreIcon genre={genre} size={24} className="text-white" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white">{genre.name}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-white active:scale-95 transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-shrink-0 p-4 flex justify-center">
                    <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                        <button
                            onClick={() => setType('movie')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${type === 'movie' ? 'bg-white text-black' : 'text-white/50'}`}
                        >
                            FILMES
                        </button>
                        <button
                            onClick={() => setType('tv')}
                            className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${type === 'tv' ? 'bg-white text-black' : 'text-white/50'}`}
                        >
                            SÉRIES
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar" onScroll={handleScroll}>
                    <div className="grid grid-cols-3 gap-3">
                        {items.length === 0 && loading ? (
                            [...Array(12)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="aspect-[2/3] w-full bg-white/5 rounded-2xl border border-white/5" />
                                    <div className="mt-2 h-4 bg-white/5 rounded-lg w-3/4 mx-auto" />
                                </div>
                            ))
                        ) : (
                            items.map((item: any) => (
                                <MediaCard
                                    key={item.id}
                                    id={item.id}
                                    title={item.original_name || item.original_title || item.name || item.title}
                                    posterPath={item.poster_path}
                                    rating={item.vote_average}
                                    type={type}
                                    year={item.release_date || item.first_air_date}
                                    disableSwipe={true}
                                    showAddButton={true}
                                />
                            ))
                        )}
                    </div>
                    {loading && items.length > 0 && (
                        <div className="py-10 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    // Focus input on open and prevent background scroll
    useEffect(() => {
        if (isOpen) {
            // Lock body scroll
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';

            const timer = setTimeout(() => {
                const input = document.getElementById('search-input-overlay');
                if (input) input.focus();
            }, 300);
            return () => {
                clearTimeout(timer);
                document.body.style.overflow = '';
                document.body.style.overscrollBehavior = '';
            };
        } else {
            setQuery('');
            setResults([]);
            document.body.style.overflow = '';
            document.body.style.overscrollBehavior = '';
        }
    }, [isOpen]);

    // Categories to display when not searching (state already defined above)

    useEffect(() => {
        if (!isOpen) return;
        const fetchCategories = async () => {
            setCategoriesLoading(true);
            try {
                // 1. Fetch first pages immediately for instant open
                const [m1, s1] = await Promise.all([
                    tmdb.getTrendingMovies(1),
                    tmdb.getTrendingSeries(1)
                ]);

                const trendingMovies = m1.results || [];
                const trendingSeries = s1.results || [];
                setPopularMovies(trendingMovies);
                setPopularSeries(trendingSeries);
                setCategoriesLoading(false);

                const watchlistIds = watchlist.map(i => i.id);
                const watchedMovieIds = getTrackedMovieIds();
                const watchedSeriesIds = getTrackedSeriesIds();
                const allDoneIds = new Set([...watchlistIds, ...watchedMovieIds, ...watchedSeriesIds]);

                // --- RECOMMENDED MOVIES ---
                const movieFavs = favorites.filter(f => f.type === 'movie');
                let allMovieRecs: any[] = [];

                if (movieFavs.length > 0) {
                    const randomFavs = [...movieFavs].sort(() => 0.5 - Math.random()).slice(0, 2);
                    for (const fav of randomFavs) {
                        const details = await tmdb.getDetails(fav.id, 'movie');
                        if (details?.recommendations?.results) allMovieRecs.push(...details.recommendations.results);
                    }
                }

                // Fallback to trending
                if (allMovieRecs.length < 10) allMovieRecs.push(...trendingMovies);

                setRecommendedMovies(allMovieRecs
                    .filter((r: any, idx, self) => !allDoneIds.has(r.id) && self.findIndex(t => t.id === r.id) === idx)
                    .slice(0, 20)
                );

                // --- RECOMMENDED SERIES ---
                const tvFavs = favorites.filter(f => f.type === 'tv');
                let allSeriesRecs: any[] = [];

                if (tvFavs.length > 0) {
                    const randomFavs = [...tvFavs].sort(() => 0.5 - Math.random()).slice(0, 2);
                    for (const fav of randomFavs) {
                        const details = await tmdb.getDetails(fav.id, 'tv');
                        if (details?.recommendations?.results) allSeriesRecs.push(...details.recommendations.results);
                    }
                }

                // Fallback to trending
                if (allSeriesRecs.length < 10) allSeriesRecs.push(...trendingSeries);

                setRecommendedSeries(allSeriesRecs
                    .filter((r: any, idx, self) => !allDoneIds.has(r.id) && self.findIndex(t => t.id === r.id) === idx)
                    .slice(0, 20)
                );

                // 2. Fetch additional pages in background without blocking
                (async () => {
                    try {
                        const [mRest, sRest] = await Promise.all([
                            Promise.all([2, 3, 4, 5].map(p => tmdb.getTrendingMovies(p))),
                            Promise.all([2, 3, 4, 5].map(p => tmdb.getTrendingSeries(p)))
                        ]);
                        const allMovies = [...trendingMovies, ...mRest.flatMap(r => r.results || [])];
                        const allSeries = [...trendingSeries, ...sRest.flatMap(r => r.results || [])];
                        setPopularMovies(allMovies);
                        setPopularSeries(allSeries);
                    } catch (e) { }
                })();
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchCategories();
    }, [isOpen, favorites]);

    useEffect(() => {
        if (!isOpen) return;
        const delayDebounce = setTimeout(async () => {
            if (query.trim()) {
                setLoading(true);
                try {
                    // 1. Fetch first page immediately for perceived speed
                    const firstResponse = await tmdb.search(query, 'multi', 1);
                    const firstResults = (firstResponse.results || []).filter((r: any) => !!r.poster_path || !!r.profile_path);
                    setResults(firstResults);

                    // 2. Fetch more pages in the background
                    const morePages = [2, 3, 4, 5];
                    const responses = await Promise.all(morePages.map(p => tmdb.search(query, 'multi', p)));
                    const additionalResults = responses.flatMap(r => r.results || []).filter((r: any) => !!r.poster_path || !!r.profile_path);

                    if (additionalResults.length > 0) {
                        setResults(prev => {
                            const combined = [...prev, ...additionalResults];
                            // Filter unique IDs
                            return combined.filter((item, index, self) =>
                                self.findIndex(t => t.id === item.id) === index
                            );
                        });
                    }
                } catch (error) {
                    console.error(error);
                }
                setLoading(false);
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [query, isOpen]);

    const close = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('search');
        router.push(window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
    };

    // Close on Esc
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) close();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen]);

    const SkeletonCard = () => (
        <div className="flex-shrink-0 w-[140px] space-y-3 animate-pulse">
            <div className="aspect-[2/3] w-full bg-white/5 rounded-2xl border border-white/5" />
            <div className="space-y-2 px-1 pb-4">
                <div className="h-4 bg-white/5 rounded-lg w-3/4" />
                <div className="h-3 bg-white/5 rounded-lg w-1/2" />
            </div>
        </div>
    );

    const ScrollSection = ({ title, items, type, icon: Icon, isLoading }: { title: string, items: any[], type: 'movie' | 'tv', icon?: any, isLoading?: boolean }) => (
        <div className="mb-0">
            <h2 className="text-[15px] font-black text-white mb-3 px-1 flex items-center gap-2 uppercase tracking-widest">
                {Icon && <Icon size={18} className="text-white" />}
                {title}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-0 -mx-5 px-5 no-scrollbar">
                {isLoading ? (
                    [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
                ) : (
                    items.map((item: any) => (
                        <div key={item.id} className="flex-shrink-0 w-[140px]">
                            <MediaCard
                                id={item.id}
                                title={item.original_name || item.original_title || item.name || item.title}
                                posterPath={item.poster_path}
                                rating={item.vote_average}
                                type={type}
                                year={item.release_date || item.first_air_date}
                                disableSwipe={true}
                                showAddButton={true}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%', opacity: 0.5 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0.5 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-lg flex flex-col will-change-transform overflow-hidden"
                >
                    {/* Fixed Search Header */}
                    <div className="flex-shrink-0 z-[110] px-5 pt-[60px] pb-6 bg-black/40 border-b border-white/5">
                        <div className="max-w-2xl mx-auto flex items-center gap-3">
                            <div className="flex-1 flex items-center rounded-full px-5 py-3.5 shadow-2xl border border-white/20 bg-white/10 backdrop-blur-md">
                                <SearchIcon size={20} className="text-white" strokeWidth={3} />
                                <input
                                    id="search-input-overlay"
                                    type="text"
                                    placeholder="Séries, filmes, atores..."
                                    className="ml-3 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-white/40 font-black"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                            <Link
                                href="/settings"
                                onClick={close}
                                className="h-[54px] w-[54px] flex items-center justify-center rounded-full text-white active:scale-95 shadow-2xl border border-white/20 bg-white/10 backdrop-blur-md flex-shrink-0"
                            >
                                <User size={22} strokeWidth={2.5} />
                            </Link>
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div
                        className="flex-1 overflow-y-auto no-scrollbar"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) close();
                        }}
                    >
                        <div className="max-w-2xl mx-auto px-5 py-3 pb-[100px]">
                            <AnimatePresence mode="wait">
                                {query ? (
                                    <div
                                        key="search-results"
                                        className="grid grid-cols-3 gap-x-3 gap-y-6 animate-fade-in"
                                    >
                                        {results.slice(0, 45).map((item: any) => (
                                            <div key={item.id}>
                                                {item.media_type === 'person' ? (
                                                    <div
                                                        className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                                                        onClick={() => {
                                                            const params = new URLSearchParams(searchParams.toString());
                                                            params.set('personId', item.id.toString());
                                                            router.push(window.location.pathname + '?' + params.toString(), { scroll: false });
                                                        }}
                                                    >
                                                        <div className="relative aspect-square w-full rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-neutral-900">
                                                            {item.profile_path ? (
                                                                <img
                                                                    src={getImageUrl(item.profile_path, 'small')!}
                                                                    alt={item.name}
                                                                    className="absolute inset-0 h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-neutral-600">
                                                                    <User size={32} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-xs font-black text-white text-center line-clamp-2 uppercase tracking-tight">{item.name}</span>
                                                    </div>
                                                ) : (
                                                    <MediaCard
                                                        id={item.id}
                                                        title={item.original_name || item.original_title || item.name || item.title}
                                                        posterPath={item.poster_path}
                                                        rating={item.vote_average}
                                                        type={item.media_type === 'tv' ? 'tv' : 'movie'}
                                                        year={item.release_date || item.first_air_date}
                                                        disableSwipe={true}
                                                        showAddButton={true}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <motion.div
                                        key="categories"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-0"
                                    >
                                        <div className="mb-2">
                                            <h2 className="text-[15px] font-black text-white mb-4 px-1 flex items-center gap-2 uppercase tracking-widest">
                                                Pesquisar por Género
                                            </h2>
                                            <div className="grid grid-cols-4 gap-2">
                                                {genres.map(g => (
                                                    <button
                                                        key={g.id}
                                                        onClick={() => setSelectedGenre(g)}
                                                        className="flex flex-col items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all active:scale-95"
                                                    >
                                                        <GenreIcon genre={g} size={20} className="text-white" />
                                                        <span className="text-[11px] font-black uppercase text-white tracking-tight text-center px-1 leading-tight">{g.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="pt-8">
                                            <ScrollSection title="Séries Populares" items={popularSeries} type="tv" icon={Tv} isLoading={categoriesLoading} />
                                        </div>
                                        <ScrollSection title="Filmes Populares" items={popularMovies} type="movie" icon={Clapperboard} isLoading={categoriesLoading} />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {query && results.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center pt-20 text-neutral-600">
                                    <p className="mt-4 text-sm font-medium">Nenhum resultado encontrado para "{query}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <AnimatePresence>
                        {selectedGenre && (
                            <GenrePopup
                                genre={selectedGenre}
                                onClose={() => setSelectedGenre(null)}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
