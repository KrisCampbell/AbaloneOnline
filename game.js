class AbaloneGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'black';
        this.selectedPieces = [];
        this.gameHistory = [];
        this.blackScore = 0;
        this.whiteScore = 0;
        this.gameEnded = false;
        
        // Board dimensions
        this.boardSize = 600;
        this.hexRadius = 25;
        this.hexWidth = this.hexRadius * 2;
        this.hexHeight = Math.sqrt(3) * this.hexRadius;
        
        // Initialize canvas
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial render
        this.render();
    }
    
    initializeBoard() {
        // Create proper hexagonal Abalone board
        // Using axial coordinates (q, r) for hexagonal grid
        const board = new Map();
        
        // Standard Abalone board: proper hexagon with 61 positions
        // This creates a symmetrical hexagon, not an elongated shape
        for (let q = -4; q <= 4; q++) {
            const r1 = Math.max(-4, -q - 4);
            const r2 = Math.min(4, -q + 4);
            for (let r = r1; r <= r2; r++) {
                board.set(`${q},${r}`, null);
            }
        }
        
        // Place initial pieces in standard Abalone formation
        // Black pieces (top-left side)
        const blackPieces = [
            // Back row (edge of board)
            [-4, 0], [-4, 1], [-4, 2], [-4, 3], [-4, 4],
            // Middle row
            [-3, -1], [-3, 0], [-3, 1], [-3, 2], [-3, 3], [-3, 4],
            // Front row (closest to center)
            [-2, -2], [-2, -1], [-2, 0]
        ];
        
        blackPieces.forEach(([q, r]) => {
            board.set(`${q},${r}`, 'black');
        });
        
        // White pieces (bottom-right side)
        const whitePieces = [
            // Front row (closest to center)
            [2, 0], [2, 1], [2, 2],
            // Middle row
            [3, -4], [3, -3], [3, -2], [3, -1], [3, 0], [3, 1],
            // Back row (edge of board)
            [4, -4], [4, -3], [4, -2], [4, -1], [4, 0]
        ];
        
        whitePieces.forEach(([q, r]) => {
            board.set(`${q},${r}`, 'white');
        });
        
        return board;
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            if (this.gameEnded) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const hex = this.pixelToHex(x, y);
            if (hex) {
                this.handleHexClick(hex);
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameEnded) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const hex = this.pixelToHex(x, y);
            this.hoveredHex = hex;
            this.render();
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredHex = null;
            this.render();
        });
    }
    
    handleHexClick(hex) {
        // Check if this player can make moves (for multiplayer)
        if (window.multiplayer && !window.multiplayer.canMakeMove()) {
            return; // Not this player's turn
        }
        
        const key = `${hex.q},${hex.r}`;
        const piece = this.board.get(key);
        
        if (this.selectedPieces.length === 0) {
            // First selection
            if (piece === this.currentPlayer) {
                this.selectedPieces.push(hex);
                this.render();
            }
        } else {
            // Subsequent selections
            if (piece === this.currentPlayer && this.canAddToSelection(hex)) {
                // Add to selection if it's the same player and in line
                this.selectedPieces.push(hex);
                this.render();
            } else if (piece === null || piece !== this.currentPlayer) {
                // Try to make a move
                const move = {
                    from: [...this.selectedPieces],
                    to: hex,
                    player: this.currentPlayer
                };
                
                if (this.isValidMove(move)) {
                    this.makeMove(move);
                    this.selectedPieces = [];
                    this.switchPlayer();
                    this.render();
                } else {
                    // Invalid move, clear selection
                    this.selectedPieces = [];
                    this.render();
                }
            } else {
                // Clear selection and start new
                this.selectedPieces = [hex];
                this.render();
            }
        }
    }
    
    canAddToSelection(hex) {
        if (this.selectedPieces.length === 0) return true;
        if (this.selectedPieces.length >= 3) return false;
        
        // Check if the new hex is in line with existing selection
        if (this.selectedPieces.length === 1) {
            return this.isAdjacent(this.selectedPieces[0], hex);
        }
        
        if (this.selectedPieces.length === 2) {
            // Check if all three are in a line
            const [first, second] = this.selectedPieces;
            return this.areInLine(first, second, hex) && 
                   (this.isAdjacent(first, hex) || this.isAdjacent(second, hex));
        }
        
        return false;
    }
    
    isAdjacent(hex1, hex2) {
        const dq = Math.abs(hex1.q - hex2.q);
        const dr = Math.abs(hex1.r - hex2.r);
        const ds = Math.abs(hex1.q + hex1.r - hex2.q - hex2.r);
        return (dq <= 1 && dr <= 1 && ds <= 1) && (dq + dr + ds === 2);
    }
    
    areInLine(hex1, hex2, hex3) {
        // Check if three hexes are in a straight line
        const dq1 = hex2.q - hex1.q;
        const dr1 = hex2.r - hex1.r;
        const dq2 = hex3.q - hex2.q;
        const dr2 = hex3.r - hex2.r;
        
        return dq1 === dq2 && dr1 === dr2;
    }
    
    isValidMove(move) {
        const { from, to } = move;
        
        // Check if all selected pieces belong to current player
        for (const hex of from) {
            const key = `${hex.q},${hex.r}`;
            if (this.board.get(key) !== this.currentPlayer) {
                return false;
            }
        }
        
        // Check if destination exists on board
        const toKey = `${to.q},${to.r}`;
        if (!this.board.has(toKey)) return false;
        
        // Sort pieces by distance from destination
        const sortedPieces = [...from].sort((a, b) => {
            const distA = Math.abs(a.q - to.q) + Math.abs(a.r - to.r);
            const distB = Math.abs(b.q - to.q) + Math.abs(b.r - to.r);
            return distA - distB;
        });
        
        // Check if it's a valid push or sidestep
        return this.isValidPush(sortedPieces, to) || this.isValidSidestep(sortedPieces, to);
    }
    
    isValidPush(pieces, to) {
        // For single piece moves
        if (pieces.length === 1) {
            const toKey = `${to.q},${to.r}`;
            const destinationPiece = this.board.get(toKey);
            
            // Single piece can only move to empty adjacent space
            if (destinationPiece === null) {
                return this.isAdjacent(pieces[0], to);
            } else {
                // Single piece cannot move to occupied space or push opponents
                return false;
            }
        }
        
        // For multi-piece moves: inline movement (forward/backward)
        // Check if pieces are in a straight line
        if (!this.areInLine(pieces)) {
            return false;
        }
        
        // Check if destination is inline with the piece formation
        if (!this.isInlineMove(pieces, to)) {
            return false;
        }
        
        // Sort pieces from back to front in movement direction
        const direction = this.getDirection(pieces[0], to);
        const sortedPieces = this.sortPiecesInDirection(pieces, direction);
        
        // Check if this is a valid push (moving forward into opponents)
        return this.canPush(sortedPieces, direction);
    }
    
    isValidSidestep(pieces, to) {
        // For sidestep moves, pieces move perpendicular to their line
        if (pieces.length === 1) {
            // Single piece movement is handled by isValidPush
            return false;
        }
        
        // Check if pieces are in a valid line
        if (!this.areInLine(pieces)) {
            return false;
        }
        
        // Check if this is a sideways move (perpendicular to the line)
        if (this.isInlineMove(pieces, to)) {
            return false; // Inline moves are handled by push logic
        }
        
        // Get the movement direction
        const direction = this.getDirection(pieces[0], to);
        if (!direction) return false;
        
        // Check if move is perpendicular to piece line
        const lineDirection = this.getDirection(pieces[0], pieces[1]);
        if (!this.isPerpendicular(direction, lineDirection)) {
            return false;
        }
        
        // For sidestep, ALL destination positions must be empty
        for (const piece of pieces) {
            const newPos = {
                q: piece.q + direction.q,
                r: piece.r + direction.r
            };
            const key = `${newPos.q},${newPos.r}`;
            
            // Must be on board and completely empty
            if (!this.board.has(key) || this.board.get(key) !== null) {
                return false;
            }
        }
        
        return true;
    }
    
    isPerpendicular(dir1, dir2) {
        // Check if two directions are perpendicular in hex grid
        // In hex coordinates, perpendicular directions have dot product = 0
        return (dir1.q * dir2.q + dir1.r * dir2.r + (dir1.q + dir1.r) * (dir2.q + dir2.r)) === 0;
    }
    
    areInLine(pieces) {
        if (pieces.length <= 1) return true;
        if (pieces.length === 2) return this.isAdjacent(pieces[0], pieces[1]);
        
        // For 3 pieces, check if they're all consecutive in the same direction
        const dir1 = this.getDirection(pieces[0], pieces[1]);
        const dir2 = this.getDirection(pieces[1], pieces[2]);
        
        return dir1 && dir2 && dir1.q === dir2.q && dir1.r === dir2.r &&
               this.isAdjacent(pieces[0], pieces[1]) && this.isAdjacent(pieces[1], pieces[2]);
    }
    
    isInlineMove(pieces, to) {
        // Check if the destination is exactly one step forward or backward from the line
        if (pieces.length === 1) return true;
        
        // Get the direction of the piece line
        const lineDirection = this.getDirection(pieces[0], pieces[1]);
        if (!lineDirection) return false;
        
        // Sort pieces to find front and back
        const sortedPieces = this.sortPiecesInDirection(pieces, lineDirection);
        const frontPiece = sortedPieces[sortedPieces.length - 1];
        const backPiece = sortedPieces[0];
        
        // Check if destination is one step forward from front piece
        const frontStep = {
            q: frontPiece.q + lineDirection.q,
            r: frontPiece.r + lineDirection.r
        };
        if (to.q === frontStep.q && to.r === frontStep.r) {
            return true;
        }
        
        // Check if destination is one step backward from back piece
        const backStep = {
            q: backPiece.q - lineDirection.q,
            r: backPiece.r - lineDirection.r
        };
        if (to.q === backStep.q && to.r === backStep.r) {
            return true;
        }
        
        return false;
    }
    
    getDirection(from, to) {
        const dq = to.q - from.q;
        const dr = to.r - from.r;
        
        // Normalize to unit direction
        const gcd = Math.abs(this.gcd(dq, dr));
        if (gcd === 0) return null;
        
        return {
            q: dq / gcd,
            r: dr / gcd
        };
    }
    
    gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }
    
    sortPiecesInDirection(pieces, direction) {
        // Sort pieces from back to front in the movement direction
        return [...pieces].sort((a, b) => {
            const projA = a.q * direction.q + a.r * direction.r;
            const projB = b.q * direction.q + b.r * direction.r;
            return projA - projB;
        });
    }
    
    areConsecutiveInDirection(pieces, direction) {
        // Check if pieces are consecutive in the given direction
        for (let i = 1; i < pieces.length; i++) {
            const expectedPos = {
                q: pieces[i-1].q + direction.q,
                r: pieces[i-1].r + direction.r
            };
            if (pieces[i].q !== expectedPos.q || pieces[i].r !== expectedPos.r) {
                return false;
            }
        }
        return true;
    }
    
    canPush(pieces, direction) {
        // Check if the push is valid according to Abalone rules:
        // - 2 pieces can push 1 opponent piece
        // - 3 pieces can push 1 or 2 opponent pieces
        // - You must have numerical superiority
        
        const frontPiece = pieces[pieces.length - 1];
        let checkPos = {
            q: frontPiece.q + direction.q,
            r: frontPiece.r + direction.r
        };
        
        let opponentCount = 0;
        
        // Count consecutive opponent pieces in front
        while (this.board.has(`${checkPos.q},${checkPos.r}`)) {
            const piece = this.board.get(`${checkPos.q},${checkPos.r}`);
            if (piece === null) break; // Empty space, stop counting
            if (piece === this.currentPlayer) return false; // Can't push own pieces
            
            opponentCount++;
            
            checkPos = {
                q: checkPos.q + direction.q,
                r: checkPos.r + direction.r
            };
        }
        
        // Check if we can push this many opponents
        if (opponentCount === 0) {
            // No opponents to push - this should be a regular move
            return true;
        }
        
        // Apply Abalone push rules
        if (pieces.length === 1) {
            return false; // 1 piece cannot push any opponents
        } else if (pieces.length === 2) {
            return opponentCount === 1; // 2 pieces can only push 1 opponent
        } else if (pieces.length === 3) {
            return opponentCount <= 2; // 3 pieces can push 1 or 2 opponents
        }
        
        return false; // Should not reach here
    }
    
    makeMove(move) {
        const { from, to } = move;
        
        // Record move in history
        const moveRecord = {
            from: [...from],
            to: { ...to },
            player: this.currentPlayer,
            captured: []
        };
        
        if (this.isValidPush(from, to)) {
            this.executePush(from, to, moveRecord);
        } else {
            this.executeSidestep(from, to, moveRecord);
        }
        
        this.gameHistory.push(moveRecord);
        this.updateScore();
        this.checkWinCondition();
    }
    
    executePush(pieces, to, moveRecord) {
        const direction = this.getDirection(pieces[0], to);
        
        // Move opponent pieces first
        const frontPiece = pieces[pieces.length - 1];
        let checkPos = {
            q: frontPiece.q + direction.q,
            r: frontPiece.r + direction.r
        };
        
        const opponentPieces = [];
        while (this.board.has(`${checkPos.q},${checkPos.r}`) && 
               this.board.get(`${checkPos.q},${checkPos.r}`) !== null) {
            opponentPieces.push({ ...checkPos });
            checkPos = {
                q: checkPos.q + direction.q,
                r: checkPos.r + direction.r
            };
        }
        
        // Push opponent pieces
        for (let i = opponentPieces.length - 1; i >= 0; i--) {
            const piece = opponentPieces[i];
            const currentKey = `${piece.q},${piece.r}`;
            const newPos = {
                q: piece.q + direction.q,
                r: piece.r + direction.r
            };
            const newKey = `${newPos.q},${newPos.r}`;
            
            if (this.board.has(newKey)) {
                this.board.set(newKey, this.board.get(currentKey));
            } else {
                // Piece falls off board
                moveRecord.captured.push({
                    piece: this.board.get(currentKey),
                    position: piece
                });
            }
            this.board.set(currentKey, null);
        }
        
        // Move own pieces
        for (let i = pieces.length - 1; i >= 0; i--) {
            const piece = pieces[i];
            const currentKey = `${piece.q},${piece.r}`;
            const newPos = {
                q: piece.q + direction.q,
                r: piece.r + direction.r
            };
            const newKey = `${newPos.q},${newPos.r}`;
            
            this.board.set(newKey, this.board.get(currentKey));
            this.board.set(currentKey, null);
        }
    }
    
    executeSidestep(pieces, to, moveRecord) {
        const direction = this.getDirection(pieces[0], to);
        
        // Move all pieces simultaneously
        const moves = [];
        for (const piece of pieces) {
            const currentKey = `${piece.q},${piece.r}`;
            const newPos = {
                q: piece.q + direction.q,
                r: piece.r + direction.r
            };
            const newKey = `${newPos.q},${newPos.r}`;
            
            moves.push({
                from: currentKey,
                to: newKey,
                piece: this.board.get(currentKey)
            });
        }
        
        // Clear original positions
        for (const move of moves) {
            this.board.set(move.from, null);
        }
        
        // Set new positions
        for (const move of moves) {
            this.board.set(move.to, move.piece);
        }
    }
    
    updateScore() {
        const lastMove = this.gameHistory[this.gameHistory.length - 1];
        if (lastMove.captured.length > 0) {
            for (const captured of lastMove.captured) {
                if (captured.piece === 'black') {
                    this.whiteScore++;
                } else {
                    this.blackScore++;
                }
            }
        }
    }
    
    checkWinCondition() {
        if (this.blackScore >= 6) {
            this.gameEnded = true;
            this.winner = 'white';
        } else if (this.whiteScore >= 6) {
            this.gameEnded = true;
            this.winner = 'black';
        }
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
    }
    
    reset() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'black';
        this.selectedPieces = [];
        this.gameHistory = [];
        this.blackScore = 0;
        this.whiteScore = 0;
        this.gameEnded = false;
        this.winner = null;
        this.render();
    }
    
    // Rendering methods
    hexToPixel(hex) {
        const x = this.hexRadius * 1.5 * hex.q;
        const y = this.hexRadius * Math.sqrt(3) * (hex.r + hex.q / 2);
        return {
            x: x + this.boardSize / 2,
            y: y + this.boardSize / 2
        };
    }
    
    pixelToHex(x, y) {
        const relX = x - this.boardSize / 2;
        const relY = y - this.boardSize / 2;
        
        const q = (2/3) * relX / this.hexRadius;
        const r = (-1/3 * relX + Math.sqrt(3)/3 * relY) / this.hexRadius;
        
        const roundedHex = this.roundHex(q, r);
        
        // Check if this hex exists on the board
        const key = `${roundedHex.q},${roundedHex.r}`;
        if (this.board.has(key)) {
            return roundedHex;
        }
        
        return null;
    }
    
    roundHex(q, r) {
        const s = -q - r;
        
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);
        
        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - s);
        
        if (qDiff > rDiff && qDiff > sDiff) {
            rq = -rr - rs;
        } else if (rDiff > sDiff) {
            rr = -rq - rs;
        }
        
        return { q: rq, r: rr };
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.boardSize, this.boardSize);
        
        // Draw board
        this.board.forEach((piece, key) => {
            const [q, r] = key.split(',').map(Number);
            const hex = { q, r };
            const pixel = this.hexToPixel(hex);
            
            this.drawHex(pixel.x, pixel.y, hex, piece);
        });
        
        // Draw selection highlights
        for (const hex of this.selectedPieces) {
            const pixel = this.hexToPixel(hex);
            this.drawSelectionHighlight(pixel.x, pixel.y);
        }
        
        // Draw legal move indicators if pieces are selected
        if (this.selectedPieces.length > 0) {
            this.drawLegalMoveIndicators();
        }
        
        // Draw hover highlight
        if (this.hoveredHex) {
            const pixel = this.hexToPixel(this.hoveredHex);
            this.drawHoverHighlight(pixel.x, pixel.y);
        }
    }
    
    drawHex(x, y, hex, piece) {
        const { ctx } = this;
        
        // Draw hex outline
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = x + this.hexRadius * Math.cos(angle);
            const hy = y + this.hexRadius * Math.sin(angle);
            
            if (i === 0) {
                ctx.moveTo(hx, hy);
            } else {
                ctx.lineTo(hx, hy);
            }
        }
        ctx.closePath();
        
        // Fill hex
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw piece
        if (piece) {
            ctx.beginPath();
            ctx.arc(x, y, this.hexRadius * 0.7, 0, 2 * Math.PI);
            ctx.fillStyle = piece === 'black' ? '#333' : '#fff';
            ctx.fill();
            ctx.strokeStyle = piece === 'black' ? '#000' : '#999';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    
    drawSelectionHighlight(x, y) {
        const { ctx } = this;
        ctx.beginPath();
        ctx.arc(x, y, this.hexRadius * 0.9, 0, 2 * Math.PI);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    drawHoverHighlight(x, y) {
        const { ctx } = this;
        ctx.beginPath();
        ctx.arc(x, y, this.hexRadius * 0.8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    drawLegalMoveIndicators() {
        if (this.selectedPieces.length === 0) return;
        
        const { ctx } = this;
        
        // Check all possible destinations
        this.board.forEach((piece, key) => {
            const [q, r] = key.split(',').map(Number);
            const hex = { q, r };
            
            // Test if this is a valid move destination
            const move = {
                from: [...this.selectedPieces],
                to: hex,
                player: this.currentPlayer
            };
            
            if (this.isValidMove(move)) {
                const pixel = this.hexToPixel(hex);
                this.drawMoveIndicator(pixel.x, pixel.y);
            }
        });
    }
    
    drawMoveIndicator(x, y) {
        const { ctx } = this;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(96, 96, 96, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}