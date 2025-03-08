import * as vscode from 'vscode';
import { NewsItem } from './types';

/**
 * Create a webview panel to display news
 */
export function createWebviewPanel(context: vscode.ExtensionContext, newsItems: NewsItem[]): vscode.WebviewPanel {
    // Create and show panel
    const panel = vscode.window.createWebviewPanel(
        'devmindNews',
        'DevMind News',
        {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true
        },
        {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'images')
            ],
            enableFindWidget: true,
            retainContextWhenHidden: true,
            // Trust all content - this prevents the "Configure Trusted Domains" prompt
            enableCommandUris: true
        }
    );
    

    
    // Set panel icon
    panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'logo.png');
    
    try {
        // Get path to logo image
        const logoPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'logo.png');
        
        // Convert to webview URI
        const logoUri = panel.webview.asWebviewUri(logoPath);
        
        // Create the webview HTML with parsed Markdown and image URI
        panel.webview.html = getWebviewContent(panel.webview, newsItems, logoUri);
        
        // Handle webview messages
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        vscode.commands.executeCommand('devmind.refreshNews');
                        break;
                    case 'select':
                        if (typeof message.index === 'number') {
                            vscode.commands.executeCommand('devmind.selectNews', message.index);
                        }
                        break;
                    case 'open':
                        if (message.url) {
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    } catch (error) {
        console.error('Error creating webview content:', error);
        panel.webview.html = `<html><body><h1>Error loading content</h1><p>${error instanceof Error ? error.message : String(error)}</p></body></html>`;
    }
    
    return panel;
}

/**
 * Get configuration value with fallback
 */
function getConfig<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration('devmind');
    return config.get<T>(key, defaultValue);
}

