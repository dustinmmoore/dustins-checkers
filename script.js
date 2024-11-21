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
        if (!e.target.classList.contains(currentPlayer)) {
            e.preventDefault();
            return;
        }
        draggedPiece = e.target;
        draggedPieceStartTile = e.target.parentElement;
        draggedPieceOffsetX = e.touches[0].clientX - draggedPiece.getBoundingClientRect().left;
        draggedPieceOffsetY = e.touches[0].clientY - draggedPiece.getBoundingClientRect().top;
        draggedPiece.style.position = 'absolute';
        draggedPiece.style.zIndex = 1000;
    }

    function touchMove(e) {
        if (!draggedPiece) return;
        const touch = e.touches[0];
        const newX = touch.clientX - draggedPieceOffsetX;
        const newY = touch.clientY - draggedPieceOffsetY;
        draggedPiece.style.left = `${newX}px`;
        draggedPiece.style.top = `${newY}px`;
        e.preventDefault();
    }

    function touchEnd(e) {
        if (!draggedPiece) return;
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.classList.contains('tile') && target.classList.contains('black') && target.childElementCount === 0) {
            movePieceToTarget(draggedPiece, target);
        } else {
            resetPiecePosition(draggedPiece);
        }
        draggedPiece.style.zIndex = '';
        draggedPiece.style.position = 'relative';
        draggedPiece.style.left = '0';
        draggedPiece.style.top = '0';
        draggedPiece = null;
        draggedPieceStartTile = null;
    }

    function movePieceToTarget(piece, target) {
        const [startRow, startCol] = [piece.parentElement.dataset.row, piece.parentElement.dataset.col].map(Number);
        const [targetRow, targetCol] = [target.dataset.row, target.dataset.col].map(Number);

        const rowDifference = targetRow - startRow;
        const colDifference = targetCol - startCol;

        const isForwardMove = (currentPlayer === 'red' && rowDifference === -1) || (currentPlayer === 'black' && rowDifference === 1);
        const isJumpMove = Math.abs(rowDifference) === 2 && Math.abs(colDifference) === 2;

        if (isForwardMove && Math.abs(colDifference) === 1 && !mandatoryJumpExists()) {
            target.appendChild(piece);
        } else if (isJumpMove) {
            const jumpedTile = getJumpedTile(startRow, startCol, targetRow, targetCol);
            if (jumpedTile && jumpedTile.childElementCount > 0) {
                const jumpedPiece = jumpedTile.querySelector('.piece');
                if (jumpedPiece.classList.contains(currentPlayer === 'red' ? 'black' : 'red')) {
                    jumpedTile.removeChild(jumpedPiece);
                    scores[currentPlayer] += 1;
                    updateScore();
                    target.appendChild(piece);
                    if (canJumpAgain(targetRow, targetCol, piece)) {
                        return;
                    }
                } else {
                    resetPiecePosition(piece);
                    return;
                }
            } else {
                resetPiecePosition(piece);
                return;
            }
        } else {
            resetPiecePosition(piece);
            return;
        }

        if ((currentPlayer === 'red' && targetRow === 0) || (currentPlayer === 'black' && targetRow === 7)) {
            piece.dataset.king = 'true';
            piece.classList.add('king');
        }

        currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
        currentTurnDisplay.textContent = `Current Turn: ${currentPlayer === 'red' ? 'Player 1 (Red)' : 'Player 2 (Black)'}`;
        piece.style.transform = 'translate(0, 0)';
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