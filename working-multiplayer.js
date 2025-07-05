// Working multiplayer using PeerJS (a simple WebRTC wrapper)
class WorkingMultiplayer {
    constructor(game) {
        this.game = game;
        this.isHost = false;
        this.isConnected = false;
        this.gameCode = null;
        this.peer = null;
        this.connection = null;
        this.myColor = null; // 'white' for host, 'black' for guest
        this.isResetting = false; // Prevent reset loops
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.getElementById('host-game').addEventListener('click', () => {
            this.hostGame();
        });
        
        document.getElementById('join-game').addEventListener('click', () => {
            const code = document.getElementById('game-code').value.trim().toUpperCase();
            if (code) {
                this.joinGame(code);
            }
        });
        
        document.getElementById('game-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const code = e.target.value.trim().toUpperCase();
                if (code) {
                    this.joinGame(code);
                }
            }
        });
    }
    
    async hostGame() {
        try {
            this.isHost = true;
            this.gameCode = this.generateGameCode();
            
            this.updateConnectionStatus('Setting up game...');
            
            // Initialize PeerJS with multiple fallback servers
            this.peer = new Peer(this.gameCode, {
                // Use the default PeerJS cloud server (most reliable)
                debug: 2
            });
            
            this.peer.on('open', (id) => {
                console.log('Peer opened with ID:', id);
                this.showGameCode();
                this.updateConnectionStatus('Waiting for player to join...');
            });
            
            this.peer.on('connection', (conn) => {
                this.connection = conn;
                this.setupConnection();
                this.updateConnectionStatus('Player joined! Starting game...');
            });
            
            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                this.updateConnectionStatus('Error: ' + err.message);
            });
            
        } catch (error) {
            console.error('Error hosting game:', error);
            this.updateConnectionStatus('Error hosting game');
        }
    }
    
    async joinGame(code) {
        try {
            this.isHost = false;
            this.gameCode = code;
            
            this.updateConnectionStatus('Connecting to game...');
            
            // Initialize PeerJS
            this.peer = new Peer({
                debug: 2
            });
            
            this.peer.on('open', (id) => {
                console.log('Peer opened with ID:', id);
                
                // Connect to host
                this.connection = this.peer.connect(code);
                this.setupConnection();
            });
            
            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (err.type === 'peer-unavailable') {
                    this.updateConnectionStatus('Game not found - check the code');
                } else {
                    this.updateConnectionStatus('Connection error: ' + err.message);
                }
            });
            
        } catch (error) {
            console.error('Error joining game:', error);
            this.updateConnectionStatus('Error joining game');
        }
    }
    
    setupConnection() {
        this.connection.on('open', () => {
            console.log('Connection opened');
            this.onConnectionEstablished();
        });
        
        this.connection.on('data', (data) => {
            console.log('Received data:', data);
            this.handleRemoteMessage(data);
        });
        
        this.connection.on('close', () => {
            console.log('Connection closed');
            this.onConnectionLost();
        });
        
        this.connection.on('error', (err) => {
            console.error('Connection error:', err);
            this.updateConnectionStatus('Connection error');
        });
    }
    
    onConnectionEstablished() {
        this.isConnected = true;
        
        // Assign player colors
        this.myColor = this.isHost ? 'white' : 'black';
        
        const statusText = this.isHost ? 
            'Connected! You are White (bottom player)' : 
            'Connected! You are Black (top player)';
        this.updateConnectionStatus(statusText);
        
        // Hide connection UI
        document.getElementById('game-code-display').style.display = 'none';
        
        // Update UI
        document.getElementById('host-game').disabled = true;
        document.getElementById('join-game').disabled = true;
        document.getElementById('game-code').disabled = true;
        document.getElementById('game-mode').textContent = `${this.isHost ? 'Host' : 'Guest'} (${this.myColor})`;
        
        // Reset game to standard starting position with black to move first
        this.isResetting = true;
        this.game.reset();
        this.isResetting = false;
        
        // Sync game state if host
        if (this.isHost) {
            this.sendGameState();
        }
        
        // Update UI to show whose turn it is
        this.updateTurnIndicator();
    }
    
    onConnectionLost() {
        this.isConnected = false;
        this.updateConnectionStatus('Connection lost');
        
        // Clean up
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        
        // Re-enable UI
        document.getElementById('host-game').disabled = false;
        document.getElementById('join-game').disabled = false;
        document.getElementById('game-code').disabled = false;
        document.getElementById('game-mode').textContent = 'Local';
    }
    
    sendMessage(message) {
        if (this.connection && this.connection.open) {
            this.connection.send(message);
        }
    }
    
    handleRemoteMessage(data) {
        switch (data.type) {
            case 'move':
                this.handleRemoteMove(data.move);
                break;
            case 'gameState':
                this.handleGameStateSync(data.gameState);
                break;
            case 'reset':
                this.handleRemoteReset();
                break;
        }
    }
    
    handleRemoteMove(move) {
        if (this.game.isValidMove(move)) {
            this.game.makeMove(move);
            this.game.switchPlayer();
            this.game.render();
            this.game.updateUI();
            this.updateTurnIndicator();
        }
    }
    
    handleGameStateSync(gameState) {
        this.game.board = new Map(gameState.board);
        this.game.currentPlayer = gameState.currentPlayer;
        this.game.blackScore = gameState.blackScore;
        this.game.whiteScore = gameState.whiteScore;
        this.game.gameHistory = gameState.gameHistory;
        this.game.gameEnded = gameState.gameEnded;
        this.game.winner = gameState.winner;
        this.game.render();
        this.game.updateUI();
    }
    
    handleRemoteReset() {
        this.isResetting = true;
        this.game.reset();
        this.isResetting = false;
        this.updateTurnIndicator();
    }
    
    sendMove(move) {
        this.sendMessage({
            type: 'move',
            move: move
        });
    }
    
    sendGameState() {
        this.sendMessage({
            type: 'gameState',
            gameState: {
                board: Array.from(this.game.board.entries()),
                currentPlayer: this.game.currentPlayer,
                blackScore: this.game.blackScore,
                whiteScore: this.game.whiteScore,
                gameHistory: this.game.gameHistory,
                gameEnded: this.game.gameEnded,
                winner: this.game.winner
            }
        });
    }
    
    sendReset() {
        if (!this.isResetting) {
            this.sendMessage({
                type: 'reset'
            });
        }
    }
    
    generateGameCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        statusElement.textContent = status;
        
        // Update CSS classes
        statusElement.className = 'connection-status';
        if (status.includes('Connected')) {
            statusElement.classList.add('connected');
        } else if (status.includes('Setting up') || status.includes('Connecting') || status.includes('Waiting')) {
            statusElement.classList.add('connecting');
        } else {
            statusElement.classList.add('disconnected');
        }
    }
    
    showGameCode() {
        document.getElementById('generated-code').textContent = this.gameCode;
        document.getElementById('game-code-display').style.display = 'block';
    }
    
    // Check if it's the current player's turn
    isMyTurn() {
        if (!this.isConnected || !this.myColor) {
            return true; // Local game, allow all moves
        }
        return this.game.currentPlayer === this.myColor;
    }
    
    // Update turn indicator in the UI
    updateTurnIndicator() {
        if (!this.isConnected) return;
        
        const currentPlayerElement = document.getElementById('current-player');
        const isMyTurn = this.isMyTurn();
        
        if (isMyTurn) {
            currentPlayerElement.style.color = this.myColor === 'black' ? '#333' : '#666';
            currentPlayerElement.style.fontWeight = 'bold';
            this.updateConnectionStatus(`Your turn! (${this.myColor})`);
        } else {
            currentPlayerElement.style.color = '#999';
            currentPlayerElement.style.fontWeight = 'normal';
            this.updateConnectionStatus(`Waiting for opponent's move...`);
        }
    }
    
    // Override the game's move handling for multiplayer
    canMakeMove() {
        if (!this.isConnected) {
            return true; // Local game
        }
        return this.isMyTurn();
    }
    
    disconnect() {
        if (this.connection) {
            this.connection.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.onConnectionLost();
    }
}