function getWebviewContent(webview: vscode.Webview, newsItems: NewsItem[], logoUri: vscode.Uri): string {
    // Sort news items by time (newest first) before displaying
    const sortedItems = [...newsItems].sort((a, b) => {
        const timeA = a.time || 0;
        const timeB = b.time || 0;
        return timeB - timeA;
    });
    
    const newsListHtml = sortedItems.map((item, index) => {
        // Default background image if no thumbnail is available
        const backgroundImage = item.thumbnail ? 
            `url('${item.thumbnail}')` : 
            `url('https://source.unsplash.com/random/600x400?${encodeURIComponent(item.source)}')`;  
            
        return `
            <div class="news-card" data-index="${index}" data-url="${item.url}">
                <div class="card-bg" style="background-image: ${backgroundImage}"></div>
                <div class="card-overlay">
                    <div class="news-category">${item.source}</div>
                    <h2 class="news-title">${item.title}</h2>
                    <p class="news-excerpt">${item.excerpt || ''}</p>
                    <button class="read-more">Read More</button>
                </div>
            </div>
        `;
    }).join('');

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DevMind News</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: var(--vscode-font-family);
                line-height: 1.5;
                color: var(--vscode-foreground);
                background: var(--vscode-editor-background);
                padding: 1.5rem;
            }
            .container {
                max-width: 1200px;
                width: 100%;
                margin: 0 auto;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .header-left {
                display: flex;
                align-items: center;
            }

            .logo {
                height: 30px;
                width: auto;
                margin-right: 10px;
            }

            .header h1 {
                margin: 0;
                font-size: 1.75rem;
                font-weight: 600;
                color: var(--vscode-editor-foreground);
            }

            .news-container {
                max-width: 1200px;
                margin: 0 auto;
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 1rem;
            }
            
            .news-card {
                position: relative;
                height: 240px;
                border-radius: 4px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .news-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
            }
            
            .card-bg {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-size: cover;
                background-position: center;
                transition: transform 0.5s ease;
            }
            
            .news-card:hover .card-bg {
                transform: scale(1.05);
            }
            
            .card-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 70%);
                padding: 1rem;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
            }
            .news-category {
                font-size: 0.65rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 0.5rem;
                font-weight: 500;
            }
            
            .news-title {
                font-size: 1rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
                color: white;
                line-height: 1.3;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }

            .news-excerpt {
                color: rgba(255, 255, 255, 0.85);
                font-size: 0.8rem;
                line-height: 1.5;
                margin-bottom: 0.75rem;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .read-more {
                align-self: flex-end;
                background-color: transparent;
                color: white;
                border: none;
                padding: 0.25rem 0;
                font-size: 0.75rem;
                cursor: pointer;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
                text-decoration: underline;
            }
            
            .news-card:hover .read-more {
                opacity: 1;
                transform: translateY(0);
            }
            
            @media (max-width: 768px) {
                body {
                    padding: 1rem;
                }
                
                .news-container {
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 0.75rem;
                }
            }
            
            @media (max-width: 480px) {
                .news-container {
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                }
                
                .news-card {
                    height: 220px;
                }
            }
            
            .news-card.current {
                box-shadow: 0 0 0 3px var(--vscode-activityBarBadge-background), 0 4px 8px rgba(0, 0, 0, 0.2);
            }
            
            /* Fix for images that fail to load */
            .card-bg:after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.3);
                z-index: -1;
            }
            
            .news-date {
                font-size: 0.65em;
                color: rgba(255, 255, 255, 0.7);
                margin-left: 8px;
            }
            
            h1 {
                text-align: center;
                margin-bottom: 1.5rem;
                color: var(--vscode-editor-foreground);
                font-size: 1.75rem;
                font-weight: 600;
                max-width: 1200px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .controls {
                display: flex;
                justify-content: center;
                margin-top: 2rem;
            }
            
            .refresh-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 500;
                transition: background-color 0.2s ease;
            }
            
            .refresh-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>        
        <div class="news-container">
            ${newsListHtml}
        </div>
        
        <div class="controls">
            <button class="refresh-button">Refresh News</button>
        </div>

        <script>
            (function() {
                const vscode = acquireVsCodeApi();
                let currentNewsIndex = 0;
                let panelWidth = document.body.clientWidth;
                
                // Function to handle responsive container sizing
                function updateContainerSize() {
                    // We don't need to adjust anything for the card-based layout
                    // The CSS grid handles the responsiveness automatically
                }
                
                // Initial update
                updateContainerSize();
                
                // Listen for resize events
                window.addEventListener('resize', updateContainerSize);
                
                // Send message to extension that we're ready
                vscode.postMessage({ command: 'webviewReady' });
                
                // Handle refresh button click
                document.querySelector('.refresh-button').addEventListener('click', () => {
                    // Store current panel width before refresh
                    const currentWidth = document.body.clientWidth;
                    
                    // Send refresh command
                    vscode.postMessage({ command: 'refresh' });
                    
                    // After refresh, ensure we maintain the same width
                    setTimeout(() => {
                        updateContainerSize();
                        // Let extension know we're ready for content update
                        vscode.postMessage({ command: 'webviewReady' });
                    }, 300);
                });
                
                // Handle Read More button clicks
                document.querySelectorAll('.read-more').forEach(btn => {
                    btn.addEventListener('click', (event) => {
                        event.stopPropagation(); // Prevent event bubbling
                        
                        const card = btn.closest('.news-card');
                        if (!card) return;
                        
                        const index = parseInt(card.dataset.index, 10);
                        const url = card.dataset.url;
                        
                        // Update UI to show this item as selected
                        updateSelectedItem(index);
                        
                        // Open in browser
                        vscode.postMessage({ 
                            command: 'open',
                            url: url
                        });
                    });
                });
                
                // Make news cards selectable but not clickable
                document.querySelectorAll('.news-card').forEach(card => {
                    card.addEventListener('click', (event) => {
                        // Only select the card, don't open the URL
                        const index = parseInt(card.dataset.index, 10);
                        updateSelectedItem(index);
                        
                        // Send message to extension to update status bar
                        vscode.postMessage({
                            command: 'select',
                            index: index
                        });
                    });
                });
                
                // No duplicate event listeners needed here
                
                // Read more button removed
                
                // Function to update the selected news item
                function updateSelectedItem(index) {
                    // Remove current class from all cards
                    document.querySelectorAll('.news-card').forEach(card => {
                        card.classList.remove('current');
                    });
                    
                    // Add current class to selected card
                    const selectedCard = document.querySelector('.news-card[data-index="' + index + '"]');
                    if (selectedCard) {
                        selectedCard.classList.add('current');
                        // Scroll the card into view
                        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    
                    currentNewsIndex = index;
                }
                
                // Add status bar hover detection for pausing news rotation
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message && message.command === 'statusBarHoverState') {
                        vscode.postMessage({
                            command: 'setHoverState',
                            state: message.state
                        });
                    }
                });
                
                // Notify extension when mouse hovers over status bar items
                // This is a workaround since we can't directly access the status bar from the extension
                
                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.command) {
                        case 'updateNews':
                            // If we receive an update with the current index, highlight that item
                            if (typeof message.currentIndex === 'number') {
                                updateSelectedItem(message.currentIndex);
                            }
                            break;
                    }
                });
            })();
        </script>
    </body>
    </html>`;
}

/**
 * Format Unix timestamp to human-readable date
 */
function formatTimestamp(timestamp: number): string {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
}
