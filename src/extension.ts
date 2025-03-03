import * as vscode from 'vscode';
import { env } from 'vscode';
import { NewsItem } from './types';
import { createWebviewPanel } from './webview';
import { RssService } from './services/rss';

// Global variables
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let newsItems: NewsItem[] = [];
let currentNewsIndex = 0;
let rotationInterval: NodeJS.Timeout | undefined;
let rssService: RssService;
let panel: vscode.WebviewPanel | undefined;
let context: vscode.ExtensionContext;
let hoverDisposable: vscode.Disposable | undefined;
let lastFetchTime: number = 0;
const FETCH_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Format Unix timestamp to human-readable date
 */
function formatTimestamp(timestamp: number): string {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
}

/**
 * Format tooltip with rich content including excerpt and thumbnail
 */
function formatRichTooltip(newsItem: NewsItem): vscode.MarkdownString {
    // Create a simple markdown string
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;
    
    // Add title
    tooltip.appendMarkdown(`## ${newsItem.title}\n\n`);
    
    // Add excerpt if available (plain text only)
    if (newsItem.excerpt) {
        tooltip.appendMarkdown(`${newsItem.excerpt}\n\n`);
    }
    
    // Add metadata
    tooltip.appendMarkdown(`**Source:** ${newsItem.source}`);
    if (newsItem.by) {
        tooltip.appendMarkdown(` by ${newsItem.by}`);
    }
    tooltip.appendMarkdown(`\n\n`);
    
    // Add instructions
    tooltip.appendMarkdown(`Click to open news panel | Cmd+Click to open in browser`);
    
    return tooltip;
}

/**
 * Truncate title to specified length
 */
function truncateTitle(title: string, maxLength: number): string {
    if (!title) {
        return 'No Title';
    }
    
    // Remove any markdown or HTML that might cause display issues
    const cleanTitle = title
        .replace(/\[.*?\]/g, '') // Remove markdown links
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&[^;]+;/g, '') // Remove HTML entities
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .trim();
    
    if (cleanTitle.length <= maxLength) {
        return cleanTitle;
    }
    return cleanTitle.substring(0, maxLength - 3) + '...';
}

/**
 * Get configuration value with fallback
 */
function getConfig<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration('devmind');
    return config.get<T>(key, defaultValue);
}

/**
 * Update the status bar with the current news item
 */
function updateStatusBar() {
    if (newsItems.length === 0) {
        statusBarItem.text = '$(rss) DevMind News';
        statusBarItem.tooltip = 'Click to fetch developer news';
        return;
    }
    
    const currentNews = newsItems[currentNewsIndex];
    const maxTitleLength = getConfig<number>('statusBar.maxTitleLength', 75);
    
    // Update status bar text
    statusBarItem.text = `$(rss) ${truncateTitle(currentNews.title, maxTitleLength)}`;
    
    // Update tooltip with rich content
    statusBarItem.tooltip = formatRichTooltip(currentNews);
    
    // Make sure it's visible
    statusBarItem.show();
}

/**
 * Fetch news from RSS feeds
 */
async function fetchNews(): Promise<void> {
    const now = new Date();
    
    // Only fetch if it's been more than FETCH_INTERVAL since the last fetch
    if (now.getTime() - lastFetchTime < FETCH_INTERVAL && newsItems.length > 0) {
        // If we have news items and it hasn't been long enough, just shuffle them
        shuffleNewsItems();
        updateStatusBar();
        return;
    }
    
    try {
        statusBarItem.text = '$(loading~spin) DevMind: Fetching news...';
        statusBarItem.tooltip = 'Fetching latest developer news';
        statusBarItem.show();
        
        const maxItems = getConfig<number>('news.maxItems', 20);
        newsItems = await rssService.fetchNews(maxItems);
        lastFetchTime = now.getTime();
        
        if (newsItems.length === 0) {
            statusBarItem.text = '$(rss) DevMind: No news available';
            statusBarItem.tooltip = 'No news found. Click to try again.';
            return;
        }
        
        // Reset current index
        currentNewsIndex = 0;
        
        // Update status bar with first news item
        updateStatusBar();
        
        // Update panel if open
        updatePanel();
        
        // Start rotation if not already started
        startRotation();
    } catch (error) {
        console.error('Error fetching news:', error);
        outputChannel.appendLine(`Error fetching news: ${error instanceof Error ? error.message : String(error)}`);
        
        statusBarItem.text = '$(error) DevMind: Error fetching news';
        statusBarItem.tooltip = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}

/**
 * Shuffle the news items array
 */
function shuffleNewsItems() {
    // Fisher-Yates shuffle algorithm
    for (let i = newsItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newsItems[i], newsItems[j]] = [newsItems[j], newsItems[i]];
    }
    
    // Reset current index
    currentNewsIndex = 0;
    
    // Update status bar and panel
    updateStatusBar();
    updatePanel();
}

/**
 * Start news rotation in status bar
 */
