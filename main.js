// Main application initialization and UI management
let game = null;
let multiplayer = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    setupUIEventListeners();
});

function initializeGame() {
    // Initialize the game
    game = new AbaloneGame();
    
    // Initialize multiplayer manager
    multiplayer = new WorkingMultiplayer(game);
    
    // Make multiplayer globally accessible for game logic
    window.multiplayer = multiplayer;
    
    // Extend game with multiplayer support
    game.onMoveComplete = (move) => {
        if (multiplayer.isConnected) {
            multiplayer.sendMove(move);
            multiplayer.updateTurnIndicator();
        }
        updateUI();
        addMoveToHistory(move);
    };
    
    game.onGameReset = () => {
        if (multiplayer.isConnected) {
            multiplayer.sendReset();
            multiplayer.updateTurnIndicator();
        }
        updateUI();
        clearMoveHistory();
    };
    
    // Override game methods to support multiplayer
    const originalMakeMove = game.makeMove.bind(game);
    game.makeMove = (move) => {
        originalMakeMove(move);
        if (game.onMoveComplete) {
            game.onMoveComplete(move);
        }
    };
    
    const originalReset = game.reset.bind(game);
    game.reset = () => {
        originalReset();
        if (game.onGameReset) {
            game.onGameReset();
        }
    };
    
    // Add UI update method to game
    game.updateUI = updateUI;
    
    // Initial UI update
    updateUI();
}

function setupUIEventListeners() {
    // Reset game button
    document.getElementById('reset-game').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the game?')) {
            game.reset();
        }
    });
    
    // Undo move button
    document.getElementById('undo-move').addEventListener('click', () => {
        undoLastMove();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' && e.ctrlKey) {
            e.preventDefault();
            if (confirm('Are you sure you want to reset the game?')) {
                game.reset();
            }
        }
        
        if (e.key === 'z' && e.ctrlKey) {
            e.preventDefault();
            undoLastMove();
        }
        
        if (e.key === 'Escape') {
            game.selectedPieces = [];
            game.render();
        }
    });
    
    // Prevent context menu on canvas
    document.getElementById('game-board').addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Optionally adjust canvas size for mobile
        adjustCanvasSize();
    });
}

function updateUI() {
    // Update current player indicator
    const currentPlayerElement = document.getElementById('current-player');
    currentPlayerElement.textContent = game.currentPlayer.charAt(0).toUpperCase() + game.currentPlayer.slice(1);
    currentPlayerElement.style.color = game.currentPlayer === 'black' ? '#333' : '#666';
    
    // Update scores
    document.getElementById('black-score').textContent = game.blackScore;
    document.getElementById('white-score').textContent = game.whiteScore;
    
    // Update undo button state
    const undoButton = document.getElementById('undo-move');
    undoButton.disabled = game.gameHistory.length === 0 || multiplayer.isConnected;
    
    // Check for game end
    if (game.gameEnded) {
        showGameEndMessage();
    }
    
    // Update move history display
    updateMoveHistoryDisplay();
}

function showGameEndMessage() {
    const winner = game.winner;
    const message = `Game Over! ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins!`;
    
    // Create a modal or alert
    setTimeout(() => {
        if (confirm(`${message}\n\nWould you like to play again?`)) {
            game.reset();
        }
    }, 500);
}

function addMoveToHistory(move) {
    const historyList = document.getElementById('history-list');
    const moveNumber = game.gameHistory.length;
    
    const moveElement = document.createElement('div');
    moveElement.className = 'history-item';
    
    const moveText = formatMoveForHistory(move, moveNumber);
    moveElement.innerHTML = moveText;
    
    historyList.appendChild(moveElement);
    
    // Scroll to bottom
    historyList.scrollTop = historyList.scrollHeight;
    
    // Limit history to last 20 moves
    while (historyList.children.length > 20) {
        historyList.removeChild(historyList.firstChild);
    }
}

