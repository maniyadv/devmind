import * as https from 'https';
import { NewsItem } from '../types';

export class GitHubService {
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

    async getTrendingRepos(language: string = 'javascript', period: string = 'daily', count: number = 10): Promise<NewsItem[]> {
        try {
            // GitHub's trending API is not official, using scraping-friendly endpoint
            const data = await this.httpsGet(
                `https://api.gitterapp.com/repositories?language=${language}&since=${period}&spokenLanguage=en`
            );
            
            return data.slice(0, count).map((item: any) => ({
                title: `${item.author}/${item.name}: ${item.description || ''}`,
                url: `https://github.com/${item.author}/${item.name}`,
                source: 'GitHub Trending',
                time: new Date().getTime() / 1000, // Current time as timestamp
                score: item.stars,
                by: item.author
            }));
        } catch (error) {
            console.error('Error fetching GitHub trending repos:', error);
            return [];
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
