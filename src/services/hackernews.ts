import * as https from 'https';
import { HackerNewsItem, NewsItem } from '../types';

export class HackerNewsService {
    private baseUrl = 'https://hacker-news.firebaseio.com/v0';

    /**
     * Simple HTTPS GET request helper
     */
    private httpsGet(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                const statusCode = res.statusCode || 500;
                
                if (statusCode !== 200) {
                    reject(new Error(`Request failed with status code: ${statusCode}`));
                    return;
                }
                
                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        resolve(parsedData);
                    } catch (e) {
                        reject(new Error(`Error parsing JSON: ${e}`));
                    }
                });
            }).on('error', (e) => {
                reject(e);
            });
        });
    }

    async getTopStories(count: number = 20): Promise<NewsItem[]> {
        try {
            // Get top stories IDs
            const ids = await this.httpsGet(`${this.baseUrl}/topstories.json`);
            const topIds = ids.slice(0, count);
            
            // Fetch each story in parallel
            const storiesPromises = topIds.map((id: number) => this.getStory(id));
            const stories = await Promise.all(storiesPromises);
            
            // Filter out any null stories and map to NewsItem
            return stories
                .filter((story): story is HackerNewsItem => story !== null)
                .map(story => ({
                    title: story.title,
                    url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
                    source: 'Hacker News',
                    time: story.time,
                    score: story.score,
                    by: story.by,
                    descendants: story.descendants
                }));
        } catch (error) {
            console.error('Error fetching top stories:', error);
            return [];
        }
    }

    private async getStory(id: number): Promise<HackerNewsItem | null> {
        try {
            const data = await this.httpsGet(`${this.baseUrl}/item/${id}.json`);
            return data;
        } catch (error) {
            console.error(`Error fetching story ${id}:`, error);
            return null;
        }
    }

    formatTimeAgo(timestamp: number): string {
        const seconds = Math.floor((Date.now() / 1000) - timestamp);
        
        if (seconds < 60) {
            return `${seconds}s ago`;
        }
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours}h ago`;
        }
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}
