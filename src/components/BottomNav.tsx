'use client';

import { Clapperboard, Tv, Search, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const isSearchOpen = searchParams.get('search') === 'true';

    const isActive = (path: string) => {
        const cleanPath = path.replace(/\/$/, '');
        const cleanPathname = pathname.replace(/\/$/, '') || '/';
        return cleanPathname === cleanPath || cleanPathname.startsWith(cleanPath + '/');
    };

    const toggleSearch = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (isSearchOpen) {
            params.delete('search');
        } else {
            params.set('search', 'true');
        }
        router.push(pathname + (params.toString() ? '?' + params.toString() : ''));
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            {/* Background Gradient for Contrast */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            <nav className="relative px-4 sm:px-6 pointer-events-auto" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
                <div className="mx-auto max-w-lg flex items-center justify-center gap-3 sm:gap-4">
                    {/* Main Navigation Pill */}
                    <div className="glass-dark flex items-center gap-1.5 rounded-full p-1.5 shadow-2xl border border-white/10">
                        <Link
                            href="/series"
                            className={`flex items-center gap-3 px-7 sm:px-8 py-4 sm:py-5 rounded-full transition-all duration-200 cubic-bezier(0.2, 0, 0, 1) ${isActive('/series')
                                ? 'bg-[#D6D6B1] text-black font-black shadow-lg'
                                : 'text-neutral-400 hover:text-white font-bold'
                                }`}
                        >
                            <Tv size={22} strokeWidth={isActive('/series') ? 3 : 2} />
                            <span className="text-xs sm:text-sm uppercase tracking-wider">Séries</span>
                        </Link>

                        <Link
                            href="/movies"
                            className={`flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full transition-all duration-200 cubic-bezier(0.2, 0, 0, 1) ${isActive('/movies')
                                ? 'bg-[#D6D6B1] text-black font-black shadow-lg'
                                : 'text-neutral-400 hover:text-white font-bold'
                                }`}
                        >
                            <Clapperboard size={22} strokeWidth={isActive('/movies') ? 3 : 2} />
                            <span className="text-xs sm:text-sm uppercase tracking-wider">Filmes</span>
                        </Link>
                    </div>

                    {/* Separate Search Button */}
                    <button
                        onClick={toggleSearch}
                        className={`flex h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center rounded-full shadow-2xl transition-all duration-200 cubic-bezier(0.2, 0, 0, 1) active:scale-95 border border-white/10 ${isSearchOpen
                            ? 'bg-[#D6D6B1] text-black border-[#D6D6B1]'
                            : 'glass-dark text-white'
                            }`}
                    >
                        <Search size={28} strokeWidth={3} />
                    </button>
                </div>
            </nav>
        </div>
    );
}
