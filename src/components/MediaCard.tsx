'use client';

import { useState, memo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { getImageUrl } from '@/lib/tmdb';
import { usePalette } from '@/hooks/usePalette';
import { useTracking } from '@/hooks/useTracking';
import { PauseCircle, Pause, Plus, Check, Sparkles } from 'lucide-react';

interface MediaCardProps {
    id: number;
    title: string;
    posterPath: string;
    rating: number;
    type: 'movie' | 'tv';
    year?: string;
    director?: string;
    isDropped?: boolean;
    status?: string;
    disableSwipe?: boolean;
    showAddButton?: boolean;
    onAdd?: () => void;
    showMarkFirstButton?: boolean;
    onMarkFirst?: () => void;
}

const MediaCard = memo(function MediaCard({ id, title, posterPath, rating, type, year, director, isDropped, status, disableSwipe, showAddButton, onAdd, showMarkFirstButton, onMarkFirst }: MediaCardProps) {
    const { updateSeriesStatus, isInWatchlist, toggleWatchlist } = useTracking();
    const [isStoppedLocally, setIsStoppedLocally] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const imageUrl = getImageUrl(posterPath, 'medium');
    const palette = usePalette(imageUrl);
    const isStopped = status?.toLowerCase().trim().includes('stop') || isStoppedLocally;
    const showIndicator = isStopped || isDropped;

    // Drag / Swipe Logic
    const x = useMotionValue(0);

    const onDragEnd = (event: any, info: any) => {
        if (!disableSwipe && type === 'tv' && info.offset.x < -60) {
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

    const handleAction = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAnimating) return;
        setIsAnimating(true);

        setTimeout(() => {
            if (onMarkFirst) onMarkFirst();
            setTimeout(() => setIsAnimating(false), 1600);
        }, 500);
    };

    const canDrag = !disableSwipe && type === 'tv';

    return (
        <motion.div
            layout
            initial={false}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            className="relative overflow-hidden mb-1 rounded-[24px] select-none touch-pan-y will-change-transform"
        >
            {/* Background Reveal Action */}
            {canDrag && (
                <div
                    className={`absolute inset-0 bg-red-950/40 backdrop-blur-sm flex items-center justify-end z-0 transition-opacity duration-200 ${(isStoppedLocally || showConfirm) ? 'opacity-100' : 'opacity-0'}`}
                >
                    <button
                        onClick={handleStop}
                        className="flex flex-col items-center gap-1 text-white pr-4 active:scale-95 transition-transform"
                    >
                        <PauseCircle size={20} />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Parar</span>
                    </button>
                </div>
            )}

            <motion.div
                style={{ x: canDrag ? x : 0 }}
                drag={canDrag ? "x" : false}
                dragDirectionLock
                dragConstraints={canDrag ? { left: -60, right: 0 } : undefined}
                dragElastic={0.05}
                dragSnapToOrigin={!isStoppedLocally && !showConfirm}
                onDragEnd={onDragEnd}
                animate={isStoppedLocally ? { x: -300, opacity: 0 } : (showConfirm ? { x: -60, opacity: isStopped ? 0.7 : 1 } : { x: 0, opacity: isStopped ? 0.7 : 1 })}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="relative z-10 bg-transparent"
            >
                <Link
                    href={type === 'movie' ? `/movie-detail?id=${id}` : `/series-detail?id=${id}`}
                    draggable={false}
                    className="flex flex-col group"
                    onClick={(e) => {
                        if (Math.abs(x.get()) > 5 || showConfirm) e.preventDefault();
                    }}
                >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[24px] bg-neutral-900 shadow-xl border border-white/5 active:scale-[0.97] transition-all">
                        {/* PREMIUM Light Sweep (1s Duration & Massive Feather) */}
                        <AnimatePresence>
                            {isAnimating && (
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

                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={title}
                                className="absolute inset-0 h-full w-full object-cover object-center transform transition-transform duration-500 group-active:scale-105"
                                draggable={false}
                                decoding="async"
                                loading="lazy"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 p-4 text-center">
                                <span className="text-[10px] text-neutral-600 font-bold uppercase line-clamp-2">{title}</span>
                            </div>
                        )}

                        {showIndicator && (
                            isStopped ? (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center">
                                    <Pause size={32} className="text-white fill-white mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">PAROU DE VER</span>
                                </div>
                            ) : (
                                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg shadow-lg z-10 bg-white/90">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-black">
                                        Incompleta
                                    </span>
                                </div>
                            )
                        )}

                        <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                            {showAddButton && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (onAdd) onAdd();
                                        else toggleWatchlist(id, type);
                                    }}
                                    className={`flex items-center justify-center w-10 h-10 rounded-full border shadow-2xl transition-all active:scale-90 ${isInWatchlist(id, type) ? 'bg-green-500 border-green-400' : 'bg-black/40 border-white/10 hover:bg-black/60'}`}
                                >
                                    {isInWatchlist(id, type) ? (
                                        <Check size={16} className="text-white" strokeWidth={4} />
                                    ) : (
                                        <Plus size={16} className="text-white" strokeWidth={4} />
                                    )}
                                </button>
                            )}

                            {showMarkFirstButton && (
                                <div className="relative flex items-center justify-center w-10 h-10">
                                    {/* Shockwave + Star Explosion (BEHIND BUTTON) */}
                                    <AnimatePresence>
                                        {isAnimating && (
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

                                                {/* RANDOMIZED Star Explosion (No Glow, No Shaking) */}
                                                {[...Array(12)].map((_, i) => {
                                                    const angle = Math.random() * Math.PI * 2;
                                                    const dist = 35 + Math.random() * 55;
                                                    return (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                                            animate={{
                                                                x: Math.cos(angle) * dist,
                                                                y: Math.sin(angle) * dist,
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

                                    <button
                                        onClick={handleAction}
                                        className={`relative flex items-center justify-center h-10 w-10 rounded-full shadow-2xl transition-all active:scale-95 border border-white/10 z-10 ${isAnimating ? 'bg-white text-black scale-110' : 'bg-black/40 text-white hover:bg-black/60'}`}
                                    >
                                        <Check size={16} strokeWidth={4} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="px-1 py-2 min-h-[56px] flex flex-col justify-center">
                        <h3 className="text-base font-black text-white line-clamp-2 leading-tight mb-0.5">{title}</h3>
                        {year && <p className="text-sm font-bold uppercase text-neutral-400 tracking-wider">{year.split('-')[0]}</p>}
                    </div>
                </Link>
            </motion.div>
        </motion.div>
    );
});

export default MediaCard;
