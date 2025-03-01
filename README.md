# DevMind

DevMind is a lightweight developer news feed extension for Visual Studio Code. Stay updated with the latest tech news without leaving your editor.

![DevMind in action](images/demo.png)

## Features

- **Status Bar Integration**: View the latest developer news directly in your VS Code status bar
- **News Rotation**: Automatically rotates through top news items
- **Multiple Sources**: Fetches news from both Hacker News and Lobsters
- **Detailed Tooltips**: Hover over news for details and quick-action buttons
- **News Panel**: Browse all fetched news items in a dedicated panel
- **One-Click Access**: Open any news item directly in your browser

## Commands

- `DevMind: Show News Panel` - Opens a dedicated panel with all news items
- `DevMind: Refresh News` - Manually refreshes the news feed
- `DevMind: Open Current News in Browser` - Opens the currently displayed news item in your browser
- `DevMind: Show Next News` - Shows the next news item in the status bar
- `DevMind: Show Previous News` - Shows the previous news item in the status bar

## How it Works

DevMind pulls the latest developer news from multiple sources (Hacker News and Lobsters) and displays them in your VS Code status bar. The news items rotate automatically every 10 seconds, keeping you updated without being intrusive.

Hover over a news item to see the full title, source, author, and action buttons. You can open the full news panel or click directly through to the original article.

## Requirements

- Visual Studio Code 1.85.0 or higher
- Internet connection to fetch news

## Extension Settings

This extension doesn't require any configuration. It works right out of the box!

## Known Issues

- Status bar item may occasionally not show up immediately after activation. If this happens, restart VS Code.

## Release Notes

### 0.1.0

- Added Lobsters as a news source
- Implemented random news shuffling for better variety
- Added a dedicated news panel with all items
- Enhanced tooltips with action buttons
- Improved error handling and reliability

### 0.0.3

- Added automatic news fetching from Hacker News
- Implemented news rotation in the status bar
- Added one-click browser opening for news articles
- Improved error handling and stability

### 0.0.2

- Initial stable release
- Simple status bar integration

### 0.0.1

- Initial release
- Basic framework implementation

---

## Development

### Building the Extension

```bash
npm run compile
vsce package
```

### Installing the Extension

```bash
code --install-extension devmind-0.1.0.vsix
```

---

**Enjoy!**