function startRotation() {
    // Clear existing interval if any
    if (rotationInterval) {
        clearInterval(rotationInterval);
    }
    
    // Don't start rotation if we have no news
    if (newsItems.length <= 1) {
        return;
    }
    
    const refreshInterval = getConfig<number>('statusBar.refreshInterval', 10000);
    
    // Set new interval - rotate every refreshInterval milliseconds
    rotationInterval = setInterval(() => {
        if (newsItems.length === 0) {
            return;
        }
        
        // Move to next news item
        currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
        
        // Update status bar
        updateStatusBar();
    }, refreshInterval);
}

/**
 * Show next news item
 */
function showNextNews() {
    if (newsItems.length === 0) {
        vscode.window.showInformationMessage('No news available. Try refreshing.');
        return;
    }
    
    // Move to next news item
    currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
    
    // Update status bar
    updateStatusBar();
}

/**
 * Show previous news item
 */
function showPreviousNews() {
    if (newsItems.length === 0) {
        vscode.window.showInformationMessage('No news available. Try refreshing.');
        return;
    }
    
    // Move to previous news item
    currentNewsIndex = (currentNewsIndex - 1 + newsItems.length) % newsItems.length;
    
    // Update status bar
    updateStatusBar();
}

/**
 * Open current news in browser
 */
