import * as https from 'https';
import { NewsItem } from '../types';

export class DevToService {
    private baseUrl = 'https://dev.to/api';

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

    async getTopArticles(count: number = 10): Promise<NewsItem[]> {
        try {
            const data = await this.httpsGet(`${this.baseUrl}/articles?top=7&per_page=${count}`);
            
            return data.map((item: any) => ({
                title: item.title,
                url: item.url,
                source: 'DEV.to',
                time: new Date(item.published_at).getTime() / 1000, // Convert to Unix timestamp
                by: item.user.name,
                score: item.public_reactions_count
            }));
        } catch (error) {
            console.error('Error fetching DEV.to articles:', error);
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
