'use client';

import { useState, memo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { getImageUrl } from '@/lib/tmdb';
import { Check, PauseCircle, Pause, Sparkles } from 'lucide-react';
import { useTracking } from '@/hooks/useTracking';
import { usePalette } from '@/hooks/usePalette';
import CompletionOverlay from './CompletionOverlay';
import confetti from 'canvas-confetti';

interface HorizontalSeriesCardProps {
    id: number;
    name: string;
    posterPath?: string;
    backdropPath?: string;
    nextEpisode?: { season: number, episode: number } | null;
    episodeDetails?: { name: string, airDate: string, s: number, e: number } | null;
    isFinished?: boolean;
    seasons?: any[];
    showCountdown?: boolean;
    status?: string;
    lastAirDate?: string;
    onToggle?: (id: number) => void;
}

const HorizontalSeriesCard = memo(function HorizontalSeriesCard({
    id,
    name,
    posterPath,
    backdropPath,
    nextEpisode,
    episodeDetails,
    isFinished,
    seasons,
    showCountdown,
    status,
    lastAirDate,
    onToggle
}: HorizontalSeriesCardProps) {
    const { toggleEpisode, updateSeriesStatus } = useTracking();
    const [isWatchedAnimating, setIsWatchedAnimating] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [isSeriesCompletedAnimating, setIsSeriesCompletedAnimating] = useState(false);
    const [isStoppedLocally, setIsStoppedLocally] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const imageUrl = getImageUrl(posterPath || backdropPath, 'medium');
    const palette = usePalette(imageUrl);

    // Drag / Swipe Logic
    const x = useMotionValue(0);
    const backgroundOpacity = useTransform(x, [-60, 0], [1, 0]);

    const onDragEnd = (event: any, info: any) => {
        if (info.offset.x < -60) {
            setShowConfirm(true);
        } else {
            setShowConfirm(false);
        }
    };

    const handleStop = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsStoppedLocally(true);
        updateSeriesStatus(id, 'stopped');
    };

    const handleWatched = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (nextEpisode && !isWatchedAnimating && !isSeriesCompletedAnimating) {
            const lastSeason = seasons?.reduce((max, s) => Math.max(max, s.season_number), 0);
            const lastSeasonData = seasons?.find(s => s.season_number === lastSeason);
            const isLastEpisode = nextEpisode.season === lastSeason && nextEpisode.episode === lastSeasonData?.episode_count;

            if (isLastEpisode) {
                setIsSeriesCompletedAnimating(true);
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: [palette.hex, '#ffffff'],
                    zIndex: 9999
                });

                if (onToggle) onToggle(id);
                setTimeout(() => {
                    toggleEpisode(id, nextEpisode.season, nextEpisode.episode, seasons);
                    setShowCompletion(true);
                    setTimeout(() => setIsSeriesCompletedAnimating(false), 1000);
                }, 1000);
            } else {
                setIsWatchedAnimating(true);
                if (onToggle) onToggle(id);

                // Keep animating for the new slower sweep (2s duration + delay)
                setTimeout(() => {
                    toggleEpisode(id, nextEpisode.season, nextEpisode.episode, seasons);
                    setTimeout(() => setIsWatchedAnimating(false), 200);
                }, 2100);
            }
        }
    };

    const isNewEpisode = (() => {
        const dateStr = episodeDetails?.airDate;
        if (!dateStr) return false;
        const airDate = new Date(dateStr);
        const diff = Date.now() - airDate.getTime();
        const threshold = 42 * 60 * 60 * 1000;
        return diff >= 0 && diff <= threshold;
    })();

    const isReady = episodeDetails && nextEpisode &&
        episodeDetails.s === nextEpisode.season &&
        episodeDetails.e === nextEpisode.episode;

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

    return (
        <motion.div
            layout
            initial={false}
            animate={{ opacity: status?.toLowerCase().trim().includes('stop') ? 0.7 : 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{
                layout: { type: "spring", stiffness: 300, damping: 30, restDelta: 0.001 },
                opacity: { duration: 0.2 }
            }}
            className="relative overflow-hidden mb-2 rounded-[24px] select-none touch-pan-y"
        >
            {/* Background Reveal Action */}
            <motion.div
                style={{ opacity: (isStoppedLocally || showConfirm) ? 1 : backgroundOpacity }}
                className="absolute inset-0 bg-red-950/40 backdrop-blur-md flex items-center justify-end z-0"
            >
                <button
                    onClick={handleStop}
                    className="flex flex-col items-center gap-1 text-white pr-4 active:scale-95 transition-transform"
                >
                    <PauseCircle size={20} />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Parar</span>
                </button>
            </motion.div>

            <motion.div
                style={{ x }}
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: -60, right: 0 }}
                dragElastic={0.05}
                dragSnapToOrigin={!isStoppedLocally && !showConfirm}
                onDragEnd={onDragEnd}
                animate={isStoppedLocally ? { x: -400, opacity: 0 } : (showConfirm ? { x: -60 } : { x: 0 })}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className="relative z-10"
            >
                <Link
                    href={`/series-detail?id=${id}`}
                    draggable={false}
                    className="block relative"
                    onClick={(e) => {
                        if (Math.abs(x.get()) > 5 || showConfirm) e.preventDefault();
                    }}
                >
                    <div className="flex items-center gap-3 p-3 rounded-[24px] shadow-xl relative overflow-hidden border border-white/10 bg-white/5 shadow-black/60">
                        {/* PREMIUM Light Sweep (1s Duration & Massive Feather) */}
                        <AnimatePresence>
                            {isWatchedAnimating && (
                                <motion.div
                                    initial={{ x: '150%', opacity: 0 }}
                                    animate={{ x: '-250%', opacity: [0, 1, 1, 0] }}
                                    transition={{ duration: 2.0, ease: [0.4, 0, 0.2, 1] }}
                                    className="absolute inset-0 z-20 pointer-events-none"
                                    style={{
                                        background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 10%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 90%, transparent 100%)`,
                                        width: '500%',
                                        skewX: -35
                                    }}
                                />
                            )}
                        </AnimatePresence>

                        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 bg-gradient-to-br from-white/10 to-transparent" />

                        <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-800 shadow-md z-1">
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={name}
                                    className="absolute inset-0 h-full w-full object-cover object-center"
                                    decoding="async"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 border border-white/5">
                                    <span className="text-[7px] text-neutral-600 font-bold uppercase truncate px-1 text-center">{name}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 z-1 flex flex-col justify-center py-1">
                            <div className="flex flex-col justify-center">
                                {isNewEpisode && !isSeriesCompletedAnimating && (
                                    <div className="mb-1.5 flex items-center gap-1.5 self-start">
                                        <span
                                            className="px-1.5 py-0.5 text-[8px] font-black rounded-md tracking-wider uppercase shadow-lg border border-white/20"
                                            style={{ backgroundColor: palette.hex, color: palette.contrast }}
                                        >
                                            Novo Episódio
                                        </span>
                                    </div>
                                )}
                                <h3 className="font-extrabold line-clamp-2 leading-tight mb-1 transition-colors duration-300 text-white text-lg">
                                    {name}
                                </h3>

                                {isSeriesCompletedAnimating ? (
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Sparkles size={14} className="text-white fill-white" />
                                        <span className="text-xs font-black text-white uppercase tracking-widest">SÉRIE CONCLUÍDA!</span>
                                    </div>
                                ) : status?.toLowerCase().trim().includes('stop') ? (
                                    <div className="flex items-center justify-center gap-1.5 py-1">
                                        <Pause size={14} className="text-white fill-white" />
                                        <span className="text-xs text-white font-black uppercase tracking-widest">PAROU DE VER</span>
                                    </div>
                                ) : isFinished ? (
                                    <span className="text-xs text-green-500 font-black uppercase tracking-wider">Concluída</span>
                                ) : nextEpisode ? (
                                    <div className="relative">
                                        <p className="text-sm text-neutral-400 truncate overflow-visible h-5">
                                            {showCountdown ? (
                                                <span className="text-[10px] font-normal text-white/80 uppercase tracking-wider">
                                                    Temporada {nextEpisode.season}
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="font-bold mr-1.5 text-white">
                                                        T{nextEpisode.season.toString().padStart(2, '0')} E{nextEpisode.episode.toString().padStart(2, '0')}
                                                    </span>
                                                    <AnimatePresence mode="popLayout" initial={false}>
                                                        <motion.span
                                                            key={isReady ? (episodeDetails?.name || 'loaded') : 'loading'}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: isReady ? 1 : 0.4, y: 0 }}
                                                            exit={{ opacity: 0, y: -8 }}
                                                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                                            className="font-normal inline-block"
                                                        >
                                                            {isReady ? episodeDetails?.name : 'A carregar...'}
                                                        </motion.span>
                                                    </AnimatePresence>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                ) : (
                                    <span className="text-xs text-neutral-500">Sem episódios</span>
                                )}
                            </div>
                        </div>

                        {!isSeriesCompletedAnimating && !isFinished && !status?.toLowerCase().trim().includes('stop') && (
                            <div className="relative flex items-center justify-center h-12 w-12">
                                {showCountdown ? (
                                    <div className="flex flex-col items-center justify-center h-14 w-14 text-white">
                                        <span className="text-3xl font-black leading-none">{getCountdown(episodeDetails?.airDate).value}</span>
                                        <span className="text-[12px] font-black uppercase tracking-tighter opacity-60">{getCountdown(episodeDetails?.airDate).label}</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Shockwave + Star Explosion (BEHIND BUTTON) */}
                                        <AnimatePresence>
                                            {isWatchedAnimating && (
                                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
                                                    {/* Shockwave Rings */}
                                                    {[...Array(2)].map((_, i) => (
                                                        <motion.div
                                                            key={`ring-${i}`}
                                                            initial={{ scale: 0.5, opacity: 0.8 }}
                                                            animate={{ scale: 2.8, opacity: 0 }}
                                                            transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.1 }}
                                                            className="absolute w-full h-full rounded-full border-2 border-white"
                                                        />
                                                    ))}

                                                    {/* RANDOMIZED Star Explosion (Under Button, No Glow, No Shaking) */}
                                                    {[...Array(16)].map((_, i) => {
                                                        const angle = Math.random() * Math.PI * 2;
                                                        const distance = 45 + Math.random() * 65;
                                                        return (
                                                            <motion.div
                                                                key={`star-${i}`}
                                                                initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                                                animate={{
                                                                    x: Math.cos(angle) * distance,
                                                                    y: Math.sin(angle) * distance,
                                                                    scale: [0, 1.4, 1.6],
                                                                    opacity: [0, 1, 1, 0],
                                                                    rotate: Math.random() * 360
                                                                }}
                                                                transition={{
                                                                    duration: 0.8 + Math.random() * 0.4,
                                                                    ease: "easeOut",
                                                                    delay: Math.random() * 0.15
                                                                }}
                                                                className="absolute"
                                                            >
                                                                <Sparkles size={10} className="text-white fill-white" />
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </AnimatePresence>

                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handleWatched}
                                            disabled={isWatchedAnimating}
                                            className={`relative h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full shadow-lg z-10 transition-all duration-300
                                                ${isWatchedAnimating ? 'bg-white text-black scale-105' : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'}`}
                                        >
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={isWatchedAnimating ? 'checked' : 'unchecked'}
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.8, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <Check size={20} strokeWidth={4} />
                                                </motion.div>
                                            </AnimatePresence>

                                            {/* Bloom effect inside button */}
                                            {isWatchedAnimating && (
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 1 }}
                                                    animate={{ scale: 2.2, opacity: 0 }}
                                                    className="absolute inset-0 bg-white rounded-full z-[-1]"
                                                />
                                            )}
                                        </motion.button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </Link>
            </motion.div>

            <CompletionOverlay
                show={showCompletion}
                onClose={() => setShowCompletion(false)}
                title={name}
                accentColor={palette.hex}
            />
        </motion.div>
    );
});

export default HorizontalSeriesCard;
