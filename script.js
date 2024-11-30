/*! Checkers Game by Dustin Moore - See https://www.dustinmoore.dev */
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
        e.dataTransfer.setData('text/plain', `${e.target.parentElement.dataset.row},${e.target.parentElement.dataset.col}`);
        setTimeout(() => e.target.style.display = 'none', 0);
    }

    function dragEnd(e) {
        e.target.style.display = 'block';
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
        document.querySelectorAll('.valid-move').forEach(tile => {
            tile.classList.remove('valid-move');
        });
        
        // Calculate valid moves
        const directions = [];
        if (currentPlayer === 'red' || isKing) {
            directions.push([-1, -1], [-1, 1]); // Forward for red
        }
        if (currentPlayer === 'black' || isKing) {
            directions.push([1, -1], [1, 1]); // Forward for black
        }
        
        // Check for regular moves and jumps
        if (!mandatoryJumpExists()) {
            directions.forEach(([rowDiff, colDiff]) => {
                const targetRow = row + rowDiff;
                const targetCol = col + colDiff;
                const targetTile = document.querySelector(`[data-row='${targetRow}'][data-col='${targetCol}']`);
                if (targetTile && targetTile.childElementCount === 0) {
                    targetTile.classList.add('valid-move');
                }
            });
        }
        
        // Check for jumps
        directions.forEach(([rowDiff, colDiff]) => {
            const jumpRow = row + rowDiff * 2;
            const jumpCol = colDiff * 2;
            const jumpTile = document.querySelector(`[data-row='${jumpRow}'][data-col='${jumpCol}']`);
            const middleTile = document.querySelector(`[data-row='${row + rowDiff}'][data-col='${col + colDiff}']`);
            
            if (jumpTile && middleTile && 
                middleTile.childElementCount > 0 && 
                jumpTile.childElementCount === 0 &&
                middleTile.querySelector('.piece').classList.contains(currentPlayer === 'red' ? 'black' : 'red')) {
                jumpTile.classList.add('valid-move');
            }
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

        const [startRow, startCol] = [piece.parentElement.dataset.row, piece.parentElement.dataset.col].map(Number);
        const [targetRow, targetCol] = [target.dataset.row, target.dataset.col].map(Number);

        // Validate target is empty
        if (target.childElementCount > 0) {
            resetPiecePosition(piece);
            return;
        }

        const rowDifference = targetRow - startRow;
        const colDifference = targetCol - startCol;
        const isKing = piece.dataset.king === 'true';

        // Validate move direction
        const isValidDirection = isKing || 
            (currentPlayer === 'red' && rowDifference < 0) ||
            (currentPlayer === 'black' && rowDifference > 0);

        if (!isValidDirection) {
            resetPiecePosition(piece);
            return;
        }

        const isJumpMove = Math.abs(rowDifference) === 2 && Math.abs(colDifference) === 2;
        const isRegularMove = Math.abs(rowDifference) === 1 && Math.abs(colDifference) === 1;

        if (mandatoryJumpExists() && !isJumpMove) {
            resetPiecePosition(piece);
            return;
        }

        if (isJumpMove) {
            const jumpedTile = getJumpedTile(startRow, startCol, targetRow, targetCol);
            const jumpedPiece = jumpedTile?.querySelector('.piece');
            
            if (!jumpedPiece || jumpedPiece.classList.contains(currentPlayer)) {
                resetPiecePosition(piece);
                return;
            }

            jumpedTile.removeChild(jumpedPiece);
            scores[currentPlayer]++;
            updateScore();
            target.appendChild(piece);

            if (canJumpAgain(targetRow, targetCol, piece)) {
                // Don't switch turns if another jump is available
                highlightValidMoves(target);
                return;
            }
        } else if (isRegularMove && !mandatoryJumpExists()) {
            target.appendChild(piece);
        } else {
            resetPiecePosition(piece);
            return;
        }

        // Check for king promotion
        if ((currentPlayer === 'red' && targetRow === 0) || 
            (currentPlayer === 'black' && targetRow === 7)) {
            piece.dataset.king = 'true';
            piece.classList.add('king');
        }

        // Switch turns
        currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
        currentTurnDisplay.textContent = `Current Turn: ${currentPlayer === 'red' ? 'Player 1 (Red)' : 'Player 2 (Black)'}`;
        
        // Clear any remaining highlights
        document.querySelectorAll('.valid-move').forEach(tile => {
            tile.classList.remove('valid-move');
        });
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

    function mandatoryJumpExists() {
        const pieces = document.querySelectorAll(`.piece.${currentPlayer}`);
        for (const piece of pieces) {
            const [row, col] = [piece.parentElement.dataset.row, piece.parentElement.dataset.col].map(Number);
            if (canJumpAgain(row, col, piece)) {
                return true;
            }
        }
        return false;
    }

    function canJumpAgain(row, col, piece) {
        const directions = (currentPlayer === 'red' || piece.dataset.king === 'true') ? [[-2, -2], [-2, 2]] : [];
        directions.push(...((currentPlayer === 'black' || piece.dataset.king === 'true') ? [[2, -2], [2, 2]] : []));
        for (const [rowDiff, colDiff] of directions) {
            const targetRow = row + rowDiff;
            const targetCol = col + colDiff;
            const jumpedTile = getJumpedTile(row, col, targetRow, targetCol);
            if (jumpedTile && jumpedTile.childElementCount > 0) {
                const jumpedPiece = jumpedTile.querySelector('.piece');
                if (jumpedPiece.classList.contains(currentPlayer === 'red' ? 'black' : 'red')) {
                    const targetTile = document.querySelector(`[data-row='${targetRow}'][data-col='${targetCol}']`);
                    if (targetTile && targetTile.childElementCount === 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    board.addEventListener('dragover', (e) => e.preventDefault());

    board.addEventListener('drop', (e) => {
        const target = e.target;
        const [startRow, startCol] = e.dataTransfer.getData('text').split(',').map(Number);
        const piece = document.querySelector(`[data-row='${startRow}'][data-col='${startCol}'] .piece`);
        movePieceToTarget(piece, target);
    });

    initializeBoard();
});