export interface NewsItem {
    title: string;
    url: string;
    source: string;
    time: number;
    score?: number;
    by?: string;
    descendants?: number;
    excerpt?: string; // Added excerpt field for RSS content
    thumbnail?: string; // URL to thumbnail image
}

export interface HackerNewsItem {
    id: number;
    title: string;
    url?: string;
    time: number;
    score: number;
    by: string;
    descendants: number;
    type: string;
}
