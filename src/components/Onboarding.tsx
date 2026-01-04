'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useTracking } from '@/hooks/useTracking';
import { Upload, CheckCircle2, ChevronRight, X, Database, Clapperboard, Monitor, Sparkles, AlertCircle, Bell, ShieldCheck, Zap, Info, HelpCircle, ExternalLink } from 'lucide-react';

export default function Onboarding() {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const { importFromCSV, watched, watchlist, favorites, trackingLoading } = useTracking();
    const [isVisible, setIsVisible] = useState(false);
    const [step, setStep] = useState(1);
    const importRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (trackingLoading) return;

        const onboarded = localStorage.getItem('cinetracker_onboarded');
        const hasWatched = Object.keys(watched).length > 0;
        const hasWatchlist = watchlist.length > 0;
        const hasFavorites = favorites.length > 0;

        // ONLY show if it's a completely blank state and not onboarded
        if (!onboarded && !hasWatched && !hasWatchlist && !hasFavorites) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [watched, watchlist, favorites, trackingLoading]);

    const finishOnboarding = () => {
        localStorage.setItem('cinetracker_onboarded', 'true');
        setIsVisible(false);
    };


    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('loading');
        setIsLoading(true);
        setProgress(0);

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const content = evt.target?.result as string;
                if (content) {
                    const success = await importFromCSV(content, (p) => setProgress(p));
                    if (success) {
                        setImportStatus('success');
                        setProgress(100);
                    } else {
                        setImportStatus('error');
                    }
                }
                setIsLoading(false);
            };
            reader.readAsText(file);
        } catch (err) {
            setImportStatus('error');
            setIsLoading(false);
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.6, ease: "easeOut" }
        }
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-6 overflow-hidden"
            >
                {/* Animated Background Gradient */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute inset-0 z-0"
                    style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(214, 214, 177, 0.15) 0%, rgba(0, 0, 0, 0) 70%)'
                    }}
                />

                <div className="max-w-md w-full relative z-10">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-8 text-center"
                            >
                                <motion.div variants={itemVariants} className="space-y-4">
                                    <div className="mb-6 mx-auto">
                                        <img src="/movie.png" alt="App Icon" className="w-24 h-24 object-contain mx-auto drop-shadow-2xl" />
                                    </div>
                                    <h1 className="text-4xl font-black tracking-tighter text-white leading-[0.9]">TV & Cinema</h1>
                                    <p className="text-neutral-400 text-lg leading-relaxed font-medium">
                                        A única app que precisas para gerires a tua watchlist de cinema e televisão. Vamos configurar a tua experiência.
                                    </p>
                                </motion.div>

                                <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 pt-4">
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="mt-1 p-2 bg-white/5 rounded-lg text-white">
                                            <Bell size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Notificações de estreias</h4>
                                            <p className="text-[13px] text-neutral-500">Sabe sempre quando sai um novo episódio ou filme.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="mt-1 p-2 bg-white/5 rounded-lg text-white">
                                            <Zap size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Interface flúida</h4>
                                            <p className="text-[13px] text-neutral-500">Navegação rápida e intuitiva em todos os teus dispositivos.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="mt-1 p-2 bg-white/5 rounded-lg text-white">
                                            <Sparkles size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Gestão inteligente</h4>
                                            <p className="text-[13px] text-neutral-500">Organização automática do teu progresso e sugestões.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 text-left">
                                        <div className="mt-1 p-2 bg-white/5 rounded-lg text-white">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Dados locais</h4>
                                            <p className="text-[13px] text-neutral-500">Privacidade total. Os teus dados nunca saem do teu telemóvel.</p>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div variants={itemVariants}>
                                    <button
                                        onClick={() => setStep(3)}
                                        className="w-full py-5 bg-white text-black rounded-3xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xl shadow-white/10"
                                    >
                                        Continuar <ChevronRight size={20} strokeWidth={3} />
                                    </button>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step3"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-8"
                            >
                                <motion.div variants={itemVariants} className="space-y-2 text-center">
                                    <h2 className="text-3xl font-black tracking-tighter text-white">Como queres começar?</h2>
                                    <p className="text-neutral-500 font-medium italic text-sm">Podes importar os teus dados agora ou começar do zero.</p>
                                </motion.div>

                                <div className="space-y-4">
                                    {/* Option: Import */}
                                    <motion.div variants={itemVariants} className={`p-6 rounded-[32px] border transition-all ${importStatus === 'idle' ? 'bg-neutral-900 border-white/5 hover:border-white/10' : 'bg-neutral-900 border-white/20'}`}>
                                        {importStatus === 'idle' ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-[#D6D6B1]/10 text-[#D6D6B1] rounded-2xl">
                                                        <Database size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-white">Tenho um Backup</h3>
                                                        <p className="text-sm text-neutral-500">Importar ficheiro CSV desta app ou do TVShowtime.</p>
                                                    </div>
                                                </div>
                                                <label
                                                    htmlFor="csv-upload"
                                                    className="w-full py-4 bg-[#D6D6B1] text-black rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    <Upload size={18} strokeWidth={3} /> Escolher Ficheiro
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 py-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {importStatus === 'loading' && <div className="h-5 w-5 border-2 border-[#D6D6B1] border-t-white rounded-full animate-spin" />}
                                                        {importStatus === 'success' && <CheckCircle2 className="text-green-500" size={24} />}
                                                        {importStatus === 'error' && <AlertCircle className="text-red-500" size={24} />}
                                                        <span className="font-black text-white uppercase tracking-tighter">
                                                            {importStatus === 'loading' ? 'A Importar Dados' : importStatus === 'success' ? 'Carga Concluída' : 'Erro na Importação'}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-black text-neutral-500">{progress}%</span>
                                                </div>

                                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full ${importStatus === 'error' ? 'bg-red-500' : 'bg-[#D6D6B1]'}`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                    />
                                                </div>

                                                {importStatus === 'success' && (
                                                    <motion.button
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        onClick={finishOnboarding}
                                                        className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg flex items-center justify-center gap-2 animate-bounce mt-4 shadow-2xl"
                                                    >
                                                        Entrar na Aplicação
                                                    </motion.button>
                                                )}

                                                {importStatus === 'error' && (
                                                    <button
                                                        onClick={() => setImportStatus('idle')}
                                                        className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold text-sm"
                                                    >
                                                        Tentar novamente
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            id="csv-upload"
                                            ref={importRef}
                                            onChange={handleImport}
                                            accept=".csv, text/csv, text/plain"
                                            className="absolute inset-0 opacity-0 pointer-events-none"
                                        />
                                    </motion.div>

                                    {/* Option: Fresh Start */}
                                    {importStatus === 'idle' && (
                                        <motion.button
                                            variants={itemVariants}
                                            onClick={finishOnboarding}
                                            className="w-full p-6 bg-neutral-900 border border-white/5 hover:border-white/10 rounded-[32px] flex items-center gap-4 transition-all group active:scale-95 text-left"
                                        >
                                            <div className="p-3 bg-white/5 text-white/40 group-hover:text-white rounded-2xl transition-colors">
                                                <Sparkles size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-black text-white">Começar de Raiz</h3>
                                                <p className="text-sm text-neutral-500">Começar uma biblioteca nova e vazia.</p>
                                            </div>
                                            <ChevronRight className="text-neutral-700" size={24} />
                                        </motion.button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
