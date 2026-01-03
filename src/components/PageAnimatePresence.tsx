'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { motion, Variants } from 'framer-motion';

export default function PageAnimatePresence({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const basePath = pathname.split('?')[0];

    const getDirection = () => {
        if (pathname.includes('/movies')) return 1;
        if (pathname.includes('/series')) return -1;
        return 0;
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [basePath]);

    const variants: Variants = {
        initial: (direction: number) => ({
            x: direction > 0 ? '50%' : direction < 0 ? '-50%' : 0,
            opacity: 0,
        }),
        animate: {
            x: 0,
            opacity: 1,
            transition: {
                x: {
                    type: 'spring',
                    stiffness: 350,
                    damping: 30,
                    mass: 0.8
                },
                opacity: { duration: 0.3 }
            }
        },
        exit: (direction: number) => ({
            x: direction > 0 ? '-20%' : direction < 0 ? '20%' : 0,
            opacity: 0,
            transition: {
                duration: 0.2,
                ease: 'easeIn'
            }
        })
    };

    return (
        <motion.div
            key={pathname}
            custom={getDirection()}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative w-full max-w-full bg-black min-h-screen pb-[50px]"
        >
            {children}
        </motion.div>
    );
}
