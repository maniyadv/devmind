# DevMind Extension Troubleshooting Guide

This document provides guidance on common issues with the DevMind extension and how to diagnose and resolve them.

## Status Bar Visibility Issues

If the status bar item is not visible, try the following:

1. **Increase Priority Value**:
   ```typescript
   statusBarItem = vscode.window.createStatusBarItem(
       vscode.StatusBarAlignment.Left,
       100 // Higher priority value (100 instead of 1)
   );
   ```

2. **Show Multiple Times**:
   ```typescript
   // Show immediately after creation
   statusBarItem.show();
   
   // Show after command registration
   statusBarItem.show();
   
   // Show at the end of activation
   statusBarItem.show();
   ```

3. **Force Refresh with Delay**:
   ```typescript
   setTimeout(() => {
       statusBarItem.text = '$(megaphone) DevMind Ready';
       statusBarItem.show();
   }, 2000);
   ```

4. **VS Code Window Reload**:
   - Sometimes VS Code needs a full reload: `Developer: Reload Window` from the command palette.

## Network Issues

If news fetching fails:

1. **Check Network Access**:
   - Ensure your development environment has internet access
   - Try accessing the API endpoints directly in a browser

2. **API Rate Limiting**:
   - Some APIs (like GitHub) have rate limits
   - Add appropriate retry logic with increasing delays

3. **Simplified Error Handling**:
   ```typescript
   try {
       // Network request
   } catch (error) {
       console.error('Error details:', error);
       // Fallback to a stable state
       statusBarItem.text = '$(error) DevMind Error';
   }
   ```

## Command Registration Issues

If commands aren't working:

1. **Verify package.json**:
   - Ensure command IDs match between code and package.json
   - Check that activationEvents includes onStartupFinished

2. **Command Context**:
   - Make sure commands are registered in the activate function
   - Add them to subscriptions: `context.subscriptions.push(command)`

3. **Command Execution Order**:
   - Register commands before setting them on the status bar item

## Extension Activation Problems

If the extension fails to activate:

1. **Simple Activation Test**:
   - Create a minimal extension that just logs a message
   - Verify it works before adding more complexity

2. **Verbose Logging**:
   ```typescript
   console.log('DevMind: Activation starting...');
   // each step of activation
   console.log('DevMind: Activation complete');
   ```

3. **Check Extension Host Logs**:
   - Use the `Developer: Show Logs...` command
   - Select "Extension Host" to see detailed activation logs

## Incremental Development

The safest approach to extension development is incremental:

1. Start with a minimal working extension (status bar only)
2. Add one feature at a time, testing thoroughly
3. Keep a backup of each working stage
4. When something breaks, compare to the last working version

## Using Developer Tools

VS Code has developer tools that can help diagnose issues:

1. Open Developer Tools: `Help > Toggle Developer Tools`
2. Check the Console tab for errors
3. Use the Network tab to monitor API requests
4. Add breakpoints in your extension code

## Common Gotchas

- Extensions are deactivated when VS Code is closed and reactivated on startup
- Network requests should be async and properly awaited
- Dispose of resources (subscriptions, intervals) in deactivate
- VS Code API is evolving - check documentation for deprecated methods

## When All Else Fails

If you can't get your extension working:

1. **Start Fresh**: Create a new extension with the VS Code Extension Generator
2. **Copy Core Logic**: Gradually copy your logic into the fresh extension
3. **Test Each Addition**: Test after each small addition
4. **Compare Projects**: Use a diff tool to find subtle differences

Remember: The simplest extension is the most reliable. Only add complexity when necessary.
