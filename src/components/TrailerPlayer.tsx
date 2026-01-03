'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrailerPlayerProps {
    videoKey: string | null;
    onClose: () => void;
}

export default function TrailerPlayer({ videoKey, onClose }: TrailerPlayerProps) {
    if (!videoKey) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <iframe
                        src={`https://www.youtube.com/embed/${videoKey}?autoplay=1`}
                        className="w-full h-full"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                    />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
