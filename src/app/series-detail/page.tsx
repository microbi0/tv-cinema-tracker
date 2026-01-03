'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { tmdb, getImageUrl } from '@/lib/tmdb';
import { Star, Play, Pause, ChevronDown, Check, RotateCcw, Plus, X, Heart, Info, MonitorPlay, XCircle, Circle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTracking } from '@/hooks/useTracking';
import Image from 'next/image';
import CastSlider from '@/components/CastSlider';
import { usePalette } from '@/hooks/usePalette';
import TrailerPlayer from '@/components/TrailerPlayer';
import CompletionOverlay from '@/components/CompletionOverlay';

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
    const [seasonInitialized, setSeasonInitialized] = useState(false);
    const { isEpisodeWatched, toggleEpisode, toggleSeriesWatched, toggleWatchlist, isInWatchlist, getNextEpisode, watched, trackingLoading, toggleFavorite, isFavorite, toggleDropped, isDropped } = useTracking();
    const inWatchlist = isInWatchlist(Number(id), 'tv');
    const favorite = isFavorite(Number(id), 'tv');
    const abandoned = isDropped(Number(id));

    // Choose a better backdrop if available (secondary backdrops are often more artistic)
    const backdrops = data?.images?.backdrops || [];
    const bestBackdrop = backdrops.length > 1 ? backdrops[1].file_path : data?.backdrop_path;

    const palette = usePalette(data ? getImageUrl(bestBackdrop, 'small') : null);
    const [showTrailer, setShowTrailer] = useState(false);
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
                        onClick={() => setShowTrailer(true)}
                        className="h-20 w-20 flex items-center justify-center rounded-full glass border border-white/20 active:scale-95 transition-transform shadow-2xl backdrop-blur-md"
                    >
                        <Play size={32} fill="white" color="white" className="ml-1" />
                    </button>
                </div>
            </div>

            <div className="relative z-20 px-5 -mt-16">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 40, mass: 1 }}
                        className="text-5xl font-black text-white mb-2 leading-tight tracking-normal will-change-gpu"
                    >
                        {data.original_name || data.name}
                    </motion.h1>

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
                        <h2 className="text-xl font-black mb-4 px-2" style={{ color: palette.hex }}>Temporadas</h2>
                        <div className="glass rounded-[32px] overflow-hidden">
                            <div className="pt-6 px-4 mb-2">
                                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                                    {data.seasons.filter((s: any) => s.season_number > 0).map((s: any) => (
                                        <button
                                            key={s.id}
                                            ref={selectedSeason === s.season_number ? activeSeasonRef : null}
                                            onClick={() => setSelectedSeason(s.season_number)}
                                            className={`flex-shrink-0 px-5 py-2 rounded-xl font-bold transition-all text-xs ${selectedSeason === s.season_number
                                                ? 'shadow-lg'
                                                : 'bg-white/5 text-neutral-400'
                                                }`}
                                            style={selectedSeason === s.season_number ? {
                                                backgroundColor: palette.hex,
                                                color: palette.contrast,
                                                boxShadow: `0 8px 16px -4px rgba(${palette.rgb}, 0.3)`
                                            } : {}}
                                        >
                                            {s.season_number}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-2 space-y-1">
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
                        transition={{ duration: 0.8, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        {(() => {
                            const providers = data['watch/providers']?.results?.PT;
                            const streamList = providers?.flatrate || providers?.ads;

                            if (!streamList || streamList.length === 0) return null;

                            return (
                                <div className="space-y-4 px-1">
                                    <h2 className="text-xl font-bold mb-4 px-0" style={{ color: palette.hex }}>Disponível em</h2>
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
                        transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        <CastSlider cast={data.credits?.cast || []} accentColor={palette.hex} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-12"
                    >
                        <h2 className="text-xl font-bold mb-6 tracking-normal" style={{ color: palette.hex }}>Ficha Técnica</h2>
                        <div className="glass rounded-[32px] p-6 border border-white/10">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Status</p>
                                    <p className="text-sm font-bold text-neutral-300">
                                        {data.status === 'Returning Series' ? 'Em Exibição' :
                                            data.status === 'Ended' ? 'Terminada' :
                                                data.status === 'Canceled' ? 'Cancelada' : data.status}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Tipo</p>
                                    <p className="text-sm font-bold text-neutral-300">{data.type || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Idioma Original</p>
                                    <p className="text-sm font-bold text-neutral-300 uppercase">{data.original_language}</p>
                                </div>
                                {data.networks?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Canal/Rede</p>
                                        <p className="text-sm font-bold text-neutral-300">
                                            {data.networks.map((n: any) => n.name).join(', ')}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Total de Episódios</p>
                                    <p className="text-sm font-bold text-neutral-300">{data.number_of_episodes}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Temporadas</p>
                                    <p className="text-sm font-bold text-neutral-300">{data.number_of_seasons}</p>
                                </div>
                                {data.production_companies?.length > 0 && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Produção</p>
                                        <p className="text-sm font-bold text-neutral-300 leading-relaxed">
                                            {data.production_companies.map((c: any) => c.name).join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                    <div className="h-[85px]" />
                </div>
            </div>

            {showTrailer && trailer && (
                <TrailerPlayer videoKey={trailer.key} onClose={() => setShowTrailer(false)} />
            )}

            <CompletionOverlay
                show={showCompletion}
                onClose={() => setShowCompletion(false)}
                title={data.original_name || data.name}
                accentColor={palette.hex}
            />
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
