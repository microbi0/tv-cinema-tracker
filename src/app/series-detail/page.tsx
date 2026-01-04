'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { tmdb, getImageUrl } from '@/lib/tmdb';
import { Star, Play, Pause, ChevronDown, Check, RotateCcw, Plus, X, Heart, Info, MonitorPlay, XCircle, Circle, CheckCircle2, MessageSquare, User as UserIcon, Star as StarIcon, TvMinimalPlay, UsersRound, Library, Video, Database, Activity, Globe, Building2, Monitor, Layers, List, Network, Newspaper, Copy, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTracking } from '@/hooks/useTracking';
import Image from 'next/image';
import CastSlider from '@/components/CastSlider';
import { usePalette } from '@/hooks/usePalette';
import TrailerPlayer from '@/components/TrailerPlayer';
import CompletionOverlay from '@/components/CompletionOverlay';
import NewsSection from '@/components/NewsSection';
import RelatedMedia from '@/components/RelatedMedia';

function SeriesDetailsContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const activeSeasonRef = useRef<HTMLButtonElement>(null);
    const [seasonData, setSeasonData] = useState<any>(null);
    const [expanded, setExpanded] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const synopsisRef = useRef<HTMLParagraphElement>(null);
    const [selectedReview, setSelectedReview] = useState<any>(null);
    const [seasonInitialized, setSeasonInitialized] = useState(false);
    const { isEpisodeWatched, toggleEpisode, toggleSeriesWatched, toggleWatchlist, isInWatchlist, getNextEpisode, watched, trackingLoading, toggleFavorite, isFavorite, toggleDropped, isDropped } = useTracking();
    const inWatchlist = isInWatchlist(Number(id), 'tv');
    const favorite = isFavorite(Number(id), 'tv');
    const abandoned = isDropped(Number(id));

    // Choose a better backdrop if available (secondary backdrops are often more artistic)
    const backdrops = data?.images?.backdrops || [];
    const bestBackdrop = backdrops.length > 1 ? backdrops[1].file_path : data?.backdrop_path;

    const palette = usePalette(data ? getImageUrl(bestBackdrop, 'small') : null);
    const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
    const [showCompletion, setShowCompletion] = useState(false);

    const trailer = data?.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

    useEffect(() => {
        if (id) {
            tmdb.getDetailsCached(Number(id), 'tv').then((res) => {
                setData(res);
                setSeasonInitialized(false); // Reset for new series
            });
        }
    }, [id]);

    // Auto-select season based on progress
    useEffect(() => {
        if (data && !seasonInitialized && !trackingLoading) {
            const next = getNextEpisode(Number(id), data.seasons);
            if (next) {
                setSelectedSeason(next.season);
                setSeasonInitialized(true);
            } else if (data.seasons && data.seasons.length > 0) {
                // If finished or no next episode found, default to first available season
                const firstSeason = data.seasons.find((s: any) => s.season_number > 0);
                if (firstSeason) {
                    setSelectedSeason(firstSeason.season_number);
                    setSeasonInitialized(true);
                }
            }
        }
    }, [data, trackingLoading, watched, id, getNextEpisode, seasonInitialized]);

    useEffect(() => {
        if (activeSeasonRef.current) {
            activeSeasonRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedSeason, seasonData]); // Scroll when season or its data changes

    useEffect(() => {
        if (id && selectedSeason) {
            tmdb.getSeasonCached(Number(id), selectedSeason).then(setSeasonData);
        }
    }, [id, selectedSeason]);

    useEffect(() => {
        if (synopsisRef.current) {
            const { scrollHeight, clientHeight } = synopsisRef.current;
            setIsTruncated(scrollHeight > clientHeight);
        }
    }, [data, expanded]);

    if (!data) return <div className="flex h-screen items-center justify-center">A carregar...</div>;

    const isFinished = getNextEpisode(Number(id), data.seasons) === null;

    const getSynopsis = () => {
        if (!data) return '';
        const translations = data.translations?.translations || [];

        // 1. Try pt-PT
        const ptPT = translations.find((t: any) => t.iso_639_1 === 'pt' && t.iso_3166_1 === 'PT');
        if (ptPT?.data?.overview) return ptPT.data.overview;

        // 2. Try pt-BR
        const ptBR = translations.find((t: any) => t.iso_639_1 === 'pt' && t.iso_3166_1 === 'BR');
        if (ptBR?.data?.overview) return ptBR.data.overview;

        // 3. Default overview (fetched with pt-PT usually)
        if (data.overview) return data.overview;

        // 4. Try English as final fallback
        const en = translations.find((t: any) => t.iso_639_1 === 'en');
        if (en?.data?.overview) return en.data.overview;

        return data.overview;
    };

    const getLogoPath = (item: any) => {
        return item.images?.logos?.find((l: any) => l.iso_639_1 === 'en' || l.iso_639_1 === null || l.iso_639_1 === 'pt')?.file_path
            || item.images?.logos?.[0]?.file_path;
    };

    const logoPath = data ? getLogoPath(data) : null;

    return (
        <div
            className="relative h-auto overflow-x-hidden max-w-[100vw]"
            style={{
                '--accent-color': palette.hex,
                '--accent-rgb': palette.rgb
            } as any}
        >
            {/* Atmospheric Background */}
            <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none">
                {getImageUrl(bestBackdrop, 'original') && (
                    <Image
                        src={getImageUrl(bestBackdrop, 'original')!}
                        alt=""
                        fill
                        className="object-cover object-center opacity-30 blur-[100px] scale-150"
                        priority
                    />
                )}
                <div className="absolute inset-0 bg-black/40" />
            </div>

            <div className="relative z-10 h-[40vh] w-full overflow-hidden">
                {getImageUrl(bestBackdrop, 'original') && (
                    <Image
                        src={getImageUrl(bestBackdrop, 'original')!}
                        alt={data.original_name || data.name}
                        fill
                        className="object-cover object-center [mask-image:linear-gradient(to_top,transparent_0%,transparent_5%,black_70%,black_100%)]"
                        priority
                    />
                )}
                <div className="absolute inset-0 flex items-center justify-start px-5">
                    <button
                        onClick={() => setActiveVideoKey(trailer?.key || null)}
                        className="h-20 w-20 flex items-center justify-center rounded-full glass border border-white/20 active:scale-95 transition-transform shadow-2xl backdrop-blur-md"
                    >
                        <Play size={32} fill="white" color="white" className="ml-1" />
                    </button>
                </div>
            </div>

            <div className="relative z-20 px-5 -mt-16">
                <div className="max-w-4xl mx-auto">
                    {logoPath ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 40 }}
                            className="mb-4 h-24 md:h-32 flex items-center max-w-[65%]"
                        >
                            <img
                                src={getImageUrl(logoPath, 'large') || ''}
                                alt={data.original_name || data.name}
                                className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
                            />
                        </motion.div>
                    ) : (
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 40, mass: 1 }}
                            className="text-5xl font-black text-white mb-2 leading-tight tracking-normal will-change-gpu"
                        >
                            {data.original_name || data.name}
                        </motion.h1>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 450, damping: 35, delay: 0.05 }}
                        className="flex items-center gap-3 mb-6 will-change-gpu"
                    >
                        <div className="flex items-center gap-1">
                            <Star size={14} fill={palette.hex} color={palette.hex} />
                            <span className="text-sm font-bold text-white">{data.vote_average.toFixed(1)}</span>
                        </div>
                        <span className="text-neutral-500 text-xs">•</span>
                        <span className="text-sm font-bold transition-colors" style={{ color: palette.hex }}>{data.first_air_date?.split('-')[0]}</span>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                        className="flex flex-wrap gap-2 mb-8 will-change-gpu"
                    >
                        {data.genres.map((g: any) => (
                            <span key={g.id} className="glass rounded-full px-4 py-1.5 text-xs font-semibold text-neutral-300">
                                {g.name}
                            </span>
                        ))}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="flex gap-4 mb-8"
                    >
                        <button
                            onClick={() => toggleFavorite(Number(id), 'tv')}
                            className="flex h-14 w-14 items-center justify-center rounded-2xl active:scale-95 transition-transform text-white px-1"
                        >
                            <Star size={28} fill={favorite ? palette.hex : "none"} color={favorite ? palette.hex : "currentColor"} />
                        </button>

                        <button
                            onClick={() => {
                                if (!isFinished) {
                                    toggleDropped(Number(id));
                                } else {
                                    toggleSeriesWatched(Number(id), data.seasons);
                                }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-bold active:scale-95 transition-transform border text-sm ${isFinished || abandoned ? '' : 'glass border-white/20 text-white'
                                }`}
                            style={isFinished || abandoned ? { backgroundColor: palette.hex, borderColor: palette.hex, color: palette.contrast } : {}}
                        >
                            {isFinished ? (
                                <>
                                    <RotateCcw size={20} color={palette.contrast} />
                                    Não visto
                                </>
                            ) : abandoned ? (
                                <>
                                    <Play size={20} color={palette.contrast} />
                                    Continuar a Ver
                                </>
                            ) : (
                                <>
                                    <XCircle size={20} />
                                    Parar de Ver
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => toggleWatchlist(Number(id), 'tv')}
                            className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-bold active:scale-95 transition-transform border text-sm ${inWatchlist ? '' : 'glass border-white/20 text-white'
                                }`}
                            style={inWatchlist ? { backgroundColor: palette.hex, borderColor: palette.hex, color: palette.contrast } : {}}
                        >
                            {inWatchlist ? <X size={20} color={palette.contrast} /> : <Plus size={20} />}
                            {inWatchlist ? 'Remover' : 'Adicionar'}
                        </button>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="relative mb-8"
                    >
                        <p
                            ref={synopsisRef}
                            onClick={() => isTruncated && setExpanded(!expanded)}
                            className={`text-neutral-400 text-sm leading-relaxed transition-all duration-500 cursor-pointer ${!expanded ? 'line-clamp-3 [mask-image:linear-gradient(180deg,black_60%,transparent_100%)]' : ''}`}
                        >
                            {getSynopsis()}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-8 mt-2"
                    >
                        {data.created_by?.length > 0 && (
                            <div className="flex items-center gap-2 px-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Criado por</span>
                                <span className="text-sm font-bold text-white transition-colors">
                                    {data.created_by.map((c: any) => c.name).join(', ')}
                                </span>
                            </div>
                        )}
                    </motion.div>



                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        <h2 className="text-xl font-black mb-4 px-2 flex items-center gap-2" style={{ color: palette.hex }}>
                            <Library size={22} /> Temporadas
                        </h2>
                        <div className="glass rounded-[32px] overflow-hidden">
                            <div className="pt-4 px-4">
                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                    {data.seasons.filter((s: any) => s.season_number > 0).map((s: any) => (
                                        <button
                                            key={s.id}
                                            ref={selectedSeason === s.season_number ? activeSeasonRef : null}
                                            onClick={() => setSelectedSeason(s.season_number)}
                                            className={`flex-shrink-0 h-10 w-10 rounded-full font-bold transition-all text-sm flex items-center justify-center ${selectedSeason === s.season_number
                                                ? ''
                                                : 'bg-white/5 text-neutral-400'
                                                }`}
                                            style={selectedSeason === s.season_number ? {
                                                backgroundColor: palette.hex,
                                                color: palette.contrast,
                                            } : {}}
                                        >
                                            {s.season_number}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="px-2 pb-2 pt-1 space-y-1">
                                {seasonData && seasonData.episodes ? (
                                    seasonData.episodes.map((ep: any) => {
                                        const isWatched = isEpisodeWatched(Number(id), selectedSeason, ep.episode_number);
                                        const airDate = ep.air_date ? new Date(ep.air_date) : null;
                                        const isFuture = airDate ? airDate.getTime() > Date.now() : false;
                                        const formattedDate = airDate ? airDate.toLocaleDateString('pt-PT') : '';

                                        return (
                                            <motion.div
                                                key={ep.id}
                                                className={`flex items-center gap-4 rounded-2xl p-3 transition-colors ${isFuture ? 'pointer-events-none' : 'active:bg-white/5 cursor-pointer'}`}
                                                whileTap={!isFuture ? { scale: 0.98 } : {}}
                                                onClick={() => {
                                                    if (isFuture) return;

                                                    // Toggle episode
                                                    toggleEpisode(Number(id), selectedSeason, ep.episode_number, data.seasons);

                                                    // Check if series is about to be finished
                                                    // Since toggleEpisode is async in terms of state, we check if this was the last unwatched one
                                                    const next = getNextEpisode(Number(id), data.seasons);
                                                    if (next && next.season === selectedSeason && next.episode === ep.episode_number) {
                                                        // This WAS the next episode. Now check if there's anything AFTER it.
                                                        const lastSeason = data.seasons.reduce((max: number, s: any) => Math.max(max, s.season_number), 0);
                                                        const lastSeasonData = data.seasons.find((s: any) => s.season_number === lastSeason);
                                                        const isAbsoluteLast = selectedSeason === lastSeason && ep.episode_number === lastSeasonData?.episode_count;

                                                        if (isAbsoluteLast && !isWatched) {
                                                            setShowCompletion(true);
                                                        }
                                                    }
                                                }}
                                            >
                                                <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-800">
                                                    {(() => {
                                                        const url = getImageUrl(ep.still_path, 'medium');
                                                        return url ? (
                                                            <Image
                                                                src={url}
                                                                alt={ep.name}
                                                                fill
                                                                className={`object-cover ${isWatched ? 'opacity-50' : ''}`}
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <Play size={16} className="text-neutral-600" />
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`truncate text-sm font-bold ${isWatched ? 'text-neutral-500 line-through' : 'text-white'}`}>
                                                        <span className="mr-2" style={{ color: palette.hex }}>{ep.episode_number.toString().padStart(2, '0')}</span>
                                                        <span className="font-normal">{ep.name}</span>
                                                    </h3>
                                                </div>
                                                <div className="flex-shrink-0 flex items-center justify-end min-w-[60px] p-1 transition-colors" style={{ color: isWatched ? palette.hex : 'rgb(82 82 82)' }}>
                                                    {isWatched ? (
                                                        <CheckCircle2 size={22} />
                                                    ) : isFuture ? (
                                                        <span className="text-[10px] font-bold text-neutral-500">{formattedDate}</span>
                                                    ) : (
                                                        <Circle size={22} />
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center text-neutral-500 text-sm">A carregar episódios...</div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        {(() => {
                            const providers = data['watch/providers']?.results?.PT;
                            const streamList = providers?.flatrate || providers?.ads;

                            if (!streamList || streamList.length === 0) return null;

                            return (
                                <div className="space-y-4 px-1">
                                    <h2 className="text-xl font-bold mb-4 px-0 flex items-center gap-2" style={{ color: palette.hex }}>
                                        <TvMinimalPlay size={22} /> Onde ver
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        {streamList.map((provider: any) => {
                                            const logoUrl = getImageUrl(provider.logo_path, 'small');
                                            return logoUrl ? (
                                                <div key={provider.provider_id} className="relative h-14 w-14 overflow-hidden rounded-xl shadow-lg border border-white/10">
                                                    <Image
                                                        src={logoUrl}
                                                        alt={provider.provider_name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        <h2 className="text-xl font-bold mb-4 px-1 flex items-center gap-2" style={{ color: palette.hex }}>
                            <UsersRound size={22} /> Elenco
                        </h2>
                        <CastSlider cast={data.credits?.cast || []} accentColor={palette.hex} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        {data.videos?.results?.filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser' || v.type === 'Featurette')).length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold px-1 flex items-center gap-2" style={{ color: palette.hex }}>
                                    <Video size={22} /> Trailers e Teasers
                                </h2>
                                <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 no-scrollbar">
                                    {data.videos.results
                                        .filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser' || v.type === 'Featurette'))
                                        .map((video: any) => (
                                            <button
                                                key={video.id}
                                                onClick={() => setActiveVideoKey(video.key)}
                                                className="flex-shrink-0 w-[240px] group"
                                            >
                                                <div className="relative aspect-video w-full rounded-2xl overflow-hidden glass border border-white/10 mb-2">
                                                    <img
                                                        src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                                                        alt={video.name}
                                                        className="h-full <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number transition-transform duration-500 group-active:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-colors group-active:bg-black/40">
                                                        <div className="h-10 w-10 flex items-center justify-center rounded-full glass border border-white/20">
                                                            <Play size={16} fill="white" color="white" className="ml-0.5" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-bold text-neutral-300 truncate text-left px-1">{video.name}</p>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-neutral-600 text-left px-1 mt-0.5">{video.type}</p>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        {(data.reviews?.results?.length ?? 0) > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold px-1 flex items-center gap-2" style={{ color: palette.hex }}>
                                    <MessageSquare size={20} /> Críticas
                                </h2>
                                <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 no-scrollbar">
                                    {data.reviews.results.map((review: any) => (
                                        <button
                                            key={review.id}
                                            onClick={() => setSelectedReview(review)}
                                            className="flex-shrink-0 w-[280px] glass rounded-[28px] p-6 border border-white/5 text-left active:scale-95 transition-all flex flex-col gap-4"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                                    {review.author_details?.avatar_path ? (
                                                        <img
                                                            src={review.author_details.avatar_path.startsWith('http') ? review.author_details.avatar_path : getImageUrl(review.author_details.avatar_path, 'small')!}
                                                            alt={review.author}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <UserIcon size={14} className="text-neutral-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-white truncate">{review.author}</p>
                                                    {review.author_details?.rating && (
                                                        <div className="flex items-center gap-0.5 mt-0.5">
                                                            <StarIcon size={8} fill={palette.hex} color={palette.hex} />
                                                            <span className="text-[10px] font-bold text-neutral-400">{review.author_details.rating}/10</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-neutral-400 font-medium line-clamp-5 leading-relaxed italic">
                                                "{review.content}"
                                            </p>
                                            <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-end">
                                                <span className="text-[10px] font-bold text-neutral-500 opacity-60">
                                                    {new Date(review.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        <RelatedMedia currentId={Number(id)} type="tv" data={data} accentColor={palette.hex} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        <NewsSection query={data.name} accentColor={palette.hex} />
                    </motion.div>


                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.95, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        <h2 className="text-xl font-bold mb-4 px-1 flex items-center gap-2" style={{ color: palette.hex }}>
                            <Database size={22} /> Ficha Técnica
                        </h2>
                        <div className="glass rounded-[32px] p-6 border border-white/10">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                {[
                                    ...(data.created_by || []).map((p: any) => ({ id: p.id, name: p.name, job: 'Creator' })),
                                    ...(data.credits?.crew || []).filter((p: any) => ['Executive Producer', 'Producer', 'Director', 'Writer'].includes(p.job))
                                ].slice(0, 10).map((member: any, idx: number) => (
                                    <div key={`${member.id}-${idx}`}>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: palette.hex }}>{member.job}</p>
                                        <p className="text-sm font-bold text-neutral-300">{member.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-12"
                    >
                        <h2 className="text-xl font-bold mb-6 tracking-normal flex items-center gap-2 w-full text-left px-1" style={{ color: palette.hex }}>
                            <Info size={22} /> Informações Adicionais
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div
                                className={`rounded-3xl p-5 border flex items-center gap-4 transition-colors duration-500 ${data.status === 'Returning Series' ? 'bg-green-500/10 border-green-500/20' :
                                    (data.status === 'Ended' || data.status === 'Canceled') ? 'bg-red-500/10 border-red-500/20' :
                                        'bg-orange-500/10 border-orange-500/20'
                                    }`}
                            >
                                <Activity size={20} style={{ color: palette.hex }} strokeWidth={2.5} />
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: palette.hex }}>Status</p>
                                    <p className={`text-sm font-bold transition-colors duration-500 ${data.status === 'Returning Series' ? 'text-green-400' :
                                        (data.status === 'Ended' || data.status === 'Canceled') ? 'text-red-400' :
                                            'text-orange-400'
                                        }`}>
                                        {data.status === 'Returning Series' ? 'Em Exibição' :
                                            data.status === 'Ended' ? 'Terminada' :
                                                data.status === 'Canceled' ? 'Cancelada' : data.status}
                                    </p>
                                </div>
                            </div>
                            <div className="glass rounded-3xl p-5 border border-white/10 flex items-center gap-4">
                                <Monitor size={20} style={{ color: palette.hex }} strokeWidth={2.5} />
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: palette.hex }}>Tipo</p>
                                    <p className="text-sm font-bold text-neutral-300">{data.type || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="glass rounded-3xl p-5 border border-white/10 flex items-center gap-4">
                                <Globe size={20} style={{ color: palette.hex }} strokeWidth={2.5} />
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: palette.hex }}>Idioma Original</p>
                                    <p className="text-sm font-bold text-neutral-300 uppercase">{data.original_language}</p>
                                </div>
                            </div>
                            {data.networks?.length > 0 && (
                                <div className="glass rounded-3xl p-5 border border-white/10 flex items-center gap-4">
                                    <Network size={20} style={{ color: palette.hex }} strokeWidth={2.5} />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: palette.hex }}>Canal/Rede</p>
                                        <p className="text-sm font-bold text-neutral-300 truncate">
                                            {data.networks.map((n: any) => n.name).join(', ')}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="glass rounded-3xl p-5 border border-white/10 flex items-center gap-4">
                                <List size={20} style={{ color: palette.hex }} strokeWidth={2.5} />
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: palette.hex }}>Episódios</p>
                                    <p className="text-sm font-bold text-neutral-300">{data.number_of_episodes}</p>
                                </div>
                            </div>
                            <div className="glass rounded-3xl p-5 border border-white/10 flex items-center gap-4">
                                <Layers size={20} style={{ color: palette.hex }} strokeWidth={2.5} />
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: palette.hex }}>Temporadas</p>
                                    <p className="text-sm font-bold text-neutral-300">{data.number_of_seasons}</p>
                                </div>
                            </div>
                            {data.production_companies?.length > 0 && (
                                <div className="col-span-2 glass rounded-3xl p-6 border border-white/10 flex flex-col gap-4">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={16} style={{ color: palette.hex }} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: palette.hex }}>Produção</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {data.production_companies.some((c: any) => c.logo_path) ? (
                                            data.production_companies.filter((c: any) => c.logo_path).map((company: any) => (
                                                <div key={company.id} className="bg-white/10 rounded-xl h-[75px] flex items-center justify-center px-4 transition-transform active:scale-95">
                                                    <img
                                                        src={getImageUrl(company.logo_path, 'logo') || ''}
                                                        alt={company.name}
                                                        className="max-h-12 max-w-full object-contain brightness-0 invert opacity-80"
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm font-bold text-neutral-300 truncate">
                                                {data.production_companies.map((c: any) => c.name).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                    <div className="h-[85px]" />
                </div>
            </div>

            {activeVideoKey && (
                <TrailerPlayer videoKey={activeVideoKey} onClose={() => setActiveVideoKey(null)} />
            )}

            <CompletionOverlay
                show={showCompletion}
                onClose={() => setShowCompletion(false)}
                title={data.original_name || data.name}
                accentColor={palette.hex}
            />

            <AnimatePresence>
                {selectedReview && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedReview(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg glass-dark border border-white/10 rounded-[40px] p-8 flex flex-col gap-6 max-h-[80vh] overflow-hidden"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                        {selectedReview.author_details?.avatar_path ? (
                                            <img
                                                src={getImageUrl(selectedReview.author_details.avatar_path, 'small')!}
                                                alt={selectedReview.author}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <UserIcon size={20} className="text-neutral-500" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white">{selectedReview.author}</h3>
                                        <div className="flex items-center gap-2">
                                            {selectedReview.author_details?.rating && (
                                                <div className="flex items-center gap-1">
                                                    <StarIcon size={12} fill={palette.hex} color={palette.hex} />
                                                    <span className="text-xs font-black text-white">{selectedReview.author_details.rating}/10</span>
                                                </div>
                                            )}
                                            <span className="text-xs font-bold text-neutral-500">
                                                {new Date(selectedReview.created_at).toLocaleDateString('pt-PT')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedReview(null)}
                                    className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-white active:scale-95 transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto pr-2 no-scrollbar">
                                <p className="text-base text-neutral-300 leading-relaxed font-medium italic">
                                    "{selectedReview.content}"
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <button
                                    onClick={() => setSelectedReview(null)}
                                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm active:scale-95 transition-all"
                                >
                                    Fechar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}

export default function SeriesDetails() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">A carregar...</div>}>
            <SeriesDetailsContent />
        </Suspense>
    );
}
