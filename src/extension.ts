import * as vscode from 'vscode';
import { env } from 'vscode';
import { HackerNewsService } from './services/hackernews';
import { GitHubService } from './services/github';
import { LobstersService } from './services/lobsters';
import { NewsItem } from './types';
import { createWebviewPanel } from './webview';

// Global variables
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let newsItems: NewsItem[] = [];
let currentNewsIndex = 0;
let rotationInterval: NodeJS.Timeout | undefined;
let newsService: HackerNewsService;
let githubService: GitHubService; // Keep the service var but won't use it for now
let lobstersService: LobstersService; // Add Lobsters service
let panel: vscode.WebviewPanel | undefined;
let context: vscode.ExtensionContext;
let hoverDisposable: vscode.Disposable | undefined;

/**
 * Format Unix timestamp to human-readable date
 */
function formatTimestamp(timestamp: number): string {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
}

/**
 * Format tooltip with simplified content
 */
function formatRichTooltip(newsItem: NewsItem): string {
    // Extract domain from URL for display
    let domain = '';
    try {
        const url = new URL(newsItem.url);
        domain = url.hostname.replace('www.', '');
    } catch (error) {
        domain = 'news.ycombinator.com';
    }
    
    // Create a summary if title is long enough
    const summary = newsItem.title.length > 60 
        ? `${newsItem.title.substring(0, 60)}...` 
        : '';
        
    return `# ${newsItem.title}
${summary ? `\n${summary}\n` : ''}

[$(link-external) Open in Browser (${domain})](${newsItem.url})
`;
}

/**
 * Fetch news from all configured sources
 */
async function fetchNews() {
    try {
        statusBarItem.text = '$(sync~spin) Loading news...';
        statusBarItem.show();
        
        // Log fetching attempt
        console.log('DevMind: Fetching news from multiple sources...');
        outputChannel.appendLine('Fetching news from multiple sources...');
        
        // Initialize the services if not already done
        if (!newsService) newsService = new HackerNewsService();
        if (!githubService) githubService = new GitHubService(); // Keep but won't use for now
        if (!lobstersService) lobstersService = new LobstersService(); // Add Lobsters service
        
        // Fetch from Hacker News and Lobsters
        const promises = [
            newsService.getTopStories(8).then(items => items.map(item => ({ ...item, source: 'Hacker News' }))),
            lobstersService.getHotStories(5).then(items => items.map(item => ({ ...item, source: 'Lobsters' })))
            // GitHub trending repos removed as requested
        ];
        
        // Wait for all to complete
        const results = await Promise.allSettled(promises);
        
        // Process results
        let allNewsItems: NewsItem[] = [];
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const sourceItems = result.value;
                console.log(`DevMind: Fetched ${sourceItems.length} items from source ${index + 1}`);
                allNewsItems = [...allNewsItems, ...sourceItems];
            } else {
                console.error(`DevMind: Error fetching from source ${index + 1}:`, result.reason);
                outputChannel.appendLine(`Error fetching from source ${index + 1}: ${result.reason}`);
            }
        });
        
        // Shuffle the news items to randomize the order
        allNewsItems = shuffleArray(allNewsItems);
        
        // Update global news items
        newsItems = allNewsItems;
        
        if (newsItems.length === 0) {
            throw new Error('No stories found or invalid response format');
        }
        
        // Reset to first news item
        currentNewsIndex = 0;
        
        // Update status bar with first news item
        updateStatusBarWithCurrentNews();
        
        // Update panel if it exists and is visible
        if (panel && panel.visible) {
            // Create a temporary panel to get the HTML content
            const tempPanel = createWebviewPanel(context, newsItems);
            panel.webview.html = tempPanel.webview.html;
            // Dispose the temporary panel immediately
            tempPanel.dispose();
        }
        
        // Log success
        outputChannel.appendLine(`Fetched ${newsItems.length} news items from multiple sources`);
        console.log(`DevMind: Fetched ${newsItems.length} news items total`);
        
        return newsItems;
    } catch (error: any) {
        console.error('DevMind: Error fetching news:', error);
        outputChannel.appendLine(`Error fetching news: ${error.message}`);
        statusBarItem.text = '$(alert) DevMind: Error loading news';
        statusBarItem.tooltip = `Error: ${error.message}. Click to try again.`;
        statusBarItem.show();
        throw error;
    }
}

