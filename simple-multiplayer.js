// Simple URL-based multiplayer approach
class SimpleMultiplayer {
    constructor(game) {
        this.game = game;
        this.isHost = false;
        this.isConnected = false;
        this.gameCode = null;
        this.peerConnection = null;
        this.dataChannel = null;
        
        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.setupEventListeners();
        this.checkForGameInURL();
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
    
    checkForGameInURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const gameCode = urlParams.get('game');
        if (gameCode) {
            document.getElementById('game-code').value = gameCode;
            this.updateConnectionStatus('Ready to join game ' + gameCode);
        }
    }
    
    async hostGame() {
        try {
            this.isHost = true;
            this.gameCode = this.generateGameCode();
            
            this.updateConnectionStatus('Setting up game...');
            
            // Create shareable URL
            const gameURL = `${window.location.origin}${window.location.pathname}?game=${this.gameCode}`;
            
            this.showGameURL(gameURL);
            this.updateConnectionStatus('Share the URL above with your friend!');
            
            // Initialize peer connection for when someone joins
            this.initializePeerConnection();
            
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
            
            // Try to connect directly via WebRTC
            await this.initializePeerConnection();
            await this.createOfferAndShare();
            
        } catch (error) {
            console.error('Error joining game:', error);
            this.updateConnectionStatus('Could not connect to game');
        }
    }
    
    async initializePeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.rtcConfig);
        
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE candidate:', event.candidate);
                // In a real implementation, you'd send this to the other peer
            }
        };
        
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            console.log('Connection state:', state);
            
            if (state === 'connected') {
                this.onConnectionEstablished();
            } else if (state === 'disconnected' || state === 'failed') {
                this.onConnectionLost();
            }
        };
        
        if (this.isHost) {
            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel('gameData', {
                ordered: true
            });
            this.setupDataChannel();
        } else {
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannel();
            };
        }
    }
    
    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.onConnectionEstablished();
        };
        
        this.dataChannel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleRemoteMessage(data);
        };
        
        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.onConnectionLost();
        };
        
        this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.updateConnectionStatus('Connection error');
        };
    }
    
    async createOfferAndShare() {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        // In a real implementation, you'd need a signaling server
        // For now, we'll show instructions to manually share
        this.showManualConnectionInstructions(offer);
    }
    
    showGameURL(url) {
        const codeDisplay = document.getElementById('game-code-display');
        codeDisplay.innerHTML = `
            <p><strong>Share this URL with your friend:</strong></p>
            <input type="text" value="${url}" readonly style="width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ccc; border-radius: 3px;">
            <button onclick="navigator.clipboard.writeText('${url}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy URL', 2000)">Copy URL</button>
            <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                Your friend can click this link to join your game!
            </p>
        `;
        codeDisplay.style.display = 'block';
    }
    
    showManualConnectionInstructions(offer) {
        this.updateConnectionStatus('Waiting for host to accept...');
        
        // For now, show simplified connection method
        // In a production app, you'd use a proper signaling server
        alert('To connect with your friend, you both need to be on the same local network or use a VPN. This is a limitation of the current demo version.');
    }
    
    onConnectionEstablished() {
        this.isConnected = true;
        this.updateConnectionStatus('Connected! You can now play.');
        
        // Hide connection UI
        document.getElementById('game-code-display').style.display = 'none';
        
        // Update UI
        document.getElementById('host-game').disabled = true;
        document.getElementById('join-game').disabled = true;
        document.getElementById('game-code').disabled = true;
        document.getElementById('game-mode').textContent = this.isHost ? 'Host' : 'Guest';
        
        // Sync game state if host
        if (this.isHost) {
            this.sendGameState();
        }
    }
    
    onConnectionLost() {
        this.isConnected = false;
        this.updateConnectionStatus('Connection lost');
        
        // Clean up
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        
        // Re-enable UI
        document.getElementById('host-game').disabled = false;
        document.getElementById('join-game').disabled = false;
        document.getElementById('game-code').disabled = false;
        document.getElementById('game-mode').textContent = 'Local';
    }
    
    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(message));
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
        this.game.reset();
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
        this.sendMessage({
            type: 'reset'
        });
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
    
    disconnect() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        this.onConnectionLost();
    }
}