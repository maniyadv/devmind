import * as https from 'https';
import { IncomingMessage } from 'http';
import { NewsItem } from '../types';

/**
 * Service for fetching stories from Lobsters
 */
export class LobstersService {
    private baseUrl = 'lobste.rs';

    /**
     * Make an HTTPS request and return the response as JSON
     */
    private async makeRequest<T>(path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                path,
                method: 'GET',
                headers: {
                    'User-Agent': 'DevMind-VSCode-Extension/0.0.3',
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res: IncomingMessage) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Request failed with status code: ${res.statusCode}`));
                    return;
                }

                const chunks: Buffer[] = [];
                res.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    try {
                        const body = Buffer.concat(chunks).toString();
                        const data = JSON.parse(body);
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });
    }

    /**
     * Get the hottest stories from Lobsters
     */
    async getHotStories(count: number = 5): Promise<NewsItem[]> {
        try {
            const stories = await this.makeRequest<any[]>('/hottest.json');
            
            // Map Lobsters stories to NewsItem format
            return stories.slice(0, count).map(story => ({
                id: story.short_id,
                title: story.title,
                url: story.url || `https://lobste.rs/s/${story.short_id}`,
                score: story.score,
                by: story.submitter_user.username,
                time: new Date(story.created_at).getTime() / 1000, // Convert to seconds
                source: 'Lobsters'
            }));
        } catch (error: any) {
            console.error('Error fetching Lobsters stories:', error);
            throw new Error(`Error fetching Lobsters stories: ${error.message}`);
        }
    }
}