/**
 * Shuffle an array using the Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array]; // Create a copy to avoid modifying the original
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Swap elements
    }
    return newArray;
}

/**
 * Update status bar with current news item
 */
function updateStatusBarWithCurrentNews() {
    if (newsItems.length === 0) {
        statusBarItem.text = '$(info) DevMind: No news available';
        statusBarItem.tooltip = 'Click to fetch news';
        statusBarItem.command = 'devmind.refreshNews';
        statusBarItem.show();
        return;
    }
    
    const currentNews = newsItems[currentNewsIndex];
    
    try {
        // Use a fixed minimum width of 75 characters as requested
        const minWidth = 75;
        
        // Truncate title if needed
        let title = currentNews.title;
        if (title.length > minWidth) {
            title = title.substring(0, minWidth - 3) + '...';
        } else {
            // Pad to minimum width to ensure consistent display
            title = title.padEnd(minWidth, ' ');
        }
        
        // Update status bar with fixed minimum width
        statusBarItem.text = `$(rocket) ${title}`;
        
        // Create a simple tooltip with basic markdown
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.supportHtml = true;
        
        // Title with proper formatting
        tooltip.appendMarkdown(`## ${currentNews.title}\n\n`);
        
        // Source and author info
        tooltip.appendMarkdown(`**Source:** ${currentNews.source}\n\n`);
        if (currentNews.by) {
            tooltip.appendMarkdown(`**By:** ${currentNews.by}\n\n`);
        }
        
        // Separator
        tooltip.appendMarkdown(`---\n\n`);
        
        // Use HTML for better alignment control
        tooltip.appendMarkdown(`<div style="display: flex; justify-content: space-between; font-size: 15px; margin-top: 12px;">`);
        tooltip.appendMarkdown(`<div><a href="command:devmind.showNewsPanel"><b>Open Panel</b></a></div>`);
        tooltip.appendMarkdown(`<div style="text-align: right"><a href="${currentNews.url}"><b>Open in Browser</b></a></div>`);
        tooltip.appendMarkdown(`</div>`);
        
        statusBarItem.tooltip = tooltip;
        
        // Set command to open the DevMind panel when clicking on the status bar
        statusBarItem.command = 'devmind.showNewsPanel';
        statusBarItem.show();
    } catch (error: any) {
        console.error('Error updating status bar:', error);
        statusBarItem.text = '$(warning) DevMind Error';
        statusBarItem.tooltip = `Error: ${error.message}`;
        statusBarItem.show();
    }
}

/**
 * Start rotating news items
 */
function startNewsRotation() {
    // Clear any existing interval
    if (rotationInterval) {
        clearInterval(rotationInterval);
    }
    
    // Only start if we have news items
    if (newsItems.length > 1) {
        rotationInterval = setInterval(() => {
            // Move to next news item (with wrapping)
            currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
            updateStatusBarWithCurrentNews();
        }, 10000); // Rotate every 10 seconds
    }
}

/**
 * Stop rotating news items
 */
function stopNewsRotation() {
    if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = undefined;
    }
}

/**
 * Move to next news item
 */
function showNextNews() {
    if (newsItems.length > 1) {
        currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
        updateStatusBarWithCurrentNews();
    }
}

/**
 * Move to previous news item
 */
function showPreviousNews() {
    if (newsItems.length > 1) {
        currentNewsIndex = (currentNewsIndex - 1 + newsItems.length) % newsItems.length;
        updateStatusBarWithCurrentNews();
    }
}

/**
 * Open current news item in a panel rather than external browser
 * This helps avoid VS Code security warnings for every new domain
 */
function openCurrentNews() {
    if (newsItems.length === 0) {
        vscode.window.showWarningMessage('DevMind: No news available. Fetching news...');
        fetchNews().catch(err => {
            vscode.window.showErrorMessage(`Failed to fetch news: ${err.message}`);
        });
        return;
    }
    
    const currentNews = newsItems[currentNewsIndex];
    
    // Open in browser directly
    env.openExternal(vscode.Uri.parse(currentNews.url));
}

/**
 * Open current news item in browser
 */
