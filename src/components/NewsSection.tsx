'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, Clock, ChevronRight } from 'lucide-react';

interface NewsItem {
    title: string;
    source: string;
    date: string;
    url: string;
    image?: string;
    domain?: string;
}

interface NewsSectionProps {
    query: string;
    accentColor?: string;
}

export default function NewsSection({ query, accentColor = '#D6D6B1' }: NewsSectionProps) {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            if (!query) return;
            setLoading(true);
            try {
                // Fetching from Google News RSS
                // Refined query: exact title match in quotes + entertainment context keywords
                const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`"${query}" (movie OR series OR season OR "release date" OR cast)`)}&hl=pt-PT&gl=PT&ceid=PT:pt`;
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

                const response = await fetch(proxyUrl);
                const data = await response.json();

                if (data.contents) {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(data.contents, "text/xml");
                    const items = Array.from(xmlDoc.querySelectorAll("item")).slice(0, 4);

                    const parsedNews: NewsItem[] = await Promise.all(items.map(async (item) => {
                        const titleFull = item.querySelector("title")?.textContent || "";
                        const titleParts = titleFull.split(" - ");
                        const source = titleParts.pop() || "Notícias";
                        const originalTitle = titleParts.join(" - ");

                        const link = (item.querySelector("link")?.textContent || item.querySelector("guid")?.textContent || "").trim();
                        const pubDate = item.querySelector("pubDate")?.textContent || "";

                        // Relative time
                        const date = new Date(pubDate);
                        const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
                        let timeAgo = "Recente";
                        if (diff < 3600) timeAgo = `Há ${Math.floor(diff / 60)} min`;
                        else if (diff < 86400) timeAgo = `Há ${Math.floor(diff / 3600)}h`;
                        else timeAgo = `Há ${Math.floor(diff / 86400)}d`;

                        // Automatic Translation using Google's free translation endpoint
                        let translatedTitle = originalTitle;
                        try {
                            const transUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt-PT&dt=t&q=${encodeURIComponent(originalTitle)}`;
                            const transRes = await fetch(transUrl);
                            const transData = await transRes.json();
                            if (transData && transData[0] && transData[0][0]) {
                                translatedTitle = transData[0][0][0];
                            }
                        } catch (e) {
                            console.warn("Translation failed", e);
                        }

                        // Domain for favicon
                        let domain = "";
                        try {
                            const sourceEl = item.querySelector("source");
                            const sourceUrl = sourceEl?.getAttribute("url") || "";
                            if (sourceUrl) domain = new URL(sourceUrl).hostname;
                            else domain = new URL(link).hostname;
                        } catch (e) { }

                        // 3. Image extraction (Google News hides them in description HTML)
                        let image = "";
                        try {
                            const description = item.querySelector("description")?.textContent || "";
                            if (description) {
                                const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                                if (imgMatch && imgMatch[1]) {
                                    image = imgMatch[1];
                                    if (image.includes('favicon') || image.length < 10) image = "";
                                }
                            }
                        } catch (e) { }

                        return {
                            title: translatedTitle,
                            source,
                            date: timeAgo,
                            url: link,
                            domain,
                            image: image
                        };
                    }));

                    setNews(parsedNews);
                }
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [query]);

    if (!loading && news.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: accentColor }}>
                    <Newspaper size={22} /> Principais Notícias
                </h2>
                <a
                    href={`https://news.google.com/search?q=${encodeURIComponent(query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
                >
                    Ver todas <ChevronRight size={12} />
                </a>
            </div>

            <div className="flex flex-col gap-4">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="glass rounded-[24px] p-5 border border-white/5 animate-pulse flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-white/5 rounded w-1/3" />
                                <div className="h-3 bg-white/5 rounded w-1/6" />
                            </div>
                            <div className="h-4 bg-white/5 rounded w-full" />
                            <div className="h-4 bg-white/5 rounded w-3/4" />
                        </div>
                    ))
                ) : (
                    news.map((item, index) => (
                        <motion.a
                            key={index}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group glass rounded-[24px] p-5 border border-white/5 hover:border-white/20 transition-all active:scale-[0.98] flex gap-4 overflow-hidden relative items-center"
                        >
                            {item.image && (
                                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 bg-neutral-900/50">
                                    <img
                                        src={item.image}
                                        alt=""
                                        className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        {item.domain && (
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=64`}
                                                alt=""
                                                className="w-3.5 h-3.5 rounded-sm grayscale-[0.5] group-hover:grayscale-0 transition-all"
                                            />
                                        )}
                                        <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 group-hover:text-white transition-colors truncate">
                                            {item.source}
                                        </span>
                                    </div>
                                    <span className="w-1 h-1 rounded-full bg-neutral-700 flex-shrink-0" />
                                    <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-bold whitespace-nowrap">
                                        <Clock size={10} /> {item.date}
                                    </div>
                                </div>
                                <h3 className="text-sm font-bold text-neutral-200 group-hover:text-white transition-colors leading-snug line-clamp-2">
                                    {item.title}
                                </h3>
                            </div>

                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ExternalLink size={14} className="text-neutral-500" />
                            </div>
                        </motion.a>
                    ))
                )}
            </div>
        </div>
    );
}
