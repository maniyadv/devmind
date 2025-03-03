import * as vscode from 'vscode';
import * as RssParser from 'rss-parser';
import { NewsItem } from '../types';

// Define custom interface to extend RssParser.Item with our needed fields
interface CustomItem extends RssParser.Item {
    content?: string;
    description?: string;
    author?: string;
    'media:content'?: {
        $: {
            url?: string;
            medium?: string;
        };
    }[];
    enclosure?: RssParser.Enclosure;
}

// Create a custom parser type
type CustomParser = RssParser<{item: CustomItem}>;

// Define RSS feed sources
const RSS_FEEDS = [
    {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/'
    },
    {
        name: 'DEV.to',
        url: 'https://dev.to/feed/'
    },
    {
        name: 'Hacker Noon',
        url: 'https://hackernoon.com/feed'
    },
    {
        name: 'FreeCodeCamp',
        url: 'https://www.freecodecamp.org/news/rss/'
    }
];

export class RssService {
    private parser: CustomParser;
    private outputChannel: vscode.OutputChannel;
    
    constructor(outputChannel: vscode.OutputChannel) {
        this.parser = new RssParser({
            customFields: {
                item: [
                    ['content:encoded', 'content'],
                    ['description', 'description']
                ]
            }
        });
        this.outputChannel = outputChannel;
    }
    
    /**
     * Fetch news from all RSS feeds
     */
    async fetchNews(maxItems: number = 20): Promise<NewsItem[]> {
        this.outputChannel.appendLine(`Fetching news from RSS feeds at ${new Date().toLocaleString()}`);
        
        try {
            // Fetch from all sources in parallel
            const allPromises = RSS_FEEDS.map(feed => this.fetchFromSource(feed.name, feed.url));
            const results = await Promise.allSettled(allPromises);
            
            // Collect successful results
            const allNews: NewsItem[] = [];
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    allNews.push(...result.value);
                    this.outputChannel.appendLine(`✅ Successfully fetched ${result.value.length} items from ${RSS_FEEDS[index].name}`);
                } else {
                    this.outputChannel.appendLine(`❌ Failed to fetch from ${RSS_FEEDS[index].name}: ${result.reason}`);
                }
            });
            
            // Shuffle and limit
            return this.shuffleAndLimit(allNews, maxItems);
        } catch (error) {
            this.outputChannel.appendLine(`Error fetching RSS news: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    
    /**
     * Fetch news from a specific RSS source
     */
    private async fetchFromSource(sourceName: string, feedUrl: string): Promise<NewsItem[]> {
        try {
            const feed = await this.parser.parseURL(feedUrl);
            
            return feed.items.map((item: CustomItem) => {
                // Extract excerpt from content or description
                let excerpt = '';
                if (item.content) {
                    // Remove HTML tags for plain text excerpt
                    excerpt = this.stripHtml(item.content).substring(0, 200) + '...';
                } else if (item.description) {
                    excerpt = this.stripHtml(item.description).substring(0, 200) + '...';
                }
                
                // Extract thumbnail from media:content, enclosure, or from content
                let thumbnail = '';
                
                // Try to get from media:content
                if (item['media:content'] && item['media:content'].length > 0) {
                    const mediaContent = item['media:content'].find(media => 
                        media.$ && media.$.medium === 'image' && media.$.url
                    );
                    if (mediaContent && mediaContent.$ && mediaContent.$.url) {
                        thumbnail = mediaContent.$.url;
                    }
                }
                
                // If no thumbnail yet, try enclosure
                if (!thumbnail && item.enclosure && item.enclosure.url && 
                    item.enclosure.type && item.enclosure.type.startsWith('image/')) {
                    thumbnail = item.enclosure.url;
                }
                
                // If still no thumbnail, try to extract first image from content or description
                if (!thumbnail) {
                    thumbnail = this.extractFirstImageUrl(item.content || item.description || '');
                }
                
                return {
                    title: item.title || 'Untitled',
                    url: item.link || '',
                    source: sourceName,
                    time: item.isoDate ? new Date(item.isoDate).getTime() / 1000 : Date.now() / 1000,
                    excerpt: excerpt,
                    by: item.creator || item.author || 'Unknown',
                    thumbnail: thumbnail
                } as NewsItem;
            });
        } catch (error) {
            this.outputChannel.appendLine(`Error fetching from ${sourceName}: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    
    /**
     * Extract the first image URL from HTML content
     */
    private extractFirstImageUrl(html: string): string {
        const imgRegex = /<img[^>]+src="([^">]+)"/i;
        const match = html.match(imgRegex);
        return match ? match[1] : '';
    }
    
    /**
     * Shuffle array in-place using Fisher-Yates algorithm
     */
    private shuffleArray(array: any[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    /**
     * Strip HTML tags from a string
     */
    private stripHtml(html: string): string {
        // Simple HTML tag removal
        return html.replace(/<[^>]*>?/gm, '').trim();
    }
    
    /**
     * Shuffle array and limit to specified count
     */
    private shuffleAndLimit<T>(array: T[], limit: number): T[] {
        // Fisher-Yates shuffle
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        
        // Limit to specified count
        return array.slice(0, limit);
    }
}