function formatMoveForHistory(move, moveNumber) {
    const player = move.player;
    const playerSymbol = player === 'black' ? '●' : '○';
    
    let moveText = `${moveNumber}. ${playerSymbol} `;
    
    if (move.from.length === 1) {
        moveText += `${formatPosition(move.from[0])} → ${formatPosition(move.to)}`;
    } else {
        const fromPositions = move.from.map(pos => formatPosition(pos)).join('-');
        moveText += `${fromPositions} → ${formatPosition(move.to)}`;
    }
    
    if (move.captured && move.captured.length > 0) {
        moveText += ` <span class="highlight-move">Captured ${move.captured.length}!</span>`;
    }
    
    return moveText;
}

function formatPosition(position) {
    // Convert axial coordinates to a more readable format
    const { q, r } = position;
    const col = String.fromCharCode(97 + q + 4); // Convert to letter (a-i)
    const row = r + 5; // Convert to number (1-9)
    return `${col}${row}`;
}

function updateMoveHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    
    if (game.gameHistory.length === 0) {
        historyList.innerHTML = '<div class="history-item" style="color: #999; font-style: italic;">No moves yet</div>';
        return;
    }
    
    // Clear and rebuild history
    historyList.innerHTML = '';
    
    game.gameHistory.forEach((move, index) => {
        addMoveToHistory(move);
    });
}

function clearMoveHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<div class="history-item" style="color: #999; font-style: italic;">No moves yet</div>';
}

function undoLastMove() {
    if (game.gameHistory.length === 0 || multiplayer.isConnected) {
        return;
    }
    
    const lastMove = game.gameHistory.pop();
    
    // Restore the game state to before the last move
    // This is a simplified undo - in a full implementation, you'd store complete game states
    restoreGameStateBeforeMove(lastMove);
    
    // Switch back to the previous player
    game.switchPlayer();
    
    // Update UI
    updateUI();
    game.render();
}

function restoreGameStateBeforeMove(move) {
    // This is a simplified undo implementation
    // In a production version, you'd want to store complete game states
    
    // Restore captured pieces
    if (move.captured && move.captured.length > 0) {
        move.captured.forEach(captured => {
            const key = `${captured.position.q},${captured.position.r}`;
            game.board.set(key, captured.piece);
            
            // Update scores
            if (captured.piece === 'black') {
                game.whiteScore--;
            } else {
                game.blackScore--;
            }
        });
    }
    
    // Move pieces back to their original positions
    const direction = getUndoDirection(move);
    
    move.from.forEach(originalPos => {
        const currentPos = {
            q: originalPos.q + direction.q,
            r: originalPos.r + direction.r
        };
        
        const currentKey = `${currentPos.q},${currentPos.r}`;
        const originalKey = `${originalPos.q},${originalPos.r}`;
        
        const piece = game.board.get(currentKey);
        game.board.set(originalKey, piece);
        game.board.set(currentKey, null);
    });
    
    // Check if game should continue
    game.gameEnded = false;
    game.winner = null;
}

function getUndoDirection(move) {
    const firstPiece = move.from[0];
    const direction = {
        q: move.to.q - firstPiece.q,
        r: move.to.r - firstPiece.r
    };
    
    // Normalize direction
    const gcd = Math.abs(getGCD(direction.q, direction.r));
    if (gcd > 0) {
        direction.q = direction.q / gcd;
        direction.r = direction.r / gcd;
    }
    
    return direction;
}

function getGCD(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

function adjustCanvasSize() {
    const canvas = document.getElementById('game-board');
    const container = document.querySelector('.board-container');
    
    if (window.innerWidth <= 768) {
        const maxSize = Math.min(window.innerWidth - 40, 400);
        canvas.style.width = `${maxSize}px`;
        canvas.style.height = `${maxSize}px`;
    } else {
        canvas.style.width = '600px';
        canvas.style.height = '600px';
    }
}

// Initialize canvas size on load
document.addEventListener('DOMContentLoaded', () => {
    adjustCanvasSize();
});

// Export for debugging
window.gameDebug = {
    game: () => game,
    multiplayer: () => multiplayer,
    printBoard: () => {
        console.log('Current board state:');
        game.board.forEach((piece, key) => {
            if (piece) {
                console.log(`${key}: ${piece}`);
            }
        });
    },
    printHistory: () => {
        console.log('Move history:');
        game.gameHistory.forEach((move, index) => {
            console.log(`${index + 1}:`, move);
        });
    }
};