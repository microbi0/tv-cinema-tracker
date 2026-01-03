'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

interface CompletionOverlayProps {
    show: boolean;
    onClose: () => void;
    title: string;
    accentColor?: string;
}

export default function CompletionOverlay({ show, onClose, title, accentColor = '#3b82f6' }: CompletionOverlayProps) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none"
                >
                    {/* Backdrop Blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Content */}
                    <motion.div
                        initial={{ scale: 0.8, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="relative bg-neutral-900/80 border border-white/10 p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 text-center overflow-hidden"
                    >
                        {/* Animated background glow */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 -z-10"
                            style={{
                                background: `radial-gradient(circle at center, ${accentColor}33 0%, transparent 70%)`
                            }}
                        />

                        {/* Sparkles */}
                        <div className="absolute inset-0 pointer-events-none">
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1.5, 0],
                                        x: (Math.random() - 0.5) * 200,
                                        y: (Math.random() - 0.5) * 200,
                                    }}
                                    transition={{
                                        duration: 2,
                                        delay: i * 0.1,
                                        repeat: Infinity,
                                        repeatDelay: 0.5
                                    }}
                                    className="absolute left-1/2 top-1/2"
                                >
                                    <Sparkles size={16} style={{ color: accentColor }} className="fill-current" />
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
                            className="h-20 w-20 flex items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-inner"
                        >
                            <CheckCircle2 size={48} style={{ color: accentColor }} strokeWidth={3} />
                        </motion.div>

                        <div className="space-y-1">
                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-2xl font-black text-white uppercase tracking-tight"
                            >
                                Série Concluída
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="text-neutral-400 font-bold"
                            >
                                {title}
                            </motion.p>
                        </div>

                        {/* Progress Bar (Timer) */}
                        <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full overflow-hidden">
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 3, ease: "linear" }}
                                className="h-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
