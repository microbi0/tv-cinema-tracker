'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useTracking } from '@/hooks/useTracking';
import { Upload, CheckCircle2, ChevronRight, X, Database, Clapperboard, Monitor, Sparkles, AlertCircle, Bell, ShieldCheck, Zap, Info, HelpCircle, ExternalLink } from 'lucide-react';

export default function Onboarding() {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [apiKey, setApiKey] = useState('');
    const [apiToken, setApiToken] = useState('');
    const { importFromCSV, watched, watchlist, favorites, trackingLoading } = useTracking();
    const [isVisible, setIsVisible] = useState(false);
    const [step, setStep] = useState(1);
    const [showWhy, setShowWhy] = useState(false);
    const [showHow, setShowHow] = useState(false);
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
        saveApiKeys();
        localStorage.setItem('cinetracker_onboarded', 'true');
        setIsVisible(false);
    };

    const saveApiKeys = () => {
        if (apiKey) localStorage.setItem('cinetracker_api_key', apiKey);
        if (apiToken) localStorage.setItem('cinetracker_api_token', apiToken);
        // Dispatch event if needed, but tmdb.ts reads directly from localStorage on fetch
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
                        background: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0) 70%)'
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
                                        onClick={() => setStep(2)}
                                        className="w-full py-5 bg-white text-black rounded-3xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xl shadow-white/10"
                                    >
                                        Continuar <ChevronRight size={20} strokeWidth={3} />
                                    </button>
                                </motion.div>
                            </motion.div>
                        ) : step === 2 ? (
                            <motion.div
                                key="step2"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit={{ x: -20, opacity: 0 }}
                                className="space-y-8"
                            >
                                <motion.div variants={itemVariants} className="space-y-4 text-center">
                                    <div className="flex justify-center mb-6">
                                        <img src="/TMDB.svg" alt="TMDB Logo" className="h-4 opacity-80" />
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tighter text-white">Configuração TMDB</h2>
                                    <p className="text-neutral-400 text-sm leading-relaxed font-medium">
                                        Para que a aplicação consiga carregar todos os conteúdos (posters, trailers e detalhes), necessitas de criar uma conta no TMDB e introduzir aqui as tuas chaves da API.
                                    </p>

                                    <div className="flex gap-2 justify-center pt-2">
                                        <button
                                            onClick={() => setShowWhy(true)}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[11px] font-black uppercase tracking-tighter text-neutral-400 hover:text-white transition-all outline-none"
                                        >
                                            Porquê?
                                        </button>
                                        <button
                                            onClick={() => setShowHow(true)}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[11px] font-black uppercase tracking-tighter text-neutral-400 hover:text-white transition-all outline-none"
                                        >
                                            Como fazer isto?
                                        </button>
                                    </div>
                                </motion.div>

                                <motion.div variants={itemVariants} className="space-y-4 bg-neutral-900/50 p-6 rounded-[32px] border border-white/5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-neutral-500 ml-1">API Key (v3)</label>
                                        <input
                                            type="text"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="Ex: 2670..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-500/50 transition-colors font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-neutral-500 ml-1">Access Token (v4 Auth)</label>
                                        <textarea
                                            value={apiToken}
                                            onChange={(e) => setApiToken(e.target.value)}
                                            placeholder="Ex: eyJh..."
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-500/50 transition-colors font-mono resize-none"
                                        />
                                    </div>

                                </motion.div>

                                <motion.div variants={itemVariants} className="space-y-3">
                                    <button
                                        disabled={!apiKey || !apiToken}
                                        onClick={() => { saveApiKeys(); setStep(3); }}
                                        className="w-full py-5 bg-white text-black rounded-3xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xl disabled:opacity-50 disabled:scale-100"
                                    >
                                        Próximo Passo <ChevronRight size={20} strokeWidth={3} />
                                    </button>
                                </motion.div>

                                {/* Info Overlays */}
                                <AnimatePresence>
                                    {(showWhy || showHow) && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                            className="absolute inset-0 z-[150] bg-neutral-900 p-8 rounded-[40px] flex flex-col justify-center border border-white/10 shadow-3xl"
                                        >
                                            <button
                                                onClick={() => { setShowWhy(false); setShowHow(false); }}
                                                className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
                                            >
                                                <X size={20} />
                                            </button>

                                            {showWhy && (
                                                <div className="space-y-6">
                                                    <div className="p-4 bg-white/10 text-white rounded-2xl w-fit">
                                                        <HelpCircle size={32} />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-white tracking-tighter">Porquê as minhas chaves?</h3>
                                                    <div className="space-y-4 text-neutral-400 text-sm leading-relaxed">
                                                        <p>
                                                            Esta aplicação é um projeto <span className="font-bold text-white text-blue-400/80">independente, gratuito e privado</span>. Como não cobramos qualquer subscrição, não podemos fornecer uma chave de API global.
                                                        </p>
                                                        <p>
                                                            O TMDB disponibiliza o seu catálogo gratuitamente para <span className="font-bold text-white">uso pessoal</span>. Ao usares a tua própria chave, garantes que a aplicação funciona sempre para ti, sem depender de limites de terceiros e sem custos de manutenção.
                                                        </p>
                                                        <p>
                                                            Além disso, isto garante que a tua privacidade é total: o tráfego de dados é feito diretamente entre o teu dispositivo e o TMDB.
                                                        </p><p>
                                                            É chato? Um pouco, mas só tens de o fazer uma vez!
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {showHow && (
                                                <div className="space-y-6">
                                                    <div className="p-4 bg-white/10 text-white rounded-2xl w-fit">
                                                        <Zap size={32} />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-white tracking-tighter">Passo a passo</h3>
                                                    <div className="space-y-4">
                                                        {[
                                                            { text: "Cria uma conta no TMDB", link: "https://www.themoviedb.org/signup" },
                                                            { text: "Acede às tuas Definições de API", link: "https://www.themoviedb.org/settings/api" },
                                                            { text: "Clica em 'Create' para registar uma nova App (pode ser 'Personal') para obteres os teus códigos." },
                                                            { text: "Copia a 'API Key (v3)' e o 'Access Token (v4)' para os campos abaixo." }
                                                        ].map((item, i) => (
                                                            <div key={i} className="flex gap-4 items-start">
                                                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-white border border-white/10">{i + 1}</span>
                                                                <div className="space-y-1">
                                                                    <p className="text-sm text-neutral-400 leading-snug">{item.text}</p>
                                                                    {item.link && (
                                                                        <a
                                                                            href={item.link}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-[11px] text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
                                                                        >
                                                                            Abrir página <ExternalLink size={10} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => { setShowWhy(false); setShowHow(false); }}
                                                className="mt-10 w-full py-4 bg-white/5 hover:bg-white text-white hover:text-black rounded-2xl font-black text-sm transition-all"
                                            >
                                                Entendido
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
                                    <p className="text-neutral-500 font-medium italic text-sm">Podes importar os teus dados agora ou configurar depois.</p>
                                </motion.div>

                                <div className="space-y-4">
                                    {/* Option: Import */}
                                    <motion.div variants={itemVariants} className={`p-6 rounded-[32px] border transition-all ${importStatus === 'idle' ? 'bg-neutral-900 border-white/5 hover:border-white/10' : 'bg-neutral-900 border-white/20'}`}>
                                        {importStatus === 'idle' ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl">
                                                        <Database size={24} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-white">Tenho um Backup</h3>
                                                        <p className="text-sm text-neutral-500">Importar ficheiro CSV desta app ou do TVShowtime.</p>
                                                    </div>
                                                </div>
                                                <label
                                                    htmlFor="csv-upload"
                                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    <Upload size={18} strokeWidth={3} /> Escolher Ficheiro
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 py-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {importStatus === 'loading' && <div className="h-5 w-5 border-2 border-blue-500 border-t-white rounded-full animate-spin" />}
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
                                                        className={`h-full ${importStatus === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}
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
