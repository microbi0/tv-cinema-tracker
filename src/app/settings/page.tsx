'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTracking } from '@/hooks/useTracking';
import { Bell, Upload, Download, User as UserIcon, Database, CheckCircle2, AlertCircle, ChevronRight, X, BarChart3, Clapperboard, Tv, Clock, PieChart as ChartIcon, Calendar, Heart, Zap, Compass, Ghost, Smile, ShieldAlert, Theater, Users, Wand2, History, Skull, Music, Search, Rocket, Bomb, Monitor, AlertTriangle, Film, Tent, Info, ExternalLink, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { tmdb } from '@/lib/tmdb';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';


export default function SettingsPage() {
    const { watched, watchlist, favorites, importFromCSV, importFromTraktZip, exportData, setCountry, notificationSettings, updateNotificationSettings } = useTracking();
    const [isLoading, setIsLoading] = useState(false);
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [selectedCountry, setSelectedCountry] = useState('PT');
    const [errorMsg, setErrorMsg] = useState('');
    const [importProgress, setImportProgress] = useState(0);
    const [confirmClear, setConfirmClear] = useState(false);
    const importRef = useRef<HTMLInputElement>(null);
    const zipImportRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const [apiKey, setApiKey] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [isApiSaved, setIsApiSaved] = useState(false);
    const [showApiInfo, setShowApiInfo] = useState(false);
    const [showSettings, setShowSettings] = useState(false);



    // --- Statistics Calculations ---
    const stats = useMemo(() => {
        let moviesCount = 0;
        let episodesCount = 0;
        const watchedMovieIds = new Set<number>();
        const watchedSeriesIds = new Set<number>();

        Object.keys(watched).forEach(key => {
            if (watched[key]) {
                if (key.startsWith('movie_')) {
                    const id = parseInt(key.replace('movie_', ''));
                    moviesCount++;
                    watchedMovieIds.add(id);
                }
                if (key.startsWith('tv_') && key.includes('_e')) {
                    const id = parseInt(key.split('_')[1]);
                    episodesCount++;
                    watchedSeriesIds.add(id);
                }
            }
        });

        // Estimativa simples: Filme = 2h (120m), Episódio = 40m
        const totalMinutes = (moviesCount * 120) + (episodesCount * 40);
        const formatDuration = (totalMinutes: number) => {
            const totalDays = Math.floor(totalMinutes / (60 * 24));
            const years = Math.floor(totalDays / 365);
            const months = Math.floor((totalDays % 365) / 30);
            const remainingDays = totalDays % 30;

            const parts = [];
            if (years > 0) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
            if (months > 0) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
            if (remainingDays > 0) parts.push(`${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`);

            if (parts.length === 0) {
                const hours = Math.floor(totalMinutes / 60);
                if (hours > 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
                const mins = totalMinutes % 60;
                return `${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
            }

            if (parts.length > 1) {
                const last = parts.pop();
                return `${parts.join(' ')} e ${last}`;
            }
            return parts[0];
        };

        const watchlistMovies = watchlist.filter(i => i.type === 'movie').length;
        const watchlistSeries = watchlist.filter(i => i.type === 'tv').length;

        // Calculate Remaining Time
        let remainingMovieMinutes = watchlistMovies * 120;
        let remainingSeriesMinutes = 0;

        try {
            const cache = JSON.parse(localStorage.getItem('cinetracker_api_library') || '{}');
            watchlist.forEach(item => {
                if (item.type === 'tv') {
                    const cacheKey = `tv_${item.id}`;
                    const showData = cache[cacheKey]?.data;
                    if (showData && showData.number_of_episodes) {
                        const totalEpisodes = showData.number_of_episodes;
                        // Count watched episodes for this show
                        let watchedForThisShow = 0;
                        Object.keys(watched).forEach(key => {
                            if (key.startsWith(`tv_${item.id}_e`) && watched[key]) {
                                watchedForThisShow++;
                            }
                        });
                        const remainingEpisodes = Math.max(0, totalEpisodes - watchedForThisShow);
                        remainingSeriesMinutes += remainingEpisodes * 40;
                    } else {
                        // Fallback estimate: 20 episodes
                        remainingSeriesMinutes += 20 * 40;
                    }
                }
            });
        } catch (e) {
            remainingSeriesMinutes = watchlistSeries * 20 * 40;
        }

        const movieMinutes = moviesCount * 120;
        const seriesMinutes = episodesCount * 40;

        return {
            movies: moviesCount,
            series: watchedSeriesIds.size,
            episodes: episodesCount,
            watchlistMovies,
            watchlistSeries,
            favorites: favorites.length,
            movieDuration: formatDuration(movieMinutes),
            seriesDuration: formatDuration(seriesMinutes),
            totalDuration: formatDuration(totalMinutes),
            extraMovieDuration: formatDuration(remainingMovieMinutes),
            extraSeriesDuration: formatDuration(remainingSeriesMinutes)
        };
    }, [watched, watchlist, favorites]);

    const [topGenres, setTopGenres] = useState<{ name: string, count: number, percent: number }[]>([]);

    useEffect(() => {
        let isMounted = true;
        const calculateGenre = async () => {
            try {
                const genreCounts: { [key: string]: number } = {};
                const movieIds = new Set<number>();
                const seriesIds = new Set<number>();

                Object.keys(watched).forEach(key => {
                    if (watched[key]) {
                        if (key.startsWith('movie_')) movieIds.add(parseInt(key.replace('movie_', '')));
                        if (key.startsWith('tv_') && key.includes('_e')) seriesIds.add(parseInt(key.split('_')[1]));
                    }
                });

                const cache = JSON.parse(localStorage.getItem('cinetracker_api_library') || '{}');
                const missing: { id: number, type: 'movie' | 'tv' }[] = [];

                const processGenres = (data: any) => {
                    if (data?.genres) {
                        data.genres.forEach((g: any) => genreCounts[g.name] = (genreCounts[g.name] || 0) + 1);
                    }
                };

                movieIds.forEach(id => {
                    const data = cache[`movie_${id}_pt-PT`]?.data || cache[`movie_${id}_en-US`]?.data || cache[`movie_${id}`]?.data;
                    if (data?.genres) processGenres(data);
                    else missing.push({ id, type: 'movie' });
                });

                seriesIds.forEach(id => {
                    const data = cache[`tv_${id}_pt-PT`]?.data || cache[`tv_${id}_en-US`]?.data || cache[`tv_${id}`]?.data;
                    if (data?.genres) processGenres(data);
                    else missing.push({ id, type: 'tv' });
                });

                const updateTopGenresLabels = () => {
                    const sorted = Object.entries(genreCounts)
                        .sort((a, b) => b[1] - a[1]);

                    const total = sorted.reduce((acc, current) => acc + current[1], 0);
                    const top5 = sorted.slice(0, 5).map(([name, count]) => ({
                        name,
                        count,
                        percent: Math.round((count / total) * 100)
                    }));

                    if (isMounted) setTopGenres(top5);
                };

                updateTopGenresLabels();

                if (missing.length > 0) {
                    const toFetch = missing.slice(0, 30);
                    await Promise.all(toFetch.map(async item => {
                        try {
                            const data = await tmdb.getDetailsCached(item.id, item.type);
                            if (data?.genres) processGenres(data);
                        } catch (e) { }
                    }));
                    updateTopGenresLabels();
                }
            } catch (e) {
                console.error("Genre calculation failed", e);
            }
        };

        calculateGenre();
        return () => { isMounted = false; };
    }, [watched]);

    useEffect(() => {
        // Read initial settings
        if (typeof window !== 'undefined') {
            try {
                const settings = localStorage.getItem('cinetracker_settings');
                if (settings) {
                    const parsed = JSON.parse(settings);
                    if (parsed.region) setSelectedCountry(parsed.region);
                }
                setApiKey(localStorage.getItem('cinetracker_api_key') || '');
                setApiToken(localStorage.getItem('cinetracker_api_token') || '');
            } catch (e) {
                console.error("Failed to load settings or API keys from localStorage", e);
            }
        }
    }, []);

    const saveApiKeys = () => {
        localStorage.setItem('cinetracker_api_key', apiKey);
        localStorage.setItem('cinetracker_api_token', apiToken);
        setIsApiSaved(true);
        setTimeout(() => setIsApiSaved(false), 3000);
        // We might want to clear memory cache if API keys change, but let's keep it simple
    };


    const getGenreIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('ação')) return <Zap size={14} />;
        if (n.includes('aventura')) return <Compass size={14} />;
        if (n.includes('animação')) return <Ghost size={14} />;
        if (n.includes('comédia')) return <Smile size={14} />;
        if (n.includes('crime')) return <ShieldAlert size={14} />;
        if (n.includes('documentário')) return <Film size={14} />;
        if (n.includes('drama')) return <Theater size={14} />;
        if (n.includes('família')) return <Users size={14} />;
        if (n.includes('fantasia')) return <Wand2 size={14} />;
        if (n.includes('história')) return <History size={14} />;
        if (n.includes('terror')) return <Skull size={14} />;
        if (n.includes('música')) return <Music size={14} />;
        if (n.includes('mistério')) return <Search size={14} />;
        if (n.includes('romance')) return <Heart size={14} />;
        if (n.includes('ficção científica')) return <Rocket size={14} />;
        if (n.includes('cinema tv')) return <Tv size={14} />;
        if (n.includes('thriller')) return <AlertTriangle size={14} />;
        if (n.includes('guerra')) return <Bomb size={14} />;
        if (n.includes('faroeste')) return <Tent size={14} />;
        return <Clapperboard size={14} />;
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        console.log("File selected:", file?.name, file?.type);
        if (!file) return;

        setIsLoading(true);
        setImportProgress(0);
        setErrorMsg('');

        try {
            const reader = new FileReader();

            reader.onerror = (err) => {
                console.error("FileReader error:", err);
                setErrorMsg("Erro ao ler ficheiro");
                setImportStatus('error');
                setIsLoading(false);
            };

            reader.onload = async (evt) => {
                const content = evt.target?.result as string;
                if (content) {
                    try {
                        const success = await importFromCSV(content, (p) => setImportProgress(p));
                        if (success) {
                            setImportStatus('success');
                            setTimeout(() => setImportStatus('idle'), 3000);
                        } else {
                            setImportStatus('error');
                            setErrorMsg("Formato inválido ou vazio");
                            setTimeout(() => setImportStatus('idle'), 3000);
                        }
                    } catch (importErr) {
                        console.error("Import error:", importErr);
                        setImportStatus('error');
                        setErrorMsg("Erro no processamento");
                    }
                }
                setIsLoading(false);
                setImportProgress(0);
                if (importRef.current) importRef.current.value = '';
            };

            reader.readAsText(file);
        } catch (err) {
            console.error("Setup error:", err);
            setImportStatus('error');
            setErrorMsg("Falha ao iniciar");
            setIsLoading(false);
        }
    };

    const handleZipImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setImportProgress(0);
        try {
            const success = await importFromTraktZip(file, (p) => setImportProgress(p));
            if (success) {
                setImportStatus('success');
                setTimeout(() => setImportStatus('idle'), 3000);
            } else {
                setImportStatus('error');
                setErrorMsg('Erro no ficheiro');
                setTimeout(() => { setImportStatus('idle'); setErrorMsg(''); }, 3000);
            }
            setTimeout(() => { setImportStatus('idle'); setErrorMsg(''); }, 3000);
        } catch (e: any) {
            console.error(e);
            setImportStatus('error');
            const msg = e.message === 'MissingCSV' ? 'Ficheiros em falta' : 'Falha ao importar';
            setErrorMsg(msg);
            setTimeout(() => { setImportStatus('idle'); setErrorMsg(''); }, 3000);
        } finally {
            setIsLoading(false);
            setImportProgress(0);
            if (zipImportRef.current) zipImportRef.current.value = '';
        }
    };



    return (
        <div className="min-h-screen pb-32">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md px-5 pt-16 pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-black tracking-tighter">Perfil</h1>
                    <button onClick={() => router.back()} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="pt-32 px-5 space-y-8 max-w-lg mx-auto">



                {/* Statistics Grid */}
                <div className="space-y-4">
                    <h3 className="text-base font-bold text-white uppercase tracking-widest px-1 flex items-center gap-2">
                        <BarChart3 size={16} /> Estatísticas
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-neutral-900/50 border border-white/5 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Clapperboard size={20} className="text-white" />
                                <span className="text-sm font-bold uppercase tracking-wider text-blue-400">Filmes</span>
                            </div>
                            <p className="text-4xl font-black text-white">{stats.movies}</p>
                            <div className="mt-2 space-y-0.5">
                                <p className="text-sm font-bold text-neutral-300">{stats.movieDuration}</p>
                                <p className="text-xs text-neutral-400 font-medium">{stats.watchlistMovies} na watchlist</p>
                            </div>
                        </div>
                        <div className="bg-neutral-900/50 border border-white/5 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Tv size={20} className="text-white" />
                                <span className="text-sm font-bold uppercase tracking-wider text-purple-400">Séries</span>
                            </div>
                            <p className="text-4xl font-black text-white">{stats.series}</p>
                            <div className="mt-2 space-y-0.5">
                                <p className="text-sm font-bold text-neutral-300">{stats.seriesDuration}</p>
                                <p className="text-xs text-neutral-400 font-medium">{stats.episodes} episódios vistos</p>
                            </div>
                        </div>

                        {/* Extra Time Cards */}
                        <div className="bg-neutral-900/50 border border-white/5 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={20} className="text-white" />
                                <span className="text-sm font-bold uppercase tracking-wider text-orange-400">FALTAM</span>
                            </div>
                            <p className="text-xl font-bold text-white leading-tight">{stats.extraMovieDuration}</p>
                            <p className="text-xs text-neutral-400 mt-2 font-medium">para acabar a lista de filmes</p>
                        </div>

                        <div className="bg-neutral-900/50 border border-white/5 p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={20} className="text-white" />
                                <span className="text-sm font-bold uppercase tracking-wider text-pink-400">FALTAM</span>
                            </div>
                            <p className="text-xl font-bold text-white leading-tight">{stats.extraSeriesDuration}</p>
                            <p className="text-xs text-neutral-400 mt-2 font-medium">para acabar a lista de séries</p>
                        </div>
                        <div className="bg-neutral-900/50 border border-white/5 p-4 rounded-2xl col-span-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={20} className="text-white" />
                                <span className="text-sm font-bold uppercase tracking-wider text-green-400">Tempo Total</span>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-2xl font-black text-white leading-tight">{stats.totalDuration}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Genres Chart */}
                {topGenres.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <h3 className="text-base font-bold text-white uppercase tracking-widest px-1 flex items-center gap-2">
                            <ChartIcon size={16} /> Preferências
                        </h3>
                        <div className="bg-neutral-900/50 border border-white/5 p-5 rounded-2xl flex items-center gap-6">
                            {/* Chart Container */}
                            <div className="h-40 w-40 flex-shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={topGenres}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={5}
                                            dataKey="count"
                                            stroke="none"
                                            animationDuration={1000}
                                        >
                                            {topGenres.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={[
                                                        '#fbbf24', // Amber 400
                                                        '#60a5fa', // Blue 400
                                                        '#a78bfa', // Purple 400
                                                        '#4ade80', // Green 400
                                                        '#737373'  // Neutral 500
                                                    ][index % 5]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-black/90 border border-white/10 px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md">
                                                            <p className="text-xs font-bold text-white">{payload[0].name}</p>
                                                            <p className="text-[10px] text-neutral-400">{payload[0].value} visualizações</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend Section */}
                            <div className="flex-1 space-y-2.5">
                                {topGenres.map((genre, idx) => (
                                    <div key={genre.name} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className="w-1.5 h-6 rounded-full flex-shrink-0"
                                                style={{
                                                    backgroundColor: [
                                                        '#fbbf24', '#60a5fa', '#a78bfa', '#4ade80', '#737373'
                                                    ][idx % 5]
                                                }}
                                            />
                                            <div className="flex items-center gap-2 text-white/60 group-hover:text-white transition-colors overflow-hidden">
                                                <div className="flex-shrink-0 text-white/40 group-hover:text-white/80 transition-colors">
                                                    {getGenreIcon(genre.name)}
                                                </div>
                                                <span className="text-sm font-bold truncate">{genre.name}</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-black text-neutral-500 ml-2">{genre.percent}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Toggleable Settings Section */}
                <div className="pt-4">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="w-full glass border border-white/10 p-5 rounded-[28px] flex items-center justify-between hover:bg-white/5 transition-all active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-neutral-800 rounded-2xl text-white">
                                <Settings size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-black text-white">Definições da Conta</h3>
                                <p className="text-xs text-neutral-500 font-medium">Notificações, Chaves de API e Dados</p>
                            </div>
                        </div>
                        <motion.div
                            animate={{ rotate: showSettings ? 90 : 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <ChevronRight size={24} className="text-neutral-500" />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {showSettings && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                            >
                                <div className="pt-8 space-y-10 pb-4">
                                    {/* Notifications Settings */}
                                    <div className="space-y-4">
                                        <h3 className="text-base font-bold text-neutral-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                            <Bell size={16} /> Notificações
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            <button
                                                onClick={() => updateNotificationSettings({ movies: !notificationSettings.movies })}
                                                className="w-full bg-neutral-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-neutral-800/50 transition-colors active:scale-98"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Clapperboard size={22} className="text-white" />
                                                    <div className="text-left">
                                                        <p className="font-bold text-white text-base">Estreias de Filmes</p>
                                                        <p className="text-xs text-neutral-500">Notificar quando um filme na watchlist estrear</p>
                                                    </div>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${notificationSettings.movies ? 'bg-blue-600' : 'bg-neutral-800'}`}>
                                                    <div className={`bg-white w-4 h-4 rounded-full transition-transform duration-200 ${notificationSettings.movies ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => updateNotificationSettings({ series: !notificationSettings.series })}
                                                className="w-full bg-neutral-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-neutral-800/50 transition-colors active:scale-98"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Tv size={22} className="text-white" />
                                                    <div className="text-left">
                                                        <p className="font-bold text-white text-base">Novos Episódios</p>
                                                        <p className="text-xs text-neutral-500">Avisar no exato momento em que o episódio sair</p>
                                                    </div>
                                                </div>
                                                <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${notificationSettings.series ? 'bg-purple-600' : 'bg-neutral-800'}`}>
                                                    <div className={`bg-white w-4 h-4 rounded-full transition-transform duration-200 ${notificationSettings.series ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* API Configuration */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-base font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                                <Database size={16} /> Chaves de API
                                            </h3>
                                            <button
                                                onClick={() => setShowApiInfo(true)}
                                                className="p-1.5 bg-white/5 rounded-full text-neutral-400 hover:text-white transition-colors"
                                            >
                                                <Info size={16} />
                                            </button>
                                        </div>
                                        <div className="bg-neutral-900/50 border border-white/5 p-5 rounded-2xl space-y-4">
                                            <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                                                Introduz as tuas próprias chaves do **TMDB** para que a aplicação utilize a tua quota pessoal. Deixa em branco para usar a chave padrão.
                                            </p>
                                            <div className="space-y-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase font-black tracking-widest text-neutral-500 ml-1">API Key (v3)</label>
                                                    <input
                                                        type="text"
                                                        value={apiKey}
                                                        onChange={(e) => setApiKey(e.target.value)}
                                                        placeholder="2670..."
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 transition-colors font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] uppercase font-black tracking-widest text-neutral-500 ml-1">Access Token (v4 Auth)</label>
                                                    <textarea
                                                        value={apiToken}
                                                        onChange={(e) => setApiToken(e.target.value)}
                                                        placeholder="eyJh..."
                                                        rows={3}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-500/50 transition-colors font-mono resize-none"
                                                    />
                                                </div>
                                                <button
                                                    onClick={saveApiKeys}
                                                    className={`w-full py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${isApiSaved ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-neutral-200'
                                                        }`}
                                                >
                                                    {isApiSaved ? (
                                                        <>
                                                            <CheckCircle2 size={18} strokeWidth={3} />
                                                            Guardado
                                                        </>
                                                    ) : 'Guardar Configurações'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data Management */}
                                    <div className="space-y-4">
                                        <div className="px-1">
                                            <h3 className="text-base font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                                <Database size={16} /> Dados
                                            </h3>
                                            <p className="text-[10px] text-neutral-600 font-medium leading-relaxed italic mt-1">
                                                * A importação de plataformas como TVTime e Trakt pode conter erros ou não importar algumas séries ou filmes devido a erros de identificação.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            <button
                                                onClick={() => exportData()}
                                                className="w-full bg-neutral-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-neutral-800/50 transition-colors active:scale-98"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Download size={22} className="text-white" />
                                                    <div className="text-left">
                                                        <p className="font-bold text-white text-base">Exportar Backup</p>
                                                        <p className="text-xs text-neutral-500">Exporta um ficheiro CSV com todos os teus dados.</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-neutral-600" />
                                            </button>

                                            <button
                                                onClick={() => importRef.current?.click()}
                                                disabled={isLoading}
                                                className="relative w-full bg-neutral-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-neutral-800/50 transition-colors active:scale-98 overflow-hidden"
                                            >
                                                {/* Progress Background */}
                                                {isLoading && importProgress > 0 && importRef.current?.value && (
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${importProgress}%` }}
                                                        className="absolute left-0 top-0 bottom-0 bg-white/5 z-0"
                                                    />
                                                )}

                                                <div className="flex items-center gap-4 z-10">
                                                    <Upload size={22} className="text-white" />
                                                    <div className="text-left">
                                                        <p className="font-bold text-white text-base">
                                                            {isLoading && importProgress > 0 && importRef.current?.value
                                                                ? `A importar... ${importProgress}%`
                                                                : importStatus === 'success' ? 'Backup Importado' : 'Importar Backup'}
                                                        </p>
                                                        <p className="text-xs text-neutral-500">Recupera dados de um CSV ou do TVShowtime</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-neutral-600 z-10" />
                                            </button>

                                            <button
                                                onClick={() => zipImportRef.current?.click()}
                                                disabled={isLoading}
                                                className="relative w-full bg-neutral-900/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-neutral-800/50 transition-colors active:scale-98 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-4 z-10">
                                                    <Database size={22} className="text-white" />
                                                    <div className="text-left">
                                                        <p className="font-bold text-white text-base">
                                                            {importStatus === 'success' ? 'Trakt Importado' : 'Importar Trakt (ZIP)'}
                                                        </p>
                                                        <p className="text-xs text-neutral-500">Importa o ficheiro .zip dos teus dados do Trakt</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-neutral-600 z-10" />
                                            </button>

                                            {/* Nuke Button */}
                                            <button
                                                onClick={() => {
                                                    if (confirmClear) {
                                                        localStorage.clear();
                                                        window.location.reload();
                                                    } else {
                                                        setConfirmClear(true);
                                                        setTimeout(() => setConfirmClear(false), 3000);
                                                    }
                                                }}
                                                className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all active:scale-98 group ${confirmClear
                                                    ? 'bg-red-600 border border-red-500 shadow-red-900/20 shadow-lg'
                                                    : 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <AlertCircle size={22} className="text-white" />
                                                    <div className="text-left">
                                                        <p className={`font-bold text-base ${confirmClear ? 'text-white' : 'text-red-500'}`}>
                                                            {confirmClear ? 'Tens a certeza?' : 'Apagar Tudo'}
                                                        </p>
                                                        <p className={`text-xs uppercase tracking-widest font-bold ${confirmClear ? 'text-white/80' : 'text-red-400/60'}`}>
                                                            {confirmClear ? 'Toque para confirmar' : 'Perigo'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className={confirmClear ? 'text-white' : 'text-red-500/50'} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


            </div>

            {/* API Info Modal */}
            <AnimatePresence>
                {showApiInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowApiInfo(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl">
                                            <Info size={24} />
                                        </div>
                                        <h2 className="text-xl font-black text-white">Como obter as chaves?</h2>
                                    </div>
                                    <button onClick={() => setShowApiInfo(false)} className="p-2 bg-white/5 rounded-full text-neutral-400 hover:text-white">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-400">1</div>
                                        <p className="text-sm text-neutral-300">Cria uma conta em <span className="text-blue-400 font-bold">themoviedb.org</span></p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-400">2</div>
                                        <p className="text-sm text-neutral-300">Vai às Definições da tua conta e clica em <span className="text-white font-bold">"API"</span> no menu lateral.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-400">3</div>
                                        <p className="text-sm text-neutral-300">Cria uma nova chave de API (Developer) preenchendo os dados básicos.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-400">4</div>
                                        <div className="space-y-2">
                                            <p className="text-sm text-neutral-300">Copia a <span className="text-blue-400 font-bold">API Key (v3)</span> e o <span className="text-purple-400 font-bold">API Read Access Token (v4)</span> para os campos atrás.</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => window.open('https://www.themoviedb.org/settings/api', '_blank')}
                                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
                                >
                                    Abrir TMDB <ExternalLink size={16} strokeWidth={3} />
                                </button>

                                <p className="text-[10px] text-center text-neutral-500 font-medium uppercase tracking-widest pt-2">
                                    O Access Token é muito longo, certifica-te que copiaste tudo!
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
