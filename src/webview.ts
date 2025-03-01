import * as vscode from 'vscode';
import { NewsItem } from './types';

/**
 * Create a webview panel to display all news items
 */
export function createWebviewPanel(context: vscode.ExtensionContext, newsItems: NewsItem[]): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
        'devmindNews',
        'DevMind News',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'media'),
                vscode.Uri.joinPath(context.extensionUri, 'images')
            ]
        }
    );
    
    try {
        // Get extension paths
        const logoPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'logo.png');
        
        // Use webview URI for resources
        const logoUri = panel.webview.asWebviewUri(logoPath);
        
        // Create the webview HTML with parsed Markdown and image URI
        panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DevMind News</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    font-size: var(--vscode-font-size);
                }
                .header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 15px;
                }
                .header-left {
                    display: flex;
                    align-items: center;
                }
                .header img {
                    height: 40px;
                    margin-right: 10px;
                }
                .header h1 {
                    margin: 0;
                    color: var(--vscode-foreground);
                }
                .refresh-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .refresh-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .news-item {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    margin-bottom: 20px;
                    padding-bottom: 20px;
                }
                .news-item:last-child {
                    border-bottom: none;
                }
                .news-item h2 {
                    margin-top: 0;
                    margin-bottom: 8px;
                    color: var(--vscode-editor-foreground);
                }
                .news-meta {
                    margin-bottom: 10px;
                    color: var(--vscode-descriptionForeground);
                    font-size: 0.9em;
                }
                .source-tag {
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.8em;
                    margin-right: 8px;
                }
                .news-item a {
                    color: var(--vscode-textLink-foreground);
                    text-decoration: none;
                }
                .news-item a:hover {
                    text-decoration: underline;
                }
                .browser-link {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground) !important;
                    padding: 6px 12px;
                    margin-top: 12px;
                    display: inline-block;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: 500;
                }
                .browser-link:hover {
                    background-color: var(--vscode-button-hoverBackground);
                    text-decoration: none !important;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-left">
                    <img src="${logoUri}" alt="DevMind Logo">
                    <h1>DevMind News</h1>
                </div>
                <button class="refresh-button" onclick="refreshNews()">
                    <span style="font-family: codicon;">↻</span> Refresh
                </button>
            </div>
            
            <div class="news-container">
                ${newsItems.map((item, index) => {
                    // Extract domain from URL for display
                    let domain = '';
                    try {
                        const url = new URL(item.url);
                        domain = url.hostname.replace('www.', '');
                    } catch (error) {
                        domain = 'news.ycombinator.com';
                    }
                    
                    return `
                    <div class="news-item" id="news-${index}">
                        <h2>${item.title}</h2>
                        <div class="news-meta">
                            <span class="source-tag">${item.source}</span>
                            ${item.by ? `by <strong>${item.by}</strong>` : ''}
                            ${item.time ? `on <strong>${new Date(item.time * 1000).toLocaleDateString()}</strong>` : ''}
                            ${item.score ? `with score <strong>${item.score}</strong>` : ''}
                        </div>
                        <p>
                            <a href="${item.url}" class="browser-link">Open in Browser (${domain})</a>
                        </p>
                    </div>
                    `;
                }).join('')}
            </div>
            
            <script>
                function refreshNews() {
                    // Send message to extension to refresh news
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({
                        command: 'refresh'
                    });
                }
                
                // Handle messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.command) {
                        case 'refreshComplete':
                            // Refresh was completed, could show a notification or update UI
                            console.log('News refreshed');
                            break;
                    }
                });
            </script>
        </body>
        </html>
        `;
        
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        // Refresh the news
                        vscode.commands.executeCommand('devmind.refreshNews')
                            .then(() => {
                                // Send message back to webview that refresh is complete
                                panel.webview.postMessage({ command: 'refreshComplete' });
                            });
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    } catch (error: any) {
        console.error('Error creating webview panel:', error);
        panel.webview.html = `
        <html>
            <body>
                <h1>Error loading news</h1>
                <p>${error.message}</p>
            </body>
        </html>
        `;
    }
    
    return panel;
}

/**
 * Generate the HTML content for the webview
 */
export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, items: NewsItem[]): string {
    // Get safe URI for icon
    const iconUri = webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'images', 'logo.png')
    );

    function formatTimeAgo(timestamp: number): string {
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

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                padding: 20px;
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
                font-family: var(--vscode-font-family);
                max-width: 800px;
                margin: 0 auto;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .header h1 {
                margin: 0;
                display: flex;
                align-items: center;
                font-size: 24px;
                color: var(--vscode-foreground);
            }
            .header h1 img {
                width: 32px;
                height: 32px;
                margin-right: 10px;
            }
            .refresh-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
            }
            .news-item {
                margin-bottom: 25px;
                padding: 16px;
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
                animation: fadeIn 0.5s ease-out;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .news-title {
                font-size: 16px;
                font-weight: 500;
                margin-bottom: 10px;
                cursor: pointer;
                color: var(--vscode-textLink-foreground);
            }
            .news-title:hover {
                text-decoration: underline;
            }
            .news-meta {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-top: 12px;
            }
            .news-source {
                font-weight: bold;
            }
            .open-button {
                background-color: var(--vscode-button-secondaryBackground);
                color: var(--vscode-button-secondaryForeground);
                border: none;
                padding: 6px 12px;
                cursor: pointer;
                border-radius: 3px;
                font-size: 12px;
                margin-top: 10px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1><img src="${iconUri}" alt="DevMind Logo">DevMind News</h1>
            <button class="refresh-button" onclick="refreshNews()">Refresh</button>
        </div>
        
        <div id="news-container">
            ${items.length === 0 
              ? '<div>No news items available. Click refresh to try again.</div>' 
              : items.map((item, index) => `
                <div class="news-item" style="animation-delay: ${index * 0.1}s">
                    <div class="news-title" onclick="openUrl('${item.url}')">${item.title}</div>
                    <div class="news-meta">
                        <span class="news-source">${item.source}</span> | 
                        ${item.by ? `<span>${item.by}</span> | ` : ''}
                        ${item.score ? `<span>${item.score} points</span> | ` : ''}
                        ${item.descendants ? `<span>${item.descendants} comments</span> | ` : ''}
                        <span>${formatTimeAgo(item.time)}</span>
                    </div>
                    <button class="open-button" onclick="openUrl('${item.url}')">Open in Browser</button>
                </div>
              `).join('')}
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            
            function refreshNews() {
                vscode.postMessage({ command: 'refresh' });
            }
            
            function openUrl(url) {
                vscode.postMessage({ command: 'openUrl', url: url });
            }
        </script>
    </body>
    </html>`;
}
