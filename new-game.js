class AbaloneGame {
    constructor() {
        this.board = this.createBoard();
        this.currentPlayer = 'black';
        this.selectedPieces = [];
        this.gameHistory = [];
        this.blackScore = 0; // pieces captured from black
        this.whiteScore = 0; // pieces captured from white
        this.gameEnded = false;
        this.winner = null;
        
        // Board rendering
        this.boardSize = 600;
        this.hexRadius = 25;
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');
        
        this.setupEventListeners();
        this.render();
    }
    
    createBoard() {
        // Create standard Abalone hexagonal board
        const board = new Map();
        
        // Generate hexagonal board coordinates
        for (let q = -4; q <= 4; q++) {
            const r1 = Math.max(-4, -q - 4);
            const r2 = Math.min(4, -q + 4);
            for (let r = r1; r <= r2; r++) {
                board.set(`${q},${r}`, null);
            }
        }
        
        // Place starting pieces - standard Abalone setup
        // Black pieces (one corner)
        const blackPositions = [
            [-4, 0], [-4, 1], [-4, 2], [-4, 3], [-4, 4],
            [-3, -1], [-3, 0], [-3, 1], [-3, 2], [-3, 3], [-3, 4],
            [-2, -2], [-2, -1], [-2, 0]
        ];
        
        // White pieces (opposite corner)
        const whitePositions = [
            [2, 0], [2, 1], [2, 2],
            [3, -4], [3, -3], [3, -2], [3, -1], [3, 0], [3, 1],
            [4, -4], [4, -3], [4, -2], [4, -1], [4, 0]
        ];
        
        blackPositions.forEach(([q, r]) => {
            board.set(`${q},${r}`, 'black');
        });
        
        whitePositions.forEach(([q, r]) => {
            board.set(`${q},${r}`, 'white');
        });
        
        return board;
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            if (this.gameEnded) return;
            
            // Check turn permission for multiplayer
            if (window.multiplayer && !window.multiplayer.canMakeMove()) {
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const hex = this.pixelToHex(x, y);
            if (hex) {
                this.handleClick(hex);
            }
        });
    }
    
    handleClick(hex) {
        const key = `${hex.q},${hex.r}`;
        const piece = this.board.get(key);
        
        // If clicking on own piece
        if (piece === this.currentPlayer) {
            this.handlePieceClick(hex);
        }
        // If clicking on empty space or opponent piece
        else {
            this.handleMoveClick(hex);
        }
    }
    
    handlePieceClick(hex) {
        const key = `${hex.q},${hex.r}`;
        
        // If piece already selected, remove it from selection
        const existingIndex = this.selectedPieces.findIndex(p => p.q === hex.q && p.r === hex.r);
        if (existingIndex !== -1) {
            this.selectedPieces.splice(existingIndex, 1);
            this.render();
            return;
        }
        
        // If no pieces selected, start new selection
        if (this.selectedPieces.length === 0) {
            this.selectedPieces = [hex];
            this.render();
            return;
        }
        
        // If pieces already selected, try to add this piece
        if (this.selectedPieces.length < 3) {
            if (this.canAddPieceToSelection(hex)) {
                this.selectedPieces.push(hex);
                this.render();
            } else {
                // Start new selection
                this.selectedPieces = [hex];
                this.render();
            }
        } else {
            // Start new selection (max 3 pieces)
            this.selectedPieces = [hex];
            this.render();
        }
    }
    
    canAddPieceToSelection(hex) {
        if (this.selectedPieces.length === 0) return true;
        
        // Check if new piece is adjacent to any selected piece
        const isAdjacent = this.selectedPieces.some(selected => 
            this.isAdjacent(selected, hex)
        );
        
        if (!isAdjacent) return false;
        
        // Check if all pieces would form a straight line
        const allPieces = [...this.selectedPieces, hex];
        return this.areInStraightLine(allPieces);
    }
    
    areInStraightLine(pieces) {
        if (pieces.length <= 2) return true;
        
        // Check if all pieces are consecutive in one direction
        const directions = [
            {q: 1, r: 0}, {q: 0, r: 1}, {q: -1, r: 1},
            {q: -1, r: 0}, {q: 0, r: -1}, {q: 1, r: -1}
        ];
        
        for (const dir of directions) {
            if (this.areConsecutiveInDirection(pieces, dir)) {
                return true;
            }
        }
        
        return false;
    }
    
    areConsecutiveInDirection(pieces, direction) {
        // Sort pieces by their position in the direction
        const sorted = [...pieces].sort((a, b) => {
            const projA = a.q * direction.q + a.r * direction.r;
            const projB = b.q * direction.q + b.r * direction.r;
            return projA - projB;
        });
        
        // Check if they are consecutive
        for (let i = 1; i < sorted.length; i++) {
            const expected = {
                q: sorted[i-1].q + direction.q,
                r: sorted[i-1].r + direction.r
            };
            if (sorted[i].q !== expected.q || sorted[i].r !== expected.r) {
                return false;
            }
        }
        
        return true;
    }
    
    handleMoveClick(hex) {
        if (this.selectedPieces.length === 0) return;
        
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
            
            // Notify multiplayer
            if (this.onMoveComplete) {
                this.onMoveComplete(move);
            }
        } else {
            // Check if this is a sidestep move to any of the pieces
            if (this.selectedPieces.length > 1) {
                const sidestepMove = this.findSidestepMove(hex);
                console.log('Attempting sidestep move:', sidestepMove);
                if (sidestepMove) {
                    console.log('Sidestep move found, validating...');
                    if (this.isValidMove(sidestepMove)) {
                        console.log('Sidestep move is valid, executing...');
                        this.makeMove(sidestepMove);
                        this.selectedPieces = [];
                        this.switchPlayer();
                        this.render();
                        
                        // Notify multiplayer
                        if (this.onMoveComplete) {
                            this.onMoveComplete(sidestepMove);
                        }
                        return;
                    } else {
                        console.log('Sidestep move validation failed');
                    }
                }
            }
            
            // Invalid move - clear selection
            this.selectedPieces = [];
            this.render();
        }
    }
    
    findSidestepMove(clickedHex) {
        if (this.selectedPieces.length < 2) return null;
        
        console.log('Finding sidestep move for clicked hex:', clickedHex);
        
        // Get all possible sidestep directions (4 perpendicular directions)
        const sidestepDirections = this.getSidestepDirections();
        
        for (const direction of sidestepDirections) {
            // Check if all pieces can move in this direction
            let canMove = true;
            const destinations = [];
            
            for (const piece of this.selectedPieces) {
                const newPos = {
                    q: piece.q + direction.q,
                    r: piece.r + direction.r
                };
                const key = `${newPos.q},${newPos.r}`;
                
                if (!this.board.has(key) || this.board.get(key) !== null) {
                    canMove = false;
                    break;
                }
                destinations.push(newPos);
            }
            
            console.log('Direction:', direction, 'Can move:', canMove, 'Destinations:', destinations);
            
            // If this is a valid sidestep direction and the clicked hex is one of the destinations
            if (canMove && destinations.some(dest => dest.q === clickedHex.q && dest.r === clickedHex.r)) {
                console.log('Found matching destination!');
                // Return a sidestep move - use the direction itself to encode the move
                const move = {
                    from: [...this.selectedPieces],
                    to: clickedHex, // The actual clicked destination
                    player: this.currentPlayer,
                    isSidestep: true,
                    sidestepDirection: direction
                };
                console.log('Returning sidestep move:', move);
                return move;
            }
        }
        
        console.log('No matching sidestep move found');
        return null;
    }
    
    isValidMove(move) {
        const { from, to } = move;
        
        console.log('Validating move:', move);
        
        // Check pieces belong to current player
        for (const piece of from) {
            const key = `${piece.q},${piece.r}`;
            if (this.board.get(key) !== this.currentPlayer) {
                console.log('Validation failed: piece does not belong to current player', piece, this.currentPlayer);
                return false;
            }
        }
        
        // Check destination is on board
        const toKey = `${to.q},${to.r}`;
        if (!this.board.has(toKey)) {
            console.log('Validation failed: destination not on board', to);
            return false;
        }
        
        // Check if pieces are in a straight line
        if (!this.areInStraightLine(from)) {
            console.log('Validation failed: pieces not in straight line', from);
            return false;
        }
        
        // Single piece move
        if (from.length === 1) {
            console.log('Validating single piece move');
            return this.isValidSingleMove(from[0], to);
        }
        
        // Multi-piece move
        console.log('Validating group move');
        const result = this.isValidGroupMove(from, to, move);
        console.log('Group move validation result:', result);
        return result;
    }
    
    isValidSingleMove(from, to) {
        // Must be adjacent
        if (!this.isAdjacent(from, to)) return false;
        
        const toKey = `${to.q},${to.r}`;
        const toPiece = this.board.get(toKey);
        
        // Can only move to empty space (single piece cannot push)
        return toPiece === null;
    }
    
    isValidGroupMove(pieces, to, move) {
        console.log('Validating group move with pieces:', pieces, 'to:', to);
        
        // Get the line direction
        const direction = this.getLineDirection(pieces);
        if (!direction) {
            console.log('Group move failed: no line direction');
            return false;
        }
        
        console.log('Line direction:', direction);
        
        // Sort pieces from back to front
        const sorted = this.sortPiecesInDirection(pieces, direction);
        const frontPiece = sorted[sorted.length - 1];
        const backPiece = sorted[0];
        
        console.log('Sorted pieces:', sorted, 'front:', frontPiece, 'back:', backPiece);
        
        // Check if move is inline (forward/backward)
        const frontStep = {
            q: frontPiece.q + direction.q,
            r: frontPiece.r + direction.r
        };
        const backStep = {
            q: backPiece.q - direction.q,
            r: backPiece.r - direction.r
        };
        
        console.log('Front step:', frontStep, 'Back step:', backStep, 'Target:', to);
        
        if (to.q === frontStep.q && to.r === frontStep.r) {
            console.log('This is a forward inline move');
            // Forward move - can push
            return this.isValidInlineMove(sorted, direction, true);
        } else if (to.q === backStep.q && to.r === backStep.r) {
            console.log('This is a backward inline move');
            // Backward move - to empty space only
            const toKey = `${to.q},${to.r}`;
            return this.board.get(toKey) === null;
        } else {
            console.log('This should be a sidestep move, validating...');
            // Check if it's a marked sidestep move
            if (move.isSidestep) {
                console.log('Validating marked sidestep move');
                const result = this.isValidSidestepMove(move);
                console.log('Sidestep validation result:', result);
                return result;
            } else {
                console.log('Not a valid inline move and not marked as sidestep');
                return false;
            }
        }
    }
    
    isValidInlineMove(sortedPieces, direction, canPush) {
        const frontPiece = sortedPieces[sortedPieces.length - 1];
        const destination = {
            q: frontPiece.q + direction.q,
            r: frontPiece.r + direction.r
        };
        const destKey = `${destination.q},${destination.r}`;
        
        if (!this.board.has(destKey)) return false;
        
        const destPiece = this.board.get(destKey);
        
        // Moving to empty space
        if (destPiece === null) return true;
        
        // Moving into opponent piece - check if can push
        if (destPiece !== this.currentPlayer && canPush) {
            return this.canPushOpponents(sortedPieces, direction);
        }
        
        return false;
    }
    
    canPushOpponents(pushingPieces, direction) {
        const frontPiece = pushingPieces[pushingPieces.length - 1];
        let checkPos = {
            q: frontPiece.q + direction.q,
            r: frontPiece.r + direction.r
        };
        
        let opponentCount = 0;
        
        // Count consecutive opponent pieces
        while (this.board.has(`${checkPos.q},${checkPos.r}`)) {
            const piece = this.board.get(`${checkPos.q},${checkPos.r}`);
            if (piece === null) break;
            if (piece === this.currentPlayer) return false; // Can't push own pieces
            
            opponentCount++;
            checkPos = {
                q: checkPos.q + direction.q,
                r: checkPos.r + direction.r
            };
        }
        
        // Check push ratios: 2v1, 3v1, 3v2
        if (pushingPieces.length === 2 && opponentCount === 1) return true;
        if (pushingPieces.length === 3 && opponentCount <= 2) return true;
        
        return false;
    }
    
    isValidSidestepMove(move) {
        const { from: pieces, isSidestep, sidestepDirection } = move;
        
        console.log('Validating sidestep move with pieces:', pieces, 'direction:', sidestepDirection);
        
        // If this is marked as a sidestep move, validate it as such
        if (!isSidestep || !sidestepDirection) {
            console.log('Not a marked sidestep move');
            return false;
        }
        
        // Check all destinations are empty
        for (const piece of pieces) {
            const newPos = {
                q: piece.q + sidestepDirection.q,
                r: piece.r + sidestepDirection.r
            };
            const key = `${newPos.q},${newPos.r}`;
            
            console.log('Checking destination for piece', piece, 'new position:', newPos, 'empty?', this.board.get(key) === null);
            
            if (!this.board.has(key) || this.board.get(key) !== null) {
                console.log('Sidestep failed: destination occupied or off board');
                return false;
            }
        }
        
        console.log('Sidestep validation passed!');
        return true;
    }
    
    getLineDirection(pieces) {
        if (pieces.length < 2) return null;
        return this.getDirection(pieces[0], pieces[1]);
    }
    
    getDirection(from, to) {
        const dq = to.q - from.q;
        const dr = to.r - from.r;
        
        // Normalize to unit direction
        const length = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
        if (length === 0) return null;
        
        return {
            q: dq / length,
            r: dr / length
        };
    }
    
    isPerpendicular(dir1, dir2) {
        // In hex grid, check if directions are perpendicular
        // Two directions are perpendicular if their dot product in hexagonal coordinates is 0
        // For hexagonal coordinates, we need to convert to cube coordinates for proper dot product
        // Convert axial (q,r) to cube (x,y,z) where x=q, z=r, y=-q-r
        const x1 = dir1.q, y1 = -dir1.q - dir1.r, z1 = dir1.r;
        const x2 = dir2.q, y2 = -dir2.q - dir2.r, z2 = dir2.r;
        
        const dot = x1 * x2 + y1 * y2 + z1 * z2;
        return Math.abs(dot) < 0.001;
    }
    
    sortPiecesInDirection(pieces, direction) {
        return [...pieces].sort((a, b) => {
            const projA = a.q * direction.q + a.r * direction.r;
            const projB = b.q * direction.q + b.r * direction.r;
            return projA - projB;
        });
    }
    
    isAdjacent(hex1, hex2) {
        const dq = Math.abs(hex1.q - hex2.q);
        const dr = Math.abs(hex1.r - hex2.r);
        const ds = Math.abs(hex1.q + hex1.r - hex2.q - hex2.r);
        return (dq <= 1 && dr <= 1 && ds <= 1) && (dq + dr + ds === 2);
    }
    
    makeMove(move) {
        const { from, to } = move;
        
        // Record for history
        const moveRecord = {
            from: [...from],
            to: { ...to },
            player: this.currentPlayer,
            captured: []
        };
        
        if (from.length === 1) {
            // Single piece move
            const fromKey = `${from[0].q},${from[0].r}`;
            const toKey = `${to.q},${to.r}`;
            
            this.board.set(toKey, this.board.get(fromKey));
            this.board.set(fromKey, null);
        } else {
            // Group move
            this.executeGroupMove(from, to, moveRecord, move);
        }
        
        this.gameHistory.push(moveRecord);
        this.updateScore(moveRecord);
        this.checkWinCondition();
    }
    
    executeGroupMove(pieces, to, moveRecord, move) {
        const direction = this.getLineDirection(pieces);
        const sorted = this.sortPiecesInDirection(pieces, direction);
        
        // Check if it's inline or sidestep
        const frontPiece = sorted[sorted.length - 1];
        const frontStep = {
            q: frontPiece.q + direction.q,
            r: frontPiece.r + direction.r
        };
        
        if (to.q === frontStep.q && to.r === frontStep.r) {
            // Inline move (forward)
            this.executeInlineMove(sorted, direction, moveRecord);
        } else {
            // Sidestep move - if it's a marked sidestep, use that direction
            const sidestepDirection = move.sidestepDirection || this.getDirection(pieces[0], to);
            this.executeSidestepMove(pieces, sidestepDirection);
        }
    }
    
    executeInlineMove(sortedPieces, direction, moveRecord) {
        // First, push any opponent pieces
        const frontPiece = sortedPieces[sortedPieces.length - 1];
        let checkPos = {
            q: frontPiece.q + direction.q,
            r: frontPiece.r + direction.r
        };
        
        const opponentPieces = [];
        while (this.board.has(`${checkPos.q},${checkPos.r}`) && 
               this.board.get(`${checkPos.q},${checkPos.r}`) !== null &&
               this.board.get(`${checkPos.q},${checkPos.r}`) !== this.currentPlayer) {
            opponentPieces.push({ ...checkPos });
            checkPos = {
                q: checkPos.q + direction.q,
                r: checkPos.r + direction.r
            };
        }
        
        // Move opponent pieces
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
        for (let i = sortedPieces.length - 1; i >= 0; i--) {
            const piece = sortedPieces[i];
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
    
    executeSidestepMove(pieces, direction) {
        console.log('Executing sidestep move with pieces:', pieces, 'direction:', direction);
        
        // Clear original positions
        for (const piece of pieces) {
            const key = `${piece.q},${piece.r}`;
            this.board.set(key, null);
        }
        
        // Set new positions
        for (const piece of pieces) {
            const newPos = {
                q: piece.q + direction.q,
                r: piece.r + direction.r
            };
            const key = `${newPos.q},${newPos.r}`;
            this.board.set(key, this.currentPlayer);
            console.log('Moved piece from', piece, 'to', newPos);
        }
    }
    
    updateScore(moveRecord) {
        for (const captured of moveRecord.captured) {
            if (captured.piece === 'black') {
                this.whiteScore++;
            } else {
                this.blackScore++;
            }
        }
    }
    
    checkWinCondition() {
        // blackScore = white pieces captured by black = black wins
        // whiteScore = black pieces captured by white = white wins
        if (this.blackScore >= 6) {
            this.gameEnded = true;
            this.winner = 'black';
        } else if (this.whiteScore >= 6) {
            this.gameEnded = true;
            this.winner = 'white';
        }
    }
    
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
    }
    
    reset() {
        this.board = this.createBoard();
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
        
        // Draw board and pieces
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
        
        // Draw legal move indicators
        if (this.selectedPieces.length > 0) {
            this.drawLegalMoveIndicators();
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
    
    drawLegalMoveIndicators() {
        if (this.selectedPieces.length === 1) {
            // Single piece moves
            this.drawSinglePieceMoves();
        } else if (this.selectedPieces.length > 1) {
            // Group moves
            this.drawGroupMoves();
        }
    }
    
    drawSinglePieceMoves() {
        const piece = this.selectedPieces[0];
        const directions = [
            {q: 1, r: 0}, {q: 0, r: 1}, {q: -1, r: 1},
            {q: -1, r: 0}, {q: 0, r: -1}, {q: 1, r: -1}
        ];
        
        for (const dir of directions) {
            const destination = {
                q: piece.q + dir.q,
                r: piece.r + dir.r
            };
            
            const move = {
                from: [piece],
                to: destination,
                player: this.currentPlayer
            };
            
            if (this.isValidMove(move)) {
                const pixel = this.hexToPixel(destination);
                this.drawMoveIndicator(pixel.x, pixel.y);
            }
        }
    }
    
    drawGroupMoves() {
        // Get line direction
        const lineDirection = this.getLineDirection(this.selectedPieces);
        if (!lineDirection) return;
        
        // Sort pieces to find front and back
        const sorted = this.sortPiecesInDirection(this.selectedPieces, lineDirection);
        const frontPiece = sorted[sorted.length - 1];
        const backPiece = sorted[0];
        
        // 1. Forward move (inline)
        const forwardDest = {
            q: frontPiece.q + lineDirection.q,
            r: frontPiece.r + lineDirection.r
        };
        const forwardMove = {
            from: [...this.selectedPieces],
            to: forwardDest,
            player: this.currentPlayer
        };
        if (this.isValidMove(forwardMove)) {
            const pixel = this.hexToPixel(forwardDest);
            this.drawMoveIndicator(pixel.x, pixel.y);
        }
        
        // 2. Backward move (inline)
        const backwardDest = {
            q: backPiece.q - lineDirection.q,
            r: backPiece.r - lineDirection.r
        };
        const backwardMove = {
            from: [...this.selectedPieces],
            to: backwardDest,
            player: this.currentPlayer
        };
        if (this.isValidMove(backwardMove)) {
            const pixel = this.hexToPixel(backwardDest);
            this.drawMoveIndicator(pixel.x, pixel.y);
        }
        
        // 3. Sidestep moves (perpendicular)
        this.drawSidestepMoves();
    }
    
    drawSidestepMoves() {
        if (this.selectedPieces.length < 2) return;
        
        // Get all possible sidestep directions
        const sidestepDirections = this.getSidestepDirections();
        
        for (let i = 0; i < sidestepDirections.length; i++) {
            const direction = sidestepDirections[i];
            // Check if all pieces can move in this direction
            let canMove = true;
            const destinations = [];
            
            for (const piece of this.selectedPieces) {
                const newPos = {
                    q: piece.q + direction.q,
                    r: piece.r + direction.r
                };
                const key = `${newPos.q},${newPos.r}`;
                
                if (!this.board.has(key) || this.board.get(key) !== null) {
                    canMove = false;
                    break;
                }
                destinations.push(newPos);
            }
            
            if (canMove) {
                // Only draw indicators for this direction if it's different from inline moves
                if (!this.isInlineDirection(direction)) {
                    this.drawGroupMoveIndicator(destinations, i);
                }
            }
        }
    }
    
    getSidestepDirections() {
        // Return all 6 hex directions - we'll filter valid ones during validation
        // This is simpler than trying to calculate perpendicular directions
        return [
            {q: 1, r: 0},   // right
            {q: 0, r: 1},   // down-right  
            {q: -1, r: 1},  // down-left
            {q: -1, r: 0},  // left
            {q: 0, r: -1},  // up-left
            {q: 1, r: -1}   // up-right
        ];
    }
    
    isInlineDirection(direction) {
        // Check if this direction is the same as the line direction (forward/backward)
        if (this.selectedPieces.length < 2) return false;
        
        const lineDirection = this.getLineDirection(this.selectedPieces);
        if (!lineDirection) return false;
        
        // Check if direction matches line direction (forward or backward)
        return (direction.q === lineDirection.q && direction.r === lineDirection.r) ||
               (direction.q === -lineDirection.q && direction.r === -lineDirection.r);
    }
    
    drawGroupMoveIndicator(destinations, direction) {
        const { ctx } = this;
        
        // Draw individual indicators for each destination
        for (let i = 0; i < destinations.length; i++) {
            const dest = destinations[i];
            const pixel = this.hexToPixel(dest);
            
            // Use different colors or styles to distinguish between the two directions
            // You can click on any destination in a direction to move the whole group
            this.drawSidestepIndicator(pixel.x, pixel.y, direction);
        }
    }
    
    drawSidestepIndicator(x, y, directionIndex) {
        const { ctx } = this;
        
        // Use different shapes/colors for different directions
        if (directionIndex === 0) {
            // First direction: Orange circles
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255, 152, 0, 0.8)'; // Orange
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 111, 0, 1)';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Second direction: Blue squares
            ctx.save();
            ctx.fillStyle = 'rgba(33, 150, 243, 0.8)'; // Blue
            ctx.fillRect(x - 8, y - 8, 16, 16);
            ctx.strokeStyle = 'rgba(25, 118, 210, 1)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 8, y - 8, 16, 16);
            ctx.restore();
        }
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