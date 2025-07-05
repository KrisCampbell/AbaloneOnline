# Abalone Online

A lightweight, web-based implementation of the classic board game Abalone with online multiplayer support via WebRTC.

## Features

- ✅ Complete Abalone game implementation with all standard rules
- ✅ Beautiful hexagonal board with smooth piece movement
- ✅ Peer-to-peer multiplayer using WebRTC (no server required)
- ✅ Move validation and win condition detection
- ✅ Move history and undo functionality
- ✅ Responsive design for desktop and mobile
- ✅ Score tracking and game status indicators

## How to Play

### Game Rules

Abalone is a strategy board game for two players. The objective is to push six of your opponent's pieces off the board.

**Setup:**
- Each player starts with 14 pieces arranged in a triangular formation
- Black pieces start at the top, white pieces at the bottom

**Movement:**
1. **Single Piece:** Move one piece to an adjacent empty space
2. **Line Movement:** Move 2-3 pieces in a straight line
3. **Pushing:** Push opponent pieces when you have numerical advantage (2v1 or 3v2)

**Winning:**
- First player to push 6 opponent pieces off the board wins

### Controls

- **Click** to select pieces
- **Click again** to add pieces to selection (up to 3 in a line)
- **Click destination** to move selected pieces
- **Escape** to clear selection
- **Ctrl+R** to reset game
- **Ctrl+Z** to undo last move (local games only)

## Playing Online

### Host a Game
1. Click "Host Game"
2. Share the generated 6-character code with your friend
3. Wait for them to join

### Join a Game
1. Get the game code from your friend
2. Enter the code in the text field
3. Click "Join Game"

The game uses WebRTC for direct peer-to-peer connection, so no server is required!

## Deployment to GitHub Pages

### Quick Setup

1. **Fork or Clone** this repository
2. **Enable GitHub Pages:**
   - Go to repository Settings
   - Scroll to "Pages" section
   - Set Source to "Deploy from a branch"
   - Select "main" branch and "/ (root)" folder
   - Click Save

3. **Access your game** at: `https://yourusername.github.io/repository-name`

### Custom Domain (Optional)

1. Add a `CNAME` file with your domain name
2. Configure DNS settings with your domain provider
3. Enable HTTPS in GitHub Pages settings

## Development

### Project Structure

```
Abalone/
├── index.html          # Main HTML file
├── styles.css          # Game styling
├── game.js            # Core game logic and board rendering
├── multiplayer.js     # WebRTC multiplayer implementation
├── main.js           # UI management and initialization
└── README.md         # This file
```

### Local Development

1. Clone the repository
2. Open `index.html` in a web browser
3. Or serve with a local HTTP server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

### Game Architecture

- **AbaloneGame** (`game.js`): Core game logic, board state, move validation
- **MultiplayerManager** (`multiplayer.js`): WebRTC connection management
- **Main** (`main.js`): UI updates, event handling, game initialization

### Adding Features

The modular architecture makes it easy to extend:

- **New game modes**: Extend `AbaloneGame` class
- **Better signaling**: Replace localStorage signaling in `MultiplayerManager`
- **AI opponent**: Add computer player logic
- **Tournament mode**: Add multiple game support

## Technical Details

### WebRTC Implementation

The multiplayer uses WebRTC DataChannels for real-time communication:

- **Signaling**: Simple localStorage-based signaling (works for local testing)
- **ICE Servers**: Google STUN servers for NAT traversal
- **Data Format**: JSON messages for game state synchronization

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

WebRTC support is required for multiplayer functionality.

### Mobile Support

The game is fully responsive and works on mobile devices:
- Touch controls for piece selection and movement
- Adaptive canvas sizing
- Mobile-optimized UI layout

## Troubleshooting

### Multiplayer Connection Issues

1. **"Game not found"**: Code might be expired or mistyped
2. **"Connection timeout"**: Firewall or NAT issues, try different network
3. **Disconnect during game**: WebRTC connection lost, try reconnecting

### Game Issues

1. **Pieces won't move**: Check if it's your turn and move is valid
2. **Board not rendering**: Try refreshing the page
3. **Mobile controls**: Use single taps, avoid dragging

## License

MIT License - feel free to use and modify for your own projects!

## Contributing

Contributions welcome! Areas for improvement:
- Better signaling server for production use
- AI opponent implementation
- Additional game variants
- Improved mobile experience
- Sound effects and animations

---

**Enjoy playing Abalone online!** 🎯