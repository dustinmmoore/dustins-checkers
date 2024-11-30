/*!
 * Author: Dustin Moore
 * Website: https://www.dustinmoore.dev
 * Email: dustinmmoore@icloud.com
 * LinkedIn: https://www.linkedin.com/in/dustinmmoore
 * GitHub: https://github.com/dustinmmoore
 * Project: Dustin's Checkers Game
 */

'use strict';
document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const scoreRed = document.getElementById('score-red');
    const scoreBlack = document.getElementById('score-black');
    const currentTurnDisplay = document.getElementById('current-turn');

    const TILE_COLORS = ["white", "black"];
    const PIECE_ROWS = {
        black: [0, 1, 2],
        red: [5, 6, 7]
    };
    let currentPlayer = 'red';
    let scores = { red: 0, black: 0 };
    let draggedPiece = null;
    let draggedPieceStartTile = null;
    let draggedPieceOffsetX = 0;
    let draggedPieceOffsetY = 0;

    function createTile(row, col) {
        const tile = document.createElement('div');
        tile.classList.add('tile', TILE_COLORS[(row + col) % 2]);
        tile.dataset.row = row;
        tile.dataset.col = col;

        if (tile.classList.contains('black')) {
            if (PIECE_ROWS.black.includes(row)) {
                addPiece(tile, 'black');
            } else if (PIECE_ROWS.red.includes(row)) {
                addPiece(tile, 'red');
            }
        }

        board.appendChild(tile);
    }

    function addPiece(tile, color) {
        const piece = document.createElement('div');
        piece.classList.add('piece', color);
        piece.style.backgroundColor = color;
        piece.draggable = true;
        piece.dataset.king = 'false';
        piece.addEventListener('dragstart', dragStart);
        piece.addEventListener('dragend', dragEnd);
        piece.addEventListener('touchstart', touchStart, { passive: false });
        piece.addEventListener('touchmove', touchMove, { passive: false });
        piece.addEventListener('touchend', touchEnd);
        tile.appendChild(piece);
    }

    function dragStart(e) {
        if (!e.target.classList.contains(currentPlayer)) {
            e.preventDefault();
            return;
        }
        draggedPiece = e.target;
        draggedPieceStartTile = e.target.parentElement;
        e.dataTransfer.setData('text/plain', `${draggedPieceStartTile.dataset.row},${draggedPieceStartTile.dataset.col}`);
        setTimeout(() => e.target.classList.add('dragging'), 0);
        highlightValidMoves(draggedPieceStartTile);
    }

    function dragEnd(e) {
        if (draggedPiece) {
            draggedPiece.classList.remove('dragging');
            draggedPiece = null;
            draggedPieceStartTile = null;
        }
        clearHighlights();
    }

    function touchStart(e) {
        if (!e.target.classList.contains('piece') || !e.target.classList.contains(currentPlayer)) {
            return;
        }
        e.preventDefault();
        
        draggedPiece = e.target;
        draggedPieceStartTile = e.target.parentElement;
        const touch = e.touches[0];
        const rect = draggedPiece.getBoundingClientRect();
        
        draggedPieceOffsetX = touch.clientX - rect.left;
        draggedPieceOffsetY = touch.clientY - rect.top;
        
        draggedPiece.style.position = 'fixed';
        draggedPiece.style.zIndex = '1000';
        draggedPiece.classList.add('dragging');
        
        highlightValidMoves(draggedPieceStartTile);
        movePieceToPosition(touch.clientX, touch.clientY);
    }

    function highlightValidMoves(startTile) {
        const [row, col] = [parseInt(startTile.dataset.row), parseInt(startTile.dataset.col)];
        const piece = startTile.querySelector('.piece');
        const isKing = piece.dataset.king === 'true';
        
        // Clear previous highlights
        clearHighlights();
        
        // Show both regular moves and jumps
        highlightRegularMoves(row, col, piece);
        highlightJumps(row, col, piece);
    }

    function highlightJumps(row, col, piece) {
        const isKing = piece.dataset.king === 'true';
        const directions = getValidDirections(isKing);
        
        directions.forEach(([rowDiff, colDiff]) => {
            const jumpRow = row + (rowDiff * 2);
            const jumpCol = col + (colDiff * 2);
            
            if (isValidPosition(jumpRow, jumpCol)) {
                const middleRow = row + rowDiff;
                const middleCol = col + colDiff;
                const jumpTile = document.querySelector(`[data-row='${jumpRow}'][data-col='${jumpCol}']`);
                const middleTile = document.querySelector(`[data-row='${middleRow}'][data-col='${middleCol}']`);
                
                if (isValidJumpTarget(jumpTile, middleTile)) {
                    jumpTile.classList.add('valid-move');
                }
            }
        });
    }

    function highlightRegularMoves(row, col, piece) {
        const isKing = piece.dataset.king === 'true';
        const directions = getValidDirections(isKing);
        
        directions.forEach(([rowDiff, colDiff]) => {
            const targetRow = row + rowDiff;
            const targetCol = col + colDiff;
            
            if (isValidPosition(targetRow, targetCol)) {
                const targetTile = document.querySelector(`[data-row='${targetRow}'][data-col='${targetCol}']`);
                if (targetTile && targetTile.childElementCount === 0) {
                    targetTile.classList.add('valid-move');
                }
            }
        });
    }

    function getValidDirections(isKing) {
        const directions = [];
        if (currentPlayer === 'red' || isKing) {
            directions.push([-1, -1], [-1, 1]); // Upward diagonals
        }
        if (currentPlayer === 'black' || isKing) {
            directions.push([1, -1], [1, 1]); // Downward diagonals
        }
        return directions;
    }

    function isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    function isValidJumpTarget(jumpTile, middleTile) {
        return jumpTile && 
               middleTile && 
               jumpTile.childElementCount === 0 && 
               middleTile.childElementCount > 0 && 
               middleTile.querySelector('.piece').classList.contains(currentPlayer === 'red' ? 'black' : 'red');
    }

    function hasValidJumps(row, col, piece) {
        const isKing = piece.dataset.king === 'true';
        const directions = getValidDirections(isKing);
        
        return directions.some(([rowDiff, colDiff]) => {
            const jumpRow = row + (rowDiff * 2);
            const jumpCol = col + (colDiff * 2);
            
            if (!isValidPosition(jumpRow, jumpCol)) return false;
            
            const middleRow = row + rowDiff;
            const middleCol = col + colDiff;
            const jumpTile = document.querySelector(`[data-row='${jumpRow}'][data-col='${jumpCol}']`);
            const middleTile = document.querySelector(`[data-row='${middleRow}'][data-col='${middleCol}']`);
            
            return isValidJumpTarget(jumpTile, middleTile);
        });
    }

    function touchMove(e) {
        if (!draggedPiece) return;
        e.preventDefault();
        const touch = e.touches[0];
        draggedPiece.style.left = `${touch.clientX - draggedPieceOffsetX}px`;
        draggedPiece.style.top = `${touch.clientY - draggedPieceOffsetY}px`;
    }

    function touchEnd(e) {
        if (!draggedPiece) return;
        e.preventDefault();
        
        // Clear highlights
        document.querySelectorAll('.valid-move').forEach(tile => {
            tile.classList.remove('valid-move');
        });
        
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (target && target.classList.contains('tile') && target.classList.contains('valid-move')) {
            movePieceToTarget(draggedPiece, target);
        } else {
            resetPiecePosition(draggedPiece);
        }
        
        cleanupDraggedPiece();
    }

    function cleanupDraggedPiece() {
        if (!draggedPiece) return;
        draggedPiece.style.position = 'relative';
        draggedPiece.style.zIndex = '';
        draggedPiece.style.left = '';
        draggedPiece.style.top = '';
        draggedPiece.classList.remove('dragging');
        draggedPiece = null;
        draggedPieceStartTile = null;
    }

    function movePieceToTarget(piece, target) {
        if (!piece || !target || !target.classList.contains('tile')) return;

        const startTile = piece.parentElement;
        const [startRow, startCol] = [parseInt(startTile.dataset.row), parseInt(startTile.dataset.col)];
        const [targetRow, targetCol] = [parseInt(target.dataset.row), parseInt(target.dataset.col)];

        if (!isValidMove(piece, startRow, startCol, targetRow, targetCol)) {
            resetPiecePosition(piece);
            return;
        }

        const isJumpMove = Math.abs(targetRow - startRow) === 2;
        
        if (isJumpMove) {
            handleJumpMove(piece, startRow, startCol, targetRow, targetCol, target);
        } else {
            target.appendChild(piece);
        }

        checkKingPromotion(piece, targetRow);
        switchTurns();
    }

    function isValidMove(piece, startRow, startCol, targetRow, targetCol) {
        const rowDiff = targetRow - startRow;
        const colDiff = targetCol - startCol;
        const isKing = piece.dataset.king === 'true';

        // Basic validations
        if (!isValidPosition(targetRow, targetCol)) return false;
        if (Math.abs(colDiff) !== Math.abs(rowDiff)) return false;

        // Direction validation
        const isValidDirection = isKing || 
            (currentPlayer === 'red' && rowDiff < 0) || 
            (currentPlayer === 'black' && rowDiff > 0);

        if (!isValidDirection) return false;

        // Validate move distance (1 for regular move, 2 for jump)
        const moveDistance = Math.abs(rowDiff);
        if (moveDistance !== 1 && moveDistance !== 2) return false;

        // For jump moves, verify there's an opponent's piece to jump over
        if (moveDistance === 2) {
            const jumpedRow = startRow + rowDiff/2;
            const jumpedCol = startCol + colDiff/2;
            const jumpedTile = document.querySelector(`[data-row='${jumpedRow}'][data-col='${jumpedCol}']`);
            const jumpedPiece = jumpedTile?.querySelector('.piece');
            
            return jumpedPiece && 
                   jumpedPiece.classList.contains(currentPlayer === 'red' ? 'black' : 'red');
        }

        return true;
    }

    function handleJumpMove(piece, startRow, startCol, targetRow, targetCol, target) {
        const jumpedRow = startRow + (targetRow - startRow)/2;
        const jumpedCol = startCol + (targetCol - startCol)/2;
        const jumpedTile = document.querySelector(`[data-row='${jumpedRow}'][data-col='${jumpedCol}']`);
        const jumpedPiece = jumpedTile?.querySelector('.piece');

        if (!jumpedPiece || jumpedPiece.classList.contains(currentPlayer)) {
            resetPiecePosition(piece);
            return;
        }

        jumpedTile.removeChild(jumpedPiece);
        scores[currentPlayer]++;
        updateScore();
        target.appendChild(piece);
    }

    function checkKingPromotion(piece, targetRow) {
        if ((currentPlayer === 'red' && targetRow === 0) || 
            (currentPlayer === 'black' && targetRow === 7)) {
            piece.dataset.king = 'true';
            piece.classList.add('king');
        }
    }

    function switchTurns() {
        currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
        currentTurnDisplay.textContent = `Current Turn: ${currentPlayer === 'red' ? 'Player 1 (Red)' : 'Player 2 (Black)'}`;
        document.querySelectorAll('.valid-move').forEach(tile => tile.classList.remove('valid-move'));
    }

    function movePieceToPosition(x, y) {
        if (!draggedPiece) return;
        draggedPiece.style.left = `${x - draggedPieceOffsetX}px`;
        draggedPiece.style.top = `${y - draggedPieceOffsetY}px`;
    }

    function resetPiecePosition(piece) {
        piece.style.position = 'relative';
        piece.style.left = '0';
        piece.style.top = '0';
        if (draggedPieceStartTile) {
            draggedPieceStartTile.appendChild(piece);
        }
    }

    function getJumpedTile(startRow, startCol, targetRow, targetCol) {
        const jumpedRow = (startRow + targetRow) / 2;
        const jumpedCol = (startCol + targetCol) / 2;
        return document.querySelector(`[data-row='${jumpedRow}'][data-col='${jumpedCol}']`);
    }

    function initializeBoard() {
        board.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                createTile(row, col);
            }
        }
    }

    function updateScore() {
        scoreRed.textContent = scores.red;
        scoreBlack.textContent = scores.black;
    }

    function canJumpAgain(row, col, piece) {
        const isKing = piece.dataset.king === 'true';
        const directions = [];
        
        // Calculate possible jump directions
        if (currentPlayer === 'red' || isKing) {
            directions.push([-2, -2], [-2, 2]);  // Upward jumps
        }
        if (currentPlayer === 'black' || isKing) {
            directions.push([2, -2], [2, 2]);    // Downward jumps
        }

        for (const [rowDiff, colDiff] of directions) {
            const targetRow = row + rowDiff;
            const targetCol = col + colDiff;
            
            // Validate board boundaries
            if (targetRow < 0 || targetRow > 7 || targetCol < 0 || targetCol > 7) continue;
            
            const jumpedRow = row + rowDiff/2;
            const jumpedCol = col + colDiff/2;
            const jumpedTile = document.querySelector(`[data-row='${jumpedRow}'][data-col='${jumpedCol}']`);
            const targetTile = document.querySelector(`[data-row='${targetRow}'][data-col='${targetCol}']`);
            
            if (jumpedTile && targetTile && 
                jumpedTile.childElementCount > 0 && 
                targetTile.childElementCount === 0) {
                const jumpedPiece = jumpedTile.querySelector('.piece');
                if (jumpedPiece.classList.contains(currentPlayer === 'red' ? 'black' : 'red')) {
                    return true;
                }
            }
        }
        return false;
    }

    function handleDragOver(e) {
        e.preventDefault();
        const tile = e.target.closest('.tile');
        if (tile && tile.classList.contains('valid-move')) {
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const target = e.target.closest('.tile');
        if (!target || !draggedPiece) return;

        if (target.classList.contains('valid-move')) {
            movePieceToTarget(draggedPiece, target);
        } else {
            resetPiecePosition(draggedPiece);
        }
        clearHighlights();
    }

    function clearHighlights() {
        document.querySelectorAll('.valid-move').forEach(tile => {
            tile.classList.remove('valid-move');
        });
    }

    board.addEventListener('dragover', handleDragOver);
    board.addEventListener('drop', handleDrop);

    initializeBoard();
});