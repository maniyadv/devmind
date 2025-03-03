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
    const newsListHtml = newsItems.map((item, index) => {
        const thumbnail = item.thumbnail 
            ? `<div class="news-thumbnail-container">
                <img class="news-thumbnail" src="${item.thumbnail}" alt="Thumbnail">
              </div>` 
            : '';
            
        const excerpt = item.excerpt 
            ? `<div class="news-excerpt">${item.excerpt}</div>` 
            : '';
            
        return `
            <div class="news-item" data-index="${index}" data-url="${item.url}">
                <div class="news-labels">
                    <span class="news-source">${item.source}</span>
                    <span class="news-date">${formatTimestamp(item.time)}</span>
                </div>
                <h3 class="news-title">${item.title}</h3>
                <div class="news-meta">
                    ${item.by ? `<span class="news-author">By ${item.by}</span>` : ''}
                </div>
                ${thumbnail}
                ${excerpt}
                <div class="news-read-more">
                    <button class="read-more-button">Read More</button>
                </div>
            </div>
        `;
    }).join('');

    const maxPanelWidth = getConfig<number>('panel.maxWidth', 500);

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DevMind News</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                padding: 12px;
                color: var(--vscode-foreground);
                max-width: ${maxPanelWidth}px;
                margin: 0 auto;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 6px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .header-left {
                display: flex;
                align-items: center;
            }
            .logo {
                width: 16px;
                height: 16px;
                margin-right: 6px;
            }
            .header h1 {
                margin: 0;
                font-size: 1em;
                color: var(--vscode-editor-foreground);
            }
            .news-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .news-item {
                padding: 10px;
                border-radius: 4px;
                background-color: var(--vscode-editor-inactiveSelectionBackground);
                transition: transform 0.2s ease;
                cursor: pointer;
                margin-bottom: 10px;
                position: relative;
            }
            .news-item:hover {
                transform: translateY(-2px);
                background-color: var(--vscode-editor-selectionBackground);
            }
            .news-item.current {
                border-left: 3px solid var(--vscode-activityBarBadge-background);
                background-color: var(--vscode-editor-selectionBackground);
            }
            .news-labels {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            .news-source {
                display: inline-block;
                padding: 1px 4px;
                border-radius: 2px;
                font-size: 0.65em;
                background-color: var(--vscode-badge-background);
                color: var(--vscode-badge-foreground);
            }
            .news-date {
                font-size: 0.65em;
                color: var(--vscode-descriptionForeground);
            }
            .news-title {
                font-size: 0.95em;
                font-weight: bold;
                margin-top: 0;
                margin-bottom: 5px;
                color: var(--vscode-editor-foreground);
            }
            .news-meta {
                display: flex;
                justify-content: space-between;
                font-size: 0.75em;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 6px;
            }
            .news-author {
                font-style: italic;
            }
            .news-excerpt {
                margin-top: 6px;
                font-size: 0.85em;
                line-height: 1.3;
                color: var(--vscode-foreground);
                opacity: 0.9;
                margin-bottom: 10px;
            }
            .news-thumbnail {
                max-width: 100%;
                max-height: 150px;
                margin-bottom: 10px;
                border-radius: 3px;
            }
            .news-thumbnail-container {
                text-align: center;
                margin-bottom: 10px;
            }
            .refresh-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 2px 6px;
                border-radius: 2px;
                cursor: pointer;
                font-size: 10px;
                font-weight: 500;
            }
            .refresh-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .news-read-more {
                opacity: 0;
                position: absolute;
                right: 10px;
                bottom: 10px;
                transition: opacity 0.2s ease;
            }
            .news-item:hover .news-read-more {
                opacity: 1;
            }
            .read-more-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 2px 5px;
                border-radius: 2px;
                cursor: pointer;
                font-size: 0.7em;
            }
            .read-more-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="header-left">
                <img class="logo" src="${logoUri}" alt="DevMind Logo">
                <h1>DevMind News</h1>
            </div>
            <button class="refresh-button">Refresh</button>
        </div>
        <div class="news-list">
            ${newsListHtml}
        </div>

        <script>
            (function() {
                const vscode = acquireVsCodeApi();
                let currentNewsIndex = 0;
                
                // Handle refresh button click
                document.querySelector('.refresh-button').addEventListener('click', () => {
                    vscode.postMessage({ command: 'refresh' });
                });
                
                // Handle news item clicks
                document.querySelectorAll('.news-item').forEach(item => {
                    item.addEventListener('click', (event) => {
                        // Don't trigger if clicking on the read more button
                        if (event.target.classList.contains('read-more-button')) {
                            return;
                        }
                        
                        const index = parseInt(item.dataset.index, 10);
                        const url = item.dataset.url;
                        
                        // If Cmd/Ctrl key is pressed, open in browser
                        if (event.metaKey || event.ctrlKey) {
                            vscode.postMessage({ 
                                command: 'open',
                                url: url
                            });
                        } else {
                            // Otherwise, select this news item
                            vscode.postMessage({ 
                                command: 'select',
                                index: index
                            });
                            
                            // Update UI to show this item as selected
                            updateSelectedItem(index);
                        }
                    });
                });
                
                // Handle read more button clicks
                document.querySelectorAll('.read-more-button').forEach(button => {
                    button.addEventListener('click', (event) => {
                        event.stopPropagation(); // Prevent item click
                        const item = button.closest('.news-item');
                        const url = item.dataset.url;
                        
                        vscode.postMessage({ 
                            command: 'open',
                            url: url
                        });
                    });
                });
                
                // Function to update the selected news item
                function updateSelectedItem(index) {
                    // Remove current class from all items
                    document.querySelectorAll('.news-item').forEach(item => {
                        item.classList.remove('current');
                    });
                    
                    // Add current class to selected item
                    const selectedItem = document.querySelector('.news-item[data-index="' + index + '"]');
                    if (selectedItem) {
                        selectedItem.classList.add('current');
                        // Scroll the item into view
                        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    
                    currentNewsIndex = index;
                }
                
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
