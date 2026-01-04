'use client';

import { useState, useEffect } from 'react';
import { tmdb, getImageUrl } from '@/lib/tmdb';
import { motion } from 'framer-motion';
import { Copy, ChevronRight, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface RelatedMediaProps {
    currentId: number;
    type: 'movie' | 'tv';
    data: any;
    accentColor?: string;
}

export default function RelatedMedia({ currentId, type, data, accentColor = '#D6D6B1' }: RelatedMediaProps) {
    const [related, setRelated] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('Semelhantes');

    useEffect(() => {
        const fetchRelated = async () => {
            setLoading(true);
            try {
                let list: any[] = [];

                if (type === 'movie') {
                    // Logic for movies: Prioritize collections (Sequels/Prequels)
                    if (data.belongs_to_collection) {
                        const collection = await tmdb.getCollection(data.belongs_to_collection.id);
                        if (collection && collection.parts) {
                            // Filter out current movie and sort by release date
                            list = collection.parts
                                .filter((m: any) => m.id !== currentId)
                                .sort((a: any, b: any) => {
                                    const dateA = new Date(a.release_date || '0').getTime();
                                    const dateB = new Date(b.release_date || '0').getTime();
                                    return dateA - dateB;
                                });

                            if (list.length > 0) {
                                setTitle('Coleção & Sequelas');
                            }
                        }
                    }

                    // If collection didn't yield results, use recommendations
                    if (list.length === 0) {
                        const recs = data.recommendations?.results || [];
                        list = recs.slice(0, 10);
                        setTitle('Filmes Semelhantes');
                    }
                } else {
                    // Logic for series: Prioritize recommendations (often contains spinoffs)
                    const recs = data.recommendations?.results || [];
                    list = recs.slice(0, 12);
                    setTitle('Séries Semelhantes');

                    // Note: TMDB doesn't have an easy "spinoff" flag, 
                    // but recommendations are usually curated for this.
                }

                setRelated(list);
            } catch (error) {
                console.error("Error fetching related media:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRelated();
    }, [currentId, type, data]);

    if (!loading && related.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: accentColor }}>
                    <Copy size={22} /> {title}
                </h2>
                <div className="h-[1px] flex-1 bg-white/5 mx-4 hidden sm:block" />
            </div>

            <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1 -mx-1 snap-x">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => (
                            <div key={i} className="min-w-[140px] w-[140px] space-y-3 animate-pulse">
                                <div className="aspect-[2/3] bg-white/5 rounded-[24px]" />
                                <div className="h-4 bg-white/5 rounded w-3/4" />
                            </div>
                        ))
                    ) : (
                        related.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="min-w-[140px] w-[140px] snap-start"
                            >
                                <Link
                                    href={`/${type === 'movie' ? 'movie-detail' : 'series-detail'}?id=${item.id}`}
                                    className="group block space-y-3"
                                >
                                    <div className="relative aspect-[2/3] rounded-[24px] overflow-hidden border border-white/10 group-hover:border-white/30 transition-all duration-500 shadow-2xl">
                                        <Image
                                            src={getImageUrl(item.poster_path, 'small') || '/placeholder-poster.png'}
                                            alt={item.title || item.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-700 grayscale-[0.2] group-hover:grayscale-0"
                                            sizes="140px"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        {item.vote_average > 0 && (
                                            <div className="absolute top-2 right-2 px-1.5 py-0.5 glass-dark rounded-full flex items-center gap-1 border border-white/10">
                                                <Star size={8} className="fill-yellow-400 text-yellow-400" />
                                                <span className="text-[10px] font-bold text-white">{item.vote_average.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-1">
                                        <h3 className="text-xs font-bold text-neutral-300 group-hover:text-white transition-colors line-clamp-2 leading-tight">
                                            {item.title || item.name}
                                        </h3>
                                        <p className="text-[10px] text-neutral-500 font-bold mt-1">
                                            {new Date(item.release_date || item.first_air_date || '0').getFullYear() || 'N/A'}
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
