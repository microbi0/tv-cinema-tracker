'use client';

import Image from 'next/image';
import { getImageUrl } from '@/lib/tmdb';

import { useRouter, useSearchParams } from 'next/navigation';

interface CastMember {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
}

interface CastSliderProps {
    cast: CastMember[];
    accentColor?: string;
}

export default function CastSlider({ cast, accentColor }: CastSliderProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    if (!cast || cast.length === 0) return null;

    const openPerson = (id: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('personId', id.toString());
        router.push(window.location.pathname + '?' + params.toString(), { scroll: false });
    };

    return (
        <div className="mt-4 mb-4">
            <h2 className="text-xl font-bold mb-4 px-0" style={{ color: accentColor }}>Elenco</h2>
            <div className="relative flex gap-6 overflow-x-auto pb-6 -mx-5 px-5 no-scrollbar">
                {cast.slice(0, 15).map((member) => {
                    const profileUrl = getImageUrl(member.profile_path, 'small');
                    return (
                        <div
                            key={member.id}
                            className="flex-shrink-0 w-40 cursor-pointer active:scale-95 transition-transform"
                            onClick={() => openPerson(member.id)}
                        >
                            <div className="relative h-36 w-36 mx-auto rounded-full overflow-hidden mb-4 bg-neutral-800 border-2 border-white/20 shadow-2xl">
                                {profileUrl ? (
                                    <Image
                                        src={profileUrl}
                                        alt={member.name}
                                        fill
                                        className="object-cover scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-neutral-600 text-xs text-center px-2">
                                        Sem Foto
                                    </div>
                                )}
                            </div>
                            <p
                                className="text-lg font-black line-clamp-2 text-center leading-[1.1] min-h-[2.5rem] flex items-center justify-center tracking-tight text-white"
                            >
                                {member.name}
                            </p>
                            <p className="text-sm text-neutral-400 font-medium truncate text-center leading-tight mt-1">{member.character}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
