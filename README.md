# DevMind

DevMind brings the latest developer news directly to your VS Code status bar. Stay updated with the tech world without leaving your editor!

![DevMind Demo](images/demo.png)

## What's New in 0.3.0

- **Customizable UI**: Configure status bar title length, refresh interval, and panel width
- **Improved Status Bar**: Dynamic width with static RSS icon
- **More Compact Design**: Reduced panel dimensions for a cleaner look
- **Enhanced Text Handling**: Better handling of HTML/Markdown content

## Features

- **Status Bar Integration**: View the latest developer news directly in your VS Code status bar
- **News Rotation**: Automatically rotates through top news items every 10 seconds
- **Multiple Sources**: Fetches news from TechCrunch, DEV.to, Hacker Noon, and FreeCodeCamp
- **Rich Content**: View article excerpts in tooltips for quick previews
- **News Panel**: Browse all fetched news items in a dedicated panel
- **One-Click Access**: Open any news item directly in your browser

## Configuration

DevMind can be customized through VS Code settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `devmind.statusBar.maxTitleLength` | Maximum length of news title in status bar | 75 |
| `devmind.statusBar.refreshInterval` | Interval to rotate news in milliseconds | 10000 |
| `devmind.panel.maxWidth` | Maximum width of news panel in pixels | 500 |
| `devmind.news.maxItems` | Maximum number of news items to display | 20 |

## Commands

- `DevMind: Show News Panel` - Opens a dedicated panel with all news items
- `DevMind: Refresh News` - Manually refreshes the news feed
- `DevMind: Open Current News in Browser` - Opens the currently displayed news item in your browser
- `DevMind: Show Next/Previous News` - Navigate through news items

## How it Works

DevMind pulls the latest developer news from multiple sources and displays them in your VS Code status bar. The news items rotate automatically, keeping you updated without being intrusive.

Hover over a news item to see the full title, excerpt, and action buttons.

## Requirements

- Visual Studio Code 1.85.0 or higher
- Internet connection to fetch news

## Upcoming Features

- **Radio Player**: Listen to developer podcasts and music while coding
- Enhanced customization options
- Personalized news preferences

## Release Notes

### 0.2.0

- Switched to RSS feeds for more reliable content delivery
- Added news from TechCrunch, DEV.to, Hacker Noon, and FreeCodeCamp
- Added article excerpts in tooltips
- Improved performance with 30-minute refresh intervals
- Enhanced UI for better readability

### 0.1.1

- Fixed command registration for "Show News Panel" in Command Palette
- Minor improvements to command accessibility

### 0.1.0

- Initial release of DevMind

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
