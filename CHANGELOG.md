# Change Log

All notable changes to the "DevMind" extension will be documented in this file.

## [0.3.0] - 2025-03-03

### Added
- Configuration options for customizing the extension:
  - `devmind.statusBar.maxTitleLength`: Control title length in status bar
  - `devmind.statusBar.refreshInterval`: Control news rotation interval
  - `devmind.panel.maxWidth`: Control news panel width
  - `devmind.news.maxItems`: Control maximum number of news items
- Added documentation for configuration options in README

### Changed
- Used static RSS icon in status bar with loading spinner only during fetch operations
- Made the news panel even more compact with reduced dimensions
- Improved status bar positioning to be the last item on the left
- Enhanced text cleaning to prevent display issues with HTML/Markdown content
- Reduced panel width from 600px to 500px (configurable)

### Fixed
- Fixed issue where text in status bar could be pushed down due to HTML/Markdown content
- Improved error handling and logging with timestamps
- Optimized performance by preventing rotation when only one news item is available

## [0.2.0] - 2025-02-20

### Added
- News panel with compact design
- Source and date labels for each news item
- "Read More" hover button
- Cmd+Click functionality to open news in browser
- News item highlighting and scroll-to-selected functionality

### Changed
- Updated RSS feed sources to include:
  - TechCrunch
  - DEV.to
  - Hacker Noon
  - FreeCodeCamp
- Removed CSS-Tricks and Smashing Magazine as sources
- Improved typography and spacing
- Enhanced webview rendering and security

## [0.1.0] - 2025-01-15

### Added
- Initial release
- Status bar with rotating developer news
- Basic news panel
- RSS feed integration
