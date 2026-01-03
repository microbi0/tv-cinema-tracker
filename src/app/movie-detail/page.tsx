'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { tmdb, getImageUrl } from '@/lib/tmdb';
import { ChevronLeft, Star, Play, Plus, Check, X, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTracking } from '@/hooks/useTracking';
import Image from 'next/image';
import CastSlider from '@/components/CastSlider';
import { usePalette } from '@/hooks/usePalette';
import TrailerPlayer from '@/components/TrailerPlayer';

function MovieDetailsContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [expanded, setExpanded] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const synopsisRef = useRef<HTMLParagraphElement>(null);
    const { isMovieWatched, toggleMovie, toggleWatchlist, isInWatchlist, toggleFavorite, isFavorite } = useTracking();
    const inWatchlist = isInWatchlist(Number(id), 'movie');
    const favorite = isFavorite(Number(id), 'movie');

    // Choose a better backdrop if available
    const backdrops = data?.images?.backdrops || [];
    const bestBackdrop = backdrops.length > 1 ? backdrops[1].file_path : data?.backdrop_path;

    const palette = usePalette(data ? getImageUrl(bestBackdrop, 'small') : null);
    const [showTrailer, setShowTrailer] = useState(false);

    const trailer = data?.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

    useEffect(() => {
        if (id) {
            tmdb.getDetailsCached(Number(id), 'movie').then(setData);
        }
    }, [id]);

    useEffect(() => {
        if (synopsisRef.current) {
            const { scrollHeight, clientHeight } = synopsisRef.current;
            setIsTruncated(scrollHeight > clientHeight);
        }
    }, [data, expanded]);

    if (!data) return <div className="flex h-screen items-center justify-center">A carregar...</div>;

    const watched = isMovieWatched(Number(id));



    const formatRuntime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}min`;
    };

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
                        alt={data.original_title || data.title}
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
                        {data.original_title || data.title}
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
                        <span className="text-sm font-bold transition-colors" style={{ color: palette.hex }}>{data.release_date.split('-')[0]}</span>
                        {data.runtime && (
                            <>
                                <span className="text-neutral-500 text-xs">•</span>
                                <span className="text-sm font-bold transition-colors" style={{ color: palette.hex }}>{formatRuntime(data.runtime)}</span>
                            </>
                        )}
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
                        className="flex flex-col gap-4 mb-8"
                    >
                        <div className="flex gap-4">
                            {watched && (
                                <button
                                    onClick={() => toggleFavorite(Number(id), 'movie')}
                                    className="flex h-14 w-14 items-center justify-center rounded-2xl active:scale-95 transition-transform text-white px-1"
                                >
                                    <Star size={28} fill={favorite ? palette.hex : "none"} color={favorite ? palette.hex : "currentColor"} />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    toggleMovie(Number(id));
                                    if (!watched && !inWatchlist) {
                                        toggleWatchlist(Number(id), 'movie');
                                    }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-bold active:scale-95 transition-transform border text-sm ${watched ? '' : 'glass border-white/20 text-white'
                                    }`}
                                style={watched ? { backgroundColor: palette.hex, borderColor: palette.hex, color: palette.contrast } : {}}
                            >
                                {watched ? <RotateCcw size={20} color={palette.contrast} /> : <Check size={20} />}
                                {watched ? 'Não visto' : 'Visto'}
                            </button>
                            <button
                                onClick={() => toggleWatchlist(Number(id), 'movie')}
                                className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-bold active:scale-95 transition-transform border text-sm ${inWatchlist ? '' : 'glass border-white/20 text-white'
                                    }`}
                                style={inWatchlist ? { backgroundColor: palette.hex, borderColor: palette.hex, color: palette.contrast } : {}}
                            >
                                {inWatchlist ? <X size={20} color={palette.contrast} /> : <Plus size={20} />}
                                {inWatchlist ? 'Remover' : 'Adicionar'}
                            </button>
                        </div>
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
                        className="mb-4 mt-2"
                    >
                        {(() => {
                            const director = data.credits?.crew?.find((person: any) => person.job === 'Director');
                            return director && (
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Realizado por</span>
                                    <span className="text-sm font-bold text-white transition-colors">{director.name}</span>
                                </div>
                            );
                        })()}
                    </motion.div>


                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
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
                        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-10"
                    >
                        <CastSlider cast={data.credits?.cast || []} accentColor={palette.hex} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-12"
                    >
                        <h2 className="text-xl font-bold mb-6 tracking-normal" style={{ color: palette.hex }}>Ficha Técnica</h2>
                        <div className="glass rounded-[32px] p-6 border border-white/10">
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Status</p>
                                    <p className="text-sm font-bold text-neutral-300">
                                        {data.status === 'Released' ? 'Lançado' :
                                            data.status === 'Post Production' ? 'Pós-Produção' :
                                                data.status === 'In Production' ? 'Em Produção' : data.status}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Idioma Original</p>
                                    <p className="text-sm font-bold text-neutral-300 uppercase">{data.original_language}</p>
                                </div>
                                {data.budget > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Orçamento</p>
                                        <p className="text-sm font-bold text-neutral-300">
                                            ${(data.budget / 1000000).toFixed(1)}M
                                        </p>
                                    </div>
                                )}
                                {data.revenue > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Receita</p>
                                        <p className="text-sm font-bold text-neutral-300">
                                            ${(data.revenue / 1000000).toFixed(1)}M
                                        </p>
                                    </div>
                                )}
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
            </div >

            <TrailerPlayer
                videoKey={showTrailer ? trailer?.key : null}
                onClose={() => setShowTrailer(false)}
            />
        </div >
    );
}

export default function MovieDetails() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">A carregar...</div>}>
            <MovieDetailsContent />
        </Suspense>
    );
}