function openCurrentNewsInBrowser() {
    if (newsItems.length === 0) {
        vscode.window.showWarningMessage('DevMind: No news available. Fetching news...');
        fetchNews().catch(err => {
            vscode.window.showErrorMessage(`Failed to fetch news: ${err.message}`);
        });
        return;
    }
    
    const currentNews = newsItems[currentNewsIndex];
    
    // Open in browser directly
    env.openExternal(vscode.Uri.parse(currentNews.url));
}

/**
 * Run diagnostics and show results
 */
async function runDiagnostics() {
    try {
        // Create output channel if it doesn't exist
        if (!outputChannel) {
            outputChannel = vscode.window.createOutputChannel('DevMind');
        }
        
        // Show and clear output channel
        outputChannel.clear();
        outputChannel.show();
        
        // Log basic diagnostic info
        outputChannel.appendLine('===== DevMind Diagnostics =====');
        outputChannel.appendLine(`Time: ${new Date().toISOString()}`);
        outputChannel.appendLine(`VS Code Version: ${vscode.version}`);
        outputChannel.appendLine(`Extension Path: ${vscode.extensions.getExtension('maniyadv.devmind')?.extensionPath}`);
        
        // Check if status bar item exists
        outputChannel.appendLine(`\nStatus Bar:`);
        outputChannel.appendLine(`- exists: ${statusBarItem ? 'yes' : 'no'}`);
        if (statusBarItem) {
            outputChannel.appendLine(`- text: ${statusBarItem.text}`);
            outputChannel.appendLine(`- tooltip: ${statusBarItem.tooltip}`);
            outputChannel.appendLine(`- command: ${statusBarItem.command}`);
            outputChannel.appendLine(`- priority: ${statusBarItem.priority}`);
        }
        
        // Check news items
        outputChannel.appendLine(`\nNews Items:`);
        outputChannel.appendLine(`- count: ${newsItems.length}`);
        outputChannel.appendLine(`- currentIndex: ${currentNewsIndex}`);
        outputChannel.appendLine(`- rotation active: ${!!rotationInterval}`);
        
        // Test news service
        outputChannel.appendLine(`\nNews Service Test:`);
        try {
            outputChannel.appendLine('Testing connection to Hacker News API...');
            const testItems = await newsService.getTopStories(1);
            outputChannel.appendLine(`- API reachable: yes (received ${testItems.length} items)`);
            if (testItems.length > 0) {
                outputChannel.appendLine(`- Sample item: "${testItems[0].title}"`);
            }
        } catch (error: any) {
            outputChannel.appendLine(`- API reachable: no`);
            outputChannel.appendLine(`- Error: ${error.message}`);
        }
        
        // Log available commands
        outputChannel.appendLine(`\nRegistered Commands:`);
        vscode.commands.getCommands(true).then(commands => {
            const devmindCommands = commands.filter(cmd => cmd.startsWith('devmind.'));
            devmindCommands.forEach(cmd => {
                outputChannel.appendLine(`- ${cmd}`);
            });
        });
        
        outputChannel.appendLine('\n===== End of Diagnostics =====');
        
        // Show success message
        vscode.window.showInformationMessage('DevMind diagnostics complete. See Output panel for results.');
        
    } catch (error: any) {
        console.error('DevMind: Error running diagnostics:', error);
        vscode.window.showErrorMessage(`Diagnostics error: ${error.message}`);
    }
}

/**
 * Show a simple message
 */
function showMessage() {
    vscode.window.showInformationMessage('Hello from DevMind!');
    console.log('DevMind: Message command executed');
    
    // Force a refresh of the status bar
    if (statusBarItem) {
        statusBarItem.text = '$(megaphone) DevMind';
        statusBarItem.show();
    }
}

/**
 * Show all news items in Quick Pick
 */
