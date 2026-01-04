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
            <div className="relative flex gap-6 overflow-x-auto pb-6 -mx-5 px-5 no-scrollbar">
                {cast.slice(0, 15).map((member) => {
                    const profileUrl = getImageUrl(member.profile_path, 'small');
                    return (
                        <div
                            key={member.id}
                            className="flex-shrink-0 w-24 cursor-pointer active:scale-95 transition-transform"
                            onClick={() => openPerson(member.id)}
                        >
                            <div className="relative h-32 w-24 rounded-2xl overflow-hidden mb-2 bg-neutral-800 border border-white/10 shadow-xl">
                                {profileUrl ? (
                                    <Image
                                        src={profileUrl}
                                        alt={member.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-neutral-600 text-[10px] text-center px-1">
                                        Sem Foto
                                    </div>
                                )}
                            </div>
                            <p
                                className="text-sm font-bold line-clamp-2 text-center leading-tight min-h-[2.5rem] flex items-center justify-center tracking-tight text-white px-0.5"
                            >
                                {member.name}
                            </p>
                            <p className="text-xs text-neutral-400 font-medium truncate text-center leading-tight mt-0.5">{member.character}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