function openCurrentNews() {
    if (newsItems.length === 0) {
        vscode.window.showInformationMessage('DevMind: No news available');
        return;
    }
    
    const currentNews = newsItems[currentNewsIndex];
    if (!currentNews.url) {
        vscode.window.showInformationMessage('DevMind: No URL available for this news item');
        return;
    }
    
    try {
        vscode.env.openExternal(vscode.Uri.parse(currentNews.url));
    } catch (error) {
        outputChannel.appendLine(`Error opening URL: ${error instanceof Error ? error.message : String(error)}`);
        vscode.window.showErrorMessage(`DevMind: Error opening URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Open current news in browser directly (for tooltip button)
 */
function openCurrentNewsInBrowser() {
    openCurrentNews();
}

/**
 * Show all news items
 */
function showAllNews() {
    if (newsItems.length === 0) {
        vscode.window.showInformationMessage('No news available. Try refreshing.');
        return;
    }
    
    // Create quick pick items
    const items = newsItems.map((news, index) => {
        return {
            label: news.title,
            description: news.source,
            detail: news.excerpt || `Published: ${formatTimestamp(news.time)}`,
            index
        };
    });
    
    // Show quick pick
    vscode.window.showQuickPick(items, {
        placeHolder: 'Select a news item to open',
        matchOnDescription: true,
        matchOnDetail: true
    }).then(selected => {
        if (selected) {
            // Update current index
            currentNewsIndex = selected.index;
            
            // Update status bar
            updateStatusBar();
            
            // Open in browser
            openCurrentNews();
        }
    });
}

/**
 * Select a specific news item by index
 */
function selectNews(index: number) {
    if (index >= 0 && index < newsItems.length) {
        currentNewsIndex = index;
        updateStatusBar();
        
        // If panel is open, update it
        if (panel) {
            updatePanel();
        }
    }
}

/**
 * Update the webview panel with current news
 */
function updatePanel() {
    if (panel) {
        try {
            // Send the current news index to highlight the item
            panel.webview.postMessage({ 
                command: 'updateNews',
                news: newsItems,
                currentIndex: currentNewsIndex
            });
        } catch (error) {
            outputChannel.appendLine(`Error updating news panel: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

/**
 * Show news panel
 */
function showNewsPanel() {
    try {
        if (!panel) {
            panel = createWebviewPanel(context, newsItems);
            
            // Handle panel disposal
            panel.onDidDispose(() => {
                panel = undefined;
            });
            
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(message => {
                switch (message.command) {
                    case 'refresh':
                        fetchNews();
                        break;
                    case 'select':
                        if (typeof message.index === 'number') {
                            selectNews(message.index);
                        }
                        break;
                    case 'open':
                        if (message.url) {
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        break;
                }
            });
        } else {
            panel.reveal(vscode.ViewColumn.Beside, true); // preserveFocus = true to keep it smaller
        }
        
        // Update panel with current news and highlight the current news item
        updatePanel();
        
        return panel;
    } catch (error) {
        outputChannel.appendLine(`Error showing news panel: ${error instanceof Error ? error.message : String(error)}`);
        vscode.window.showErrorMessage(`DevMind: Error showing news panel: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
    }
}

/**
 * Show a notification with the current news item and action buttons
 */
async function showNewsNotification() {
    if (newsItems.length === 0) {
        vscode.window.showInformationMessage('No news available. Try refreshing.');
        return;
    }

    const currentNews = newsItems[currentNewsIndex];
    
    try {
        const selected = await vscode.window.showInformationMessage(
            currentNews.title,
            { modal: false, detail: currentNews.excerpt || `From ${currentNews.source}` },
            'Open in Browser',
            'Show All',
            'Next'
        );
        
        if (selected === 'Open in Browser') {
            openCurrentNews();
        } else if (selected === 'Show All') {
            showAllNews();
        } else if (selected === 'Next') {
            showNextNews();
        }
    } catch (error) {
        console.error('Error showing notification:', error);
    }
}

/**
 * Show a simple message
 */
function showMessage() {
    vscode.window.showInformationMessage('DevMind: Your developer news feed');
}

/**
 * Run diagnostics
 */
function runDiagnostics() {
    outputChannel.show();
    outputChannel.appendLine('=== DevMind Diagnostics ===');
    outputChannel.appendLine(`Time: ${new Date().toLocaleString()}`);
    outputChannel.appendLine(`News items: ${newsItems.length}`);
    outputChannel.appendLine(`Current index: ${currentNewsIndex}`);
    outputChannel.appendLine(`Last fetch time: ${new Date(lastFetchTime).toLocaleString()}`);
    outputChannel.appendLine(`Status bar text: ${statusBarItem.text}`);
    outputChannel.appendLine(`Panel exists: ${!!panel}`);
    outputChannel.appendLine('=========================');
}

/**
 * Activate the extension
 */
export function activate(ctx: vscode.ExtensionContext) {
    try {
        // Store context
        context = ctx;
        
        // Create output channel
        outputChannel = vscode.window.createOutputChannel('DevMind');
        
        // Log activation
        outputChannel.appendLine(`DevMind extension activated at ${new Date().toISOString()}`);
        
        // Initialize RSS service
        rssService = new RssService(outputChannel);
        
        // Create status bar item
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            1  // Lowest priority to ensure it's the last item on the left
        );
        
        // Set initial text and show immediately
        statusBarItem.text = '$(rss) DevMind News';
        statusBarItem.tooltip = 'Click to fetch developer news';
        statusBarItem.command = {
            title: 'Show DevMind News',
            command: 'devmind.statusBarClicked',
            arguments: []
        };
        statusBarItem.show();
        
        // Log after creating status bar
        outputChannel.appendLine('Status bar item created and displayed');
        console.log('Status bar item created:', statusBarItem);
        
        // Register mouse event listener for document to detect hover over status bar
        // This is a workaround since VS Code doesn't provide direct events for status bar hover
        hoverDisposable = vscode.window.onDidChangeWindowState((e) => {
            // Just to ensure we update status on window focus changes
            if (e.focused && newsItems.length > 0) {
                statusBarItem.show();
            }
        });
        
        context.subscriptions.push(hoverDisposable);
        
        // Register commands
        context.subscriptions.push(
            vscode.commands.registerCommand('devmind.message', showMessage),
            vscode.commands.registerCommand('devmind.diagnostics', runDiagnostics),
            vscode.commands.registerCommand('devmind.refreshNews', fetchNews),
            vscode.commands.registerCommand('devmind.openCurrentNews', openCurrentNews),
            vscode.commands.registerCommand('devmind.openCurrentNewsInBrowser', openCurrentNewsInBrowser),
            vscode.commands.registerCommand('devmind.nextNews', showNextNews),
            vscode.commands.registerCommand('devmind.previousNews', showPreviousNews),
            vscode.commands.registerCommand('devmind.showAllNews', showAllNews),
            vscode.commands.registerCommand('devmind.showNewsPanel', showNewsPanel),
            vscode.commands.registerCommand('devmind.showNewsNotification', showNewsNotification),
            vscode.commands.registerCommand('devmind.selectNews', selectNews),
            vscode.commands.registerCommand('devmind.statusBarClicked', (args) => {
                // Check if modifier key is pressed (Cmd/Ctrl)
                const modifierPressed = args && args.modifiers && args.modifiers.includes('ctrlCmd');
                
                if (modifierPressed) {
                    // If Cmd/Ctrl is pressed, open in browser
                    openCurrentNews();
                } else {
                    // Otherwise show the panel
                    showNewsPanel();
                }
            })
        );
        
        // Add important disposables to subscriptions
        context.subscriptions.push(
            statusBarItem,
            outputChannel
        );
        
        // Force status bar refresh with multiple show() calls (as per memory)
        statusBarItem.show();
        
        // Force multiple refreshes with increasing delays (from memory)
        setTimeout(() => {
            statusBarItem.text = '$(rss) DevMind News Ready';
            statusBarItem.show();
            
            // Fetch news after a short delay
            setTimeout(() => {
                fetchNews().catch(error => {
                    console.error('Error in initial news fetch:', error);
                });
            }, 2000);
        }, 1000);
        
        outputChannel.appendLine('DevMind extension activated successfully');
    } catch (error) {
        console.error('Error activating DevMind extension:', error);
        outputChannel?.appendLine(`Error activating extension: ${error instanceof Error ? error.message : String(error)}`);
        vscode.window.showErrorMessage(`DevMind: Error activating extension: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    // Clear any intervals
    if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = undefined;
    }
    
    // Dispose of hover listener
    if (hoverDisposable) {
        hoverDisposable.dispose();
    }
    
    // Close panel if open
    if (panel) {
        panel.dispose();
    }
    
    // Clear news items
    newsItems = [];
    
    outputChannel?.appendLine('DevMind extension deactivated');
}
