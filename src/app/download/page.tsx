'use client';

import { motion } from 'framer-motion';
import { Smartphone, Download, Check, ShieldCheck, Zap, Star, Tv, Clapperboard } from 'lucide-react';

export default function DownloadPage() {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-[#D6D6B1] selection:text-black">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D6D6B1]/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-[#D6D6B1]/5 blur-[100px] rounded-full" />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 px-6 py-8 flex items-center justify-between max-w-6xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#D6D6B1] rounded-xl flex items-center justify-center shadow-lg shadow-[#D6D6B1]/20">
                        <Clapperboard size={20} className="text-black" />
                    </div>
                    <span className="text-xl font-black tracking-tighter">TV & CINEMA</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
                    <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
                    <a href="#install" className="hover:text-white transition-colors">Como Instalar</a>
                </div>
            </nav>

            <main className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-24">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Hero Content */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#D6D6B1] text-xs font-bold uppercase tracking-widest"
                        >
                            <Zap size={14} fill="currentColor" />
                            Versão Android v1.2.0 disponível
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h1 className="text-6xl md:text-7xl font-black leading-[0.9] tracking-tighter mb-6">
                                O Teu Tracker,<br />
                                <span className="text-[#D6D6B1]">Redefinido.</span>
                            </h1>
                            <p className="text-lg text-neutral-400 max-w-md leading-relaxed">
                                Organiza os teus filmes e séries com uma experiência premium.
                                Notificações de episódios, trailers e a tua biblioteca sempre contigo.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <a
                                href="/tv-cinema-tracker/download/tv-cinema.apk"
                                download
                                className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-[#D6D6B1] text-black rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all group"
                            >
                                <Download size={24} strokeWidth={3} />
                                DESCARREGAR APK
                            </a>
                            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/10">
                                <ShieldCheck className="text-[#D6D6B1]" />
                                <div className="text-xs">
                                    <div className="font-bold text-white">APK Seguro</div>
                                    <div className="text-neutral-500 text-[10px]">Verificado e Livre de Adware</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick Features */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10"
                        >
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#D6D6B1]/10 flex items-center justify-center flex-shrink-0">
                                    <Tv size={18} className="text-[#D6D6B1]" />
                                </div>
                                <div className="text-sm">
                                    <div className="font-bold">Sync Automático</div>
                                    <div className="text-neutral-500 text-xs text-balance">Track de episódios em real-time.</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#D6D6B1]/10 flex items-center justify-center flex-shrink-0">
                                    <Star size={18} className="text-[#D6D6B1]" />
                                </div>
                                <div className="text-sm">
                                    <div className="font-bold">Favoritos & Watchlist</div>
                                    <div className="text-neutral-500 text-xs text-balance">Personaliza a tua biblioteca ideal.</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Mockup Preview */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                        animate={{ opacity: 1, scale: 1, rotate: -2 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 50 }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-[#D6D6B1]/20 blur-[100px] rounded-full scale-75" />
                        <div className="relative mx-auto w-[280px] h-[580px] bg-[#111] rounded-[3rem] border-[8px] border-neutral-800 shadow-2xl overflow-hidden">
                            {/* Phone Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-neutral-800 rounded-b-2xl z-20" />

                            {/* App Content */}
                            <div className="w-full h-full bg-black relative">
                                <img
                                    src="/tv-cinema-tracker/app-screenshot.png"
                                    alt="App Screenshot"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        {/* Floating elements */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-6 -right-6 p-4 rounded-2xl bg-[#111] border border-white/10 shadow-xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                    <Check size={16} strokeWidth={3} />
                                </div>
                                <div className="text-xs font-bold">Instalação Simples</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </main>

            {/* Installation Steps Section */}
            <section id="install" className="relative z-10 border-t border-white/5 bg-white/[0.02] py-24">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-3xl font-black mb-12 text-center">Como instalar no teu Android</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: "01", title: "Download", text: "Clica no botão de download para iniciares o descarregamento do ficheiro APK." },
                            { step: "02", title: "Permissões", text: "Se pedido, ativa a opção 'Instalar apps de fontes desconhecidas' nas definições." },
                            { step: "03", title: "Concluir", text: "Abre o ficheiro e clica em instalar. Estás pronto para começar!" }
                        ].map((item, i) => (
                            <div key={i} className="space-y-4">
                                <div className="text-[#D6D6B1] font-black text-4xl opacity-50">{item.step}</div>
                                <h3 className="font-bold text-lg">{item.title}</h3>
                                <p className="text-sm text-neutral-500 leading-relaxed">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <footer className="relative z-10 border-t border-white/5 py-12 text-center text-neutral-600 text-xs">
                <p>&copy; 2024 TV & Cinema Tracker. Made with passion for movie lovers.</p>
            </footer>
        </div>
    );
}
