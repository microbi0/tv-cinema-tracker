'use client';

import { useState, useEffect } from 'react';
import { tmdb, getImageUrl } from '@/lib/tmdb';
import MediaCard from '@/components/MediaCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { X, User, Film, Tv, Star } from 'lucide-react';
import Image from 'next/image';

export default function ActorOverlay() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const personId = searchParams.get('personId');
    const isOpen = !!personId;

    const [person, setPerson] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && personId) {
            setLoading(true);
            tmdb.getPersonDetailsCached(parseInt(personId))
                .then(data => {
                    setPerson(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching actor details:", err);
                    setLoading(false);
                });

            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        } else {
            setPerson(null);
        }
    }, [isOpen, personId]);

    const close = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('personId');
        router.push(window.location.pathname + (params.toString() ? '?' + params.toString() : ''), { scroll: false });
    };

    // Close on Esc
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) close();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen]);

    const credits = person?.combined_credits?.cast || [];
    const sortedCredits = [...credits].sort((a: any, b: any) => (b.vote_count || 0) - (a.vote_count || 0)).slice(0, 40);

    const movies = sortedCredits.filter((c: any) => c.media_type === 'movie');
    const series = sortedCredits.filter((c: any) => c.media_type === 'tv');

    const getAge = (birthday: string) => {
        if (!birthday) return null;
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getDepartmentPT = (dept: string, gender: number) => {
        if (!dept) return null;
        const normalized = dept.toLowerCase();
        if (normalized === 'acting') return gender === 1 ? 'Actriz' : 'Actor';
        if (normalized === 'directing') return 'Realização';
        if (normalized === 'production') return 'Produção';
        if (normalized === 'writing') return 'Argumentista';
        if (normalized === 'camera') return 'Câmara';
        if (normalized === 'editing') return 'Montagem';
        if (normalized === 'sound') return 'Som';
        if (normalized === 'art') return 'Direção de Arte';
        return dept;
    };

    const getCountryOnly = (place: string) => {
        if (!place) return null;
        const parts = place.split(',');
        return parts[parts.length - 1].trim();
    };

    const getFlag = (country: string | null) => {
        if (!country) return '';
        const c = country.toLowerCase().trim();
        const flags: Record<string, string> = {
            'usa': '🇺🇸',
            'eua': '🇺🇸',
            'united states': '🇺🇸',
            'united states of america': '🇺🇸',
            'uk': '🇬🇧',
            'united kingdom': '🇬🇧',
            'reino unido': '🇬🇧',
            'portugal': '🇵🇹',
            'brazil': '🇧🇷',
            'brasil': '🇧🇷',
            'spain': '🇪🇸',
            'espanha': '🇪🇸',
            'france': '🇫🇷',
            'frança': '🇫🇷',
            'germany': '🇩🇪',
            'alemanha': '🇩🇪',
            'italy': '🇮🇹',
            'itália': '🇮🇹',
            'canada': '🇨🇦',
            'canadá': '🇨🇦',
            'australia': '🇦🇺',
            'austrália': '🇦🇺',
            'japan': '🇯🇵',
            'japão': '🇯🇵',
            'south korea': '🇰🇷',
            'coreia do sul': '🇰🇷',
            'china': '🇨🇳',
            'mexico': '🇲🇽',
            'méxico': '🇲🇽',
            'india': '🇮🇳',
            'índia': '🇮🇳',
            'ireland': '🇮🇪',
            'irlanda': '🇮🇪',
        };
        return flags[c] || '';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%', opacity: 0.5 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0.5 }}
                    transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
                    className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-lg flex flex-col will-change-gpu overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex-shrink-0 z-[130] px-5 pt-20 pb-8 bg-black/80 backdrop-blur-lg border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-neutral-800">
                                {person?.profile_path ? (
                                    <Image
                                        src={getImageUrl(person.profile_path, 'medium')!}
                                        alt={person?.name || ''}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-neutral-600">
                                        <User size={30} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white leading-tight mb-1">{person?.name || 'A carregar...'}</h2>
                                <div className="flex flex-col gap-1">
                                    {person?.known_for_department && (
                                        <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">
                                            {getDepartmentPT(person.known_for_department, person.gender)}
                                        </p>
                                    )}
                                    {(person?.birthday || person?.place_of_birth) && (
                                        <p className="text-sm text-neutral-400 font-bold">
                                            {person.birthday && `${getAge(person.birthday)} anos`}
                                            {person.place_of_birth && (
                                                <>
                                                    {` • `}
                                                    <span className="mr-1">{getFlag(getCountryOnly(person.place_of_birth))}</span>
                                                    {getCountryOnly(person.place_of_birth)}
                                                </>
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth" onClick={(e) => {
                        if (e.target === e.currentTarget) close();
                    }}>
                        <div className="max-w-2xl mx-auto px-5 py-8 pb-[100px]">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center pt-20 text-white/20">
                                    <div className="h-10 w-10 border-4 border-current border-t-white rounded-full animate-spin mb-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando...</span>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    {/* Biography Snippet */}
                                    {person?.biography && (
                                        <div className="glass rounded-[32px] p-6 border border-white/10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <User size={40} />
                                            </div>
                                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-4 opacity-40">Biografia</h3>
                                            <p className="text-sm text-neutral-300 leading-relaxed font-medium">
                                                {person.biography}
                                            </p>
                                        </div>
                                    )}

                                    {/* Credits Sections */}
                                    {movies.length > 0 && (
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-black text-white flex items-center gap-2 px-1">
                                                <Film size={20} className="text-white" />
                                                Filmes
                                            </h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                {movies.map((item: any) => (
                                                    <MediaCard
                                                        key={`${item.id}-${item.media_type}`}
                                                        id={item.id}
                                                        title={item.title || item.original_title}
                                                        posterPath={item.poster_path}
                                                        rating={item.vote_average}
                                                        type="movie"
                                                        disableSwipe={true}
                                                        showAddButton={true}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {series.length > 0 && (
                                        <div className="space-y-6">
                                            <h3 className="text-xl font-black text-white flex items-center gap-2 px-1">
                                                <Tv size={20} className="text-white" />
                                                Séries
                                            </h3>
                                            <div className="grid grid-cols-3 gap-4">
                                                {series.map((item: any) => (
                                                    <MediaCard
                                                        key={`${item.id}-${item.media_type}`}
                                                        id={item.id}
                                                        title={item.name || item.original_name}
                                                        posterPath={item.poster_path}
                                                        rating={item.vote_average}
                                                        type="tv"
                                                        disableSwipe={true}
                                                        showAddButton={true}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {movies.length === 0 && series.length === 0 && (
                                        <div className="flex flex-col items-center justify-center pt-10 text-neutral-600">
                                            <p className="text-sm font-medium">Nenhum crédito encontrado.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
