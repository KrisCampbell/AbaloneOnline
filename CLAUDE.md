# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based Abalone board game with peer-to-peer multiplayer functionality. The game is built using vanilla HTML, CSS, and JavaScript with WebRTC for real-time multiplayer without requiring a server.

## Architecture

### Core Components

- **AbaloneGame** (`game.js`): Main game engine handling board state, move validation, and game rules
- **MultiplayerManager** (`multiplayer.js`): WebRTC peer-to-peer connection management and game state synchronization
- **Main** (`main.js`): UI controller, event handling, and application initialization

### Game Logic Structure

The game uses a hexagonal coordinate system (axial coordinates) where each position is represented as `{q, r}`. The board is stored as a Map with string keys in format `"q,r"` mapping to piece values (`'black'`, `'white'`, or `null`).

Key game logic patterns:
- Move validation checks both geometric constraints and game rules
- Pushes vs sidesteps are handled as separate move types
- Game state includes: board, currentPlayer, scores, history, gameEnded flag

### Multiplayer Implementation

Uses WebRTC DataChannels with localStorage-based signaling for local development. Messages are JSON-formatted with types: `move`, `gameState`, `reset`.

## Development Commands

This is a pure client-side application with no build process:

- **Local development**: Open `index.html` in browser or serve with local HTTP server
- **Testing**: Use browser developer tools, check console for debug info
- **Deploy**: Push to GitHub and enable GitHub Pages

## Common Development Tasks

### Adding New Game Features

1. Extend `AbaloneGame` class for core logic
2. Add UI elements in `index.html` and style in `styles.css`
3. Wire up events in `main.js`
4. Update multiplayer sync in `MultiplayerManager` if needed

### Debugging Game Logic

Use the global `gameDebug` object:
```javascript
gameDebug.printBoard()     // Show current board state
gameDebug.printHistory()   // Show move history
gameDebug.game()          // Access game instance
```

### Modifying Move Validation

Key methods in `AbaloneGame`:
- `isValidMove()`: Main validation entry point
- `isValidPush()` / `isValidSidestep()`: Specific move type validation
- `canPush()`: Check if push is possible given opponent pieces

### Adding Multiplayer Features

Extend `MultiplayerManager.handleRemoteMessage()` for new message types. All game state changes should be synced via `sendGameState()`.

## File Structure

```
├── index.html          # Main page with game UI
├── styles.css          # All styling and responsive design
├── game.js            # Core Abalone game logic (~500 lines)
├── multiplayer.js     # WebRTC multiplayer implementation (~400 lines)
├── main.js           # UI management and initialization (~300 lines)
├── README.md         # User documentation and setup
└── CLAUDE.md         # This development guide
```

## Key Implementation Details

### Hexagonal Grid Math

The game uses axial coordinates for hexagonal positioning. Key conversion functions:
- `hexToPixel()`: Convert hex coordinates to canvas pixels
- `pixelToHex()`: Convert mouse coordinates to hex position
- `roundHex()`: Snap floating-point hex coordinates to nearest valid hex

### Move Types

- **Single piece**: Move one piece to adjacent empty space
- **Line push**: 2-3 pieces in line pushing opponent pieces
- **Line sidestep**: 2-3 pieces moving perpendicular to their line

### WebRTC Signaling

Current implementation uses localStorage for signaling (development only). For production deployment, replace with proper signaling server in `MultiplayerManager`.

## Testing Guidelines

- Test both local and multiplayer modes
- Verify move validation edge cases (board edges, maximum pushes)
- Check responsive design on mobile devices
- Test WebRTC connection on different networks

## Performance Considerations

- Board rendering redraws entire canvas on each move
- Game state is synchronized completely on each multiplayer update
- Move history is limited to 20 entries in UI display
- localStorage cleanup prevents memory leaks from abandoned games