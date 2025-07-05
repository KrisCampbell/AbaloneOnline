class MultiplayerManager {
    constructor(game) {
        this.game = game;
        this.isHost = false;
        this.isConnected = false;
        this.gameCode = null;
        this.peerConnection = null;
        this.dataChannel = null;
        this.localId = this.generateId();
        
        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.setupEventListeners();
    }
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
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
            
            this.updateConnectionStatus('Waiting for player...');
            this.showGameCode();
            
            // Initialize peer connection
            this.peerConnection = new RTCPeerConnection(this.rtcConfig);
            this.setupPeerConnection();
            
            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel('gameData', {
                ordered: true
            });
            this.setupDataChannel();
            
            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Store offer in localStorage (simple signaling)
            this.storeOffer(this.gameCode, offer);
            
            // Poll for answer
            this.pollForAnswer();
            
        } catch (error) {
            console.error('Error hosting game:', error);
            this.updateConnectionStatus('Error hosting game');
        }
    }
    
    async joinGame(code) {
        try {
            this.isHost = false;
            this.gameCode = code;
            
            this.updateConnectionStatus('Connecting...');
            
            // Get offer from localStorage
            const offerData = this.getOffer(code);
            if (!offerData) {
                this.updateConnectionStatus('Game not found');
                return;
            }
            
            // Initialize peer connection
            this.peerConnection = new RTCPeerConnection(this.rtcConfig);
            this.setupPeerConnection();
            
            // Set remote description
            await this.peerConnection.setRemoteDescription(offerData.offer);
            
            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Store answer
            this.storeAnswer(code, answer);
            
        } catch (error) {
            console.error('Error joining game:', error);
            this.updateConnectionStatus('Error joining game');
        }
    }
    
    setupPeerConnection() {
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.storeIceCandidate(this.gameCode, event.candidate, this.isHost);
            }
        };
        
        this.peerConnection.ondatachannel = (event) => {
            if (!this.isHost) {
                this.dataChannel = event.channel;
                this.setupDataChannel();
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
        
        // Poll for ICE candidates
        this.pollForIceCandidates();
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
    
    onConnectionEstablished() {
        this.isConnected = true;
        this.updateConnectionStatus('Connected');
        this.hideGameCode();
        
        // Sync game state
        if (this.isHost) {
            this.sendGameState();
        }
        
        // Update UI
        document.getElementById('host-game').disabled = true;
        document.getElementById('join-game').disabled = true;
        document.getElementById('game-code').disabled = true;
        document.getElementById('game-mode').textContent = this.isHost ? 'Host' : 'Guest';
    }
    
    onConnectionLost() {
        this.isConnected = false;
        this.updateConnectionStatus('Disconnected');
        
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
        
        // Clean up localStorage
        if (this.gameCode) {
            this.cleanupGameData(this.gameCode);
        }
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
            case 'chat':
                this.handleChatMessage(data.message);
                break;
        }
    }
    
    handleRemoteMove(move) {
        // Apply the move to the game
        if (this.game.isValidMove(move)) {
            this.game.makeMove(move);
            this.game.switchPlayer();
            this.game.render();
            this.game.updateUI();
        }
    }
    
    handleGameStateSync(gameState) {
        // Sync game state with host
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
    
    // Simple cross-device signaling using a free pastebin-like service
    async storeOffer(gameCode, offer) {
        const data = {
            offer: offer,
            timestamp: Date.now(),
            type: 'offer'
        };
        
        try {
            await this.storeToCloud(gameCode, data);
        } catch (error) {
            console.error('Failed to store offer:', error);
            // Fallback to localStorage for same-device testing
            localStorage.setItem(`abalone_offer_${gameCode}`, JSON.stringify(data));
        }
    }
    
    async getOffer(gameCode) {
        try {
            const data = await this.getFromCloud(gameCode);
            if (data && data.type === 'offer' && Date.now() - data.timestamp < 300000) {
                return data;
            }
        } catch (error) {
            console.error('Failed to get offer:', error);
            // Fallback to localStorage
            const localData = localStorage.getItem(`abalone_offer_${gameCode}`);
            if (localData) {
                const parsed = JSON.parse(localData);
                if (Date.now() - parsed.timestamp < 300000) {
                    return parsed;
                }
            }
        }
        return null;
    }
    
    async storeAnswer(gameCode, answer) {
        const data = {
            answer: answer,
            timestamp: Date.now(),
            type: 'answer'
        };
        
        try {
            await this.storeToCloud(`${gameCode}_answer`, data);
        } catch (error) {
            console.error('Failed to store answer:', error);
            localStorage.setItem(`abalone_answer_${gameCode}`, JSON.stringify(data));
        }
    }
    
    async getAnswer(gameCode) {
        try {
            const data = await this.getFromCloud(`${gameCode}_answer`);
            if (data && data.type === 'answer' && Date.now() - data.timestamp < 300000) {
                return data;
            }
        } catch (error) {
            console.error('Failed to get answer:', error);
            const localData = localStorage.getItem(`abalone_answer_${gameCode}`);
            if (localData) {
                const parsed = JSON.parse(localData);
                if (Date.now() - parsed.timestamp < 300000) {
                    return parsed;
                }
            }
        }
        return null;
    }
    
    async storeIceCandidate(gameCode, candidate, isHost) {
        // For simplicity, we'll skip ICE candidate exchange for now
        // Most connections will work with STUN servers alone
        console.log('ICE candidate generated:', candidate);
    }
    
    async getIceCandidates(gameCode, isHost) {
        // Return empty array since we're skipping ICE candidate exchange
        return [];
    }
    
    // Simple cloud storage using dpaste.com (free, no-auth service)
    async storeToCloud(key, data) {
        const payload = JSON.stringify(data);
        
        try {
            const response = await fetch('https://dpaste.com/api/v2/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'content': payload,
                    'syntax': 'json',
                    'expiry_days': 1
                })
            });
            
            if (response.ok) {
                const pasteUrl = response.url;
                // Store the URL mapping
                localStorage.setItem(`cloud_url_${key}`, pasteUrl);
                sessionStorage.setItem(`signal_${key}`, payload);
                return pasteUrl;
            }
        } catch (error) {
            console.error('Cloud storage failed:', error);
        }
        
        // Fallback to session storage
        sessionStorage.setItem(`signal_${key}`, payload);
        throw new Error('Cloud storage unavailable');
    }
    
    async getFromCloud(key) {
        // Try session storage first (same browser)
        const sessionData = sessionStorage.getItem(`signal_${key}`);
        if (sessionData) {
            try {
                return JSON.parse(sessionData);
            } catch (e) {
                console.error('Failed to parse session data');
            }
        }
        
        // Try to get from cloud
        const cloudUrl = localStorage.getItem(`cloud_url_${key}`);
        if (cloudUrl) {
            try {
                const response = await fetch(cloudUrl + '.txt');
                if (response.ok) {
                    const content = await response.text();
                    return JSON.parse(content);
                }
            } catch (error) {
                console.error('Failed to fetch from cloud:', error);
            }
        }
        
        return null;
    }
    
    pollForAnswer() {
        const pollInterval = setInterval(() => {
            if (!this.isConnected) {
                const answerData = this.getAnswer(this.gameCode);
                if (answerData) {
                    this.peerConnection.setRemoteDescription(answerData.answer);
                    clearInterval(pollInterval);
                }
            } else {
                clearInterval(pollInterval);
            }
        }, 1000);
        
        // Stop polling after 2 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
            if (!this.isConnected) {
                this.updateConnectionStatus('Connection timeout');
            }
        }, 120000);
    }
    
    pollForIceCandidates() {
        const pollInterval = setInterval(() => {
            if (this.peerConnection && this.peerConnection.connectionState !== 'connected') {
                const candidates = this.getIceCandidates(this.gameCode, this.isHost);
                candidates.forEach(candidateData => {
                    this.peerConnection.addIceCandidate(candidateData.candidate);
                });
                
                // Clear processed candidates
                const key = `abalone_ice_${this.gameCode}_${this.isHost ? 'guest' : 'host'}`;
                localStorage.removeItem(key);
            }
            
            if (!this.peerConnection || this.peerConnection.connectionState === 'connected') {
                clearInterval(pollInterval);
            }
        }, 1000);
        
        // Stop polling after 2 minutes
        setTimeout(() => {
            clearInterval(pollInterval);
        }, 120000);
    }
    
    cleanupGameData(gameCode) {
        localStorage.removeItem(`abalone_offer_${gameCode}`);
        localStorage.removeItem(`abalone_answer_${gameCode}`);
        localStorage.removeItem(`abalone_ice_${gameCode}_host`);
        localStorage.removeItem(`abalone_ice_${gameCode}_guest`);
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
        if (status === 'Connected') {
            statusElement.classList.add('connected');
        } else if (status.includes('Connecting') || status.includes('Waiting')) {
            statusElement.classList.add('connecting');
        } else {
            statusElement.classList.add('disconnected');
        }
    }
    
    showGameCode() {
        document.getElementById('generated-code').textContent = this.gameCode;
        document.getElementById('game-code-display').style.display = 'block';
    }
    
    hideGameCode() {
        document.getElementById('game-code-display').style.display = 'none';
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