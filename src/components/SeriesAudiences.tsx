'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Star, Calendar } from 'lucide-react';

interface SeasonStat {
    number: number;
    rating: number;
    year: string;
    episodes: number;
}

interface SeriesAudiencesProps {
    imdbId?: string;
    accentColor?: string;
}

export default function SeriesAudiences({ imdbId, accentColor = '#D6D6B1' }: SeriesAudiencesProps) {
    const [stats, setStats] = useState<SeasonStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!imdbId) {
                setLoading(false);
                return;
            }
            try {
                // TVMaze Lookup
                const lookupRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
                if (!lookupRes.ok) throw new Error();
                const show = await lookupRes.json();

                // Get episodes to calculate per-season ratings
                const epRes = await fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`);
                const episodes = await epRes.json();

                const grouped: Record<number, any[]> = {};
                episodes.forEach((ep: any) => {
                    if (!grouped[ep.season]) grouped[ep.season] = [];
                    grouped[ep.season].push(ep);
                });

                const results: SeasonStat[] = Object.keys(grouped).map(num => {
                    const seasonEps = grouped[Number(num)];
                    const rated = seasonEps.filter(e => e.rating?.average);
                    const avg = rated.length > 0
                        ? rated.reduce((acc, curr) => acc + curr.rating.average, 0) / rated.length
                        : 0;

                    return {
                        number: Number(num),
                        rating: avg,
                        year: seasonEps[0]?.airdate ? new Date(seasonEps[0].airdate).getFullYear().toString() : 'N/A',
                        episodes: seasonEps.length
                    };
                });

                setStats(results.sort((a, b) => a.number - b.number));
            } catch (e) {
                console.error("Error fetching audience data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [imdbId]);

    if (!loading && stats.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold px-1 flex items-center gap-2" style={{ color: accentColor }}>
                <Users size={22} /> Audiência por Temporada
            </h2>

            <div className="glass rounded-[24px] overflow-hidden border border-white/10">
                <div className="divide-y divide-white/5">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="p-5 animate-pulse flex justify-between items-center">
                                <div className="h-4 bg-white/5 rounded w-1/4" />
                                <div className="h-4 bg-white/5 rounded w-1/12" />
                            </div>
                        ))
                    ) : (
                        stats.map((season, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                                        Temporada {season.number}
                                    </span>
                                    <div className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                                        {season.episodes} Episódios
                                        <span className="text-neutral-600 font-normal opacity-50">•</span>
                                        <span className="text-neutral-400 font-medium">{season.year}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Avaliação Média</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                        <span className="text-lg font-black italic tracking-tighter" style={{ color: accentColor }}>
                                            {season.rating > 0 ? season.rating.toFixed(1) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
            <p className="px-1 text-[9px] font-bold text-neutral-500 uppercase tracking-widest leading-tight opacity-60">
                * Os dados de audiência real (espectadores totais) são proprietários e raramente disponibilizados via API. Estes valores refletem a receção crítica e engajamento real no TVMaze.
            </p>
        </div>
    );
}