async function showAllNews() {
    if (newsItems.length === 0) {
        vscode.window.showInformationMessage('No news available. Fetching news...');
        try {
            await fetchNews();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to fetch news: ${error.message}`);
            return;
        }
    }
    
    const items = newsItems.map((news, index) => ({
        label: news.title,
        description: `Score: ${news.score ?? 'N/A'}`,
        detail: news.url,
        index
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a news item to open',
        matchOnDescription: true,
        matchOnDetail: true
    });
    
    if (selected) {
        currentNewsIndex = selected.index;
        updateStatusBarWithCurrentNews();
        openCurrentNews(); // Open in panel instead of browser
    }
}

/**
 * Show news panel with all current news items
 */
function showNewsPanel() {
    if (newsItems.length === 0) {
        vscode.window.showWarningMessage('DevMind: No news available. Fetching news...');
        fetchNews().catch(err => {
            vscode.window.showErrorMessage(`Failed to fetch news: ${err.message}`);
        });
        return;
    }
    
    try {
        if (panel) {
            panel.reveal(vscode.ViewColumn.Beside);
        } else {
            panel = createWebviewPanel(context, newsItems);
            
            // Handle panel disposal
            panel.onDidDispose(() => {
                panel = undefined;
            }, null, context.subscriptions);
        }
    } catch (error: any) {
        console.error('Error showing news panel:', error);
        vscode.window.showErrorMessage(`Failed to show news panel: ${error.message}`);
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
        // Create notification message with larger text
        let message = `$(rocket) ${currentNews.title}`;
        
        // Add source and author info
        let detail = '';
        if (currentNews.by) {
            detail = `by ${currentNews.by} • `;
        }
        detail += `${currentNews.source}`;
        
        // Show notification with action buttons
        const selection = await vscode.window.showInformationMessage(
            message,
            { 
                modal: false,
                detail: detail 
            },
            { title: 'Open Panel', isCloseAffordance: false },
            { title: 'Open in Browser', isCloseAffordance: false, iconPath: new vscode.ThemeIcon('link-external') }
        );
        
        // Handle button clicks
        if (selection) {
            if (selection.title === 'Open Panel') {
                await vscode.commands.executeCommand('devmind.showNewsPanel');
            } else if (selection.title === 'Open in Browser') {
                await vscode.commands.executeCommand('devmind.openCurrentNewsInBrowser');
            }
        }
    } catch (error: any) {
        console.error('Error showing news notification:', error);
        vscode.window.showErrorMessage(`Error showing news: ${error.message}`);
    }
}

export function activate(extensionContext: vscode.ExtensionContext) {
    console.log('DevMind: Activating...');
    
    try {
        // Store context globally
        context = extensionContext;
        
        // Create output channel
        outputChannel = vscode.window.createOutputChannel('DevMind');
        outputChannel.appendLine('DevMind extension activating...');
        
        // Initialize services (keep GitHub service initialized but we won't use it)
        newsService = new HackerNewsService();
        githubService = new GitHubService();
        lobstersService = new LobstersService(); // Initialize Lobsters service
        
        // Create status bar item
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            1 // Priority 1 to appear last on left side (per memory)
        );
        
        // Set initial text and show immediately
        statusBarItem.text = '$(rocket) DevMind News';
        statusBarItem.tooltip = 'Click to fetch developer news';
        statusBarItem.command = 'devmind.refreshNews';
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
            vscode.commands.registerCommand('devmind.showNewsNotification', showNewsNotification)
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
            statusBarItem.text = '$(rocket) DevMind News';
            statusBarItem.show();
            console.log('Status bar item should be visible now with text:', statusBarItem.text);
        }, 1000);
        
        // Fetch news after a short delay to ensure VS Code is fully loaded
        setTimeout(async () => {
            try {
                await fetchNews();
                startNewsRotation();
            } catch (error) {
                console.error('DevMind: Initial news fetch failed:', error);
                // We already set the error in the status bar in fetchNews
            }
        }, 2000);
        
        console.log('DevMind: Activated successfully');
        outputChannel.appendLine('DevMind extension activated successfully');
    } catch (error: any) {
        console.error('DevMind: Error during activation:', error);
        vscode.window.showErrorMessage(`DevMind activation error: ${error.message}`);
    }
}

export function deactivate() {
    console.log('DevMind: Deactivating...');
    
    if (outputChannel) {
        outputChannel.appendLine('DevMind extension deactivating...');
    }
    
    // Stop rotation interval
    stopNewsRotation();
    
    // Dispose status bar
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    
    // Dispose output channel
    if (outputChannel) {
        outputChannel.dispose();
    }
    
    // Dispose panel if it exists
    if (panel) {
        panel.dispose();
    }
    
    console.log('DevMind: Deactivated');
}
