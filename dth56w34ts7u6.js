   const gridSize = 4;
   let isDragging = false;
   const minSwipeDist = 10;
   let score = 0, record = 0;
   let user = 'None', m_id = 'None';
   let payload = {}, reached = false;
   let touchStartX = 0, touchStartY = 0;
   let mouseStartX = 0, mouseStartY = 0;
   
   function getParamsFromURL() {
     try {
       const encoded = new URLSearchParams(window.location.search).get('r');
       if (!encoded) throw new Error("No data in URL");
       const {u, m, r
       } = JSON.parse(atob(encoded));
       user = u ?? user;
       m_id = m ?? m_id;
       record = r ?? record;
     } catch (e) {
       console.warn("URL data missing or invalid:", e.message);
     }
     return {user, m_id, record, payload: { type: "2048", score: record, user, m_id }};
   }
   
   function init() {
     document.getElementById('over-overlay').style.display = 'none';
     grid = Array(gridSize * gridSize).fill(0);
     score = 0;
     reached = false;
     document.querySelector('h1').style = `
     margin-bottom: 0.2rem;
     font-size: 1.8rem;
     color: #fff;`;
     updateScore();
     addRandomTile();
     addRandomTile();
     drawGrid();
   }
   
   function drawGrid() {
     const container = document.getElementById('game-container');
     container.innerHTML = '';
     grid.forEach(value => {
       const tile = document.createElement('div');
       tile.className = 'tile';
       tile.style.color = value === 2 || value === 4 ? '#333' : '#fff';
       tile.style.background = value > 0 ? getTileColor(value) : '#3a3a3a';
       tile.textContent = value > 0 ? value : '';
       container.appendChild(tile);
       const length = tile.textContent.length;
       const baseSize = 2;
       const step = 0.3;
       const fontSize = Math.max(0.8, baseSize - (length - 3) * step);
       tile.style.fontSize = `${fontSize}rem`;
     });
   }
   
   function updateFontSize() {
     ['score', 'record'].forEach(id => {
       const el = document.getElementById(id);
       let fontSize = 1.5;
       el.style.fontSize = `${fontSize}rem`;
       while (el.scrollWidth > el.clientWidth && fontSize > 0.5) {
         fontSize -= 0.05;
         el.style.fontSize = `${fontSize.toFixed(2)}rem`;
       }
     });
   }
   
   function updateScore() {
     const scoreElement = document.getElementById('score');
     const recordElement = document.getElementById('record');
     if (score > record) {
       record = score;
     }
     scoreElement.textContent = score;
     recordElement.textContent = record;
     updateFontSize();
   }
   
   function getTileColor(value) {
     const colors = {
       2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
       16: '#f59563', 32: '#f67c5f', 64: '#f65e3b',
       128: '#edcf72', 256: '#edcc61', 512: '#edc850',
       1024: '#edc53f', 2048: '#edc22e',
     };
     return colors[value] || `hsl(${Math.log2(value) * 35 % 360}, 70%, 55%)`;
   }
   
   function addRandomTile() {
     const emptyIndices = grid.reduce((acc, val, i) => val === 0 ? [...acc, i] : acc, []);
     if (!emptyIndices.length) return;
     const randIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
     grid[randIndex] = Math.random() < 0.9 ? 2 : 4;
     checkReached();
   }
   
   function checkReached() {
     if (!reached) {
       if (grid.includes(2048)) {
         reached = true;
         const popup = document.getElementById('congrat-popup');
         popup.textContent = 'Поздравляю, ты прошел игру!';
         popup.style.display = 'flex';
         popup.style.opacity = '0';
         popup.style.transform = 'translate(-50%, -60%) scale(0.9)';
         setTimeout(() => {
           popup.style.opacity = '1';
           popup.style.transform = 'translate(-50%, -50%) scale(1)';
         }, 10);
         setTimeout(() => {
           popup.style.opacity = '0';
           popup.style.transform = 'translate(-50%, -60%) scale(0.9)';
           setTimeout(() => {
             popup.style.display = 'none';
           }, 300);
         }, 3000);
         document.querySelector('h1').style = `
   			  margin-bottom: 0.3rem;
   			  font-size: 1.9rem;
   			  font-family: sans-serif;
   			  color: #FFD700;
   			  text-shadow:
   				0 0 5px #8B7500,
   				0 0 10px #DAA520,
   				0 0 15px #FFD700,
   				0 0 25px #FFEC8B;
   			  animation: pulse 2s infinite;`;
         const record = document.querySelector('.record');
         if (record) {
           record.style.color = '#FFD700';
         }
       }
     }
   }
   
   function move(dir) {
     const oldGrid = [...grid];
     const newGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
     let moved = false;
     for (let i = 0; i < gridSize; i++) {
       let row = [];
       for (let j = 0; j < gridSize; j++) {
         let val;
         if (dir === 'left') val = grid[i * gridSize + j];
         if (dir === 'right') val = grid[i * gridSize + (gridSize - 1 - j)];
         if (dir === 'up') val = grid[j * gridSize + i];
         if (dir === 'down') val = grid[(gridSize - 1 - j) * gridSize + i];
         if (val !== 0) row.push(val);
       }
       const originalRow = [...row];
       row = mergeRow(row);
       while (row.length < gridSize) row.push(0);
       for (let j = 0; j < gridSize; j++) {
         let val = row[j];
         if (dir === 'left') newGrid[i][j] = val;
         if (dir === 'right') newGrid[i][gridSize - 1 - j] = val;
         if (dir === 'up') newGrid[j][i] = val;
         if (dir === 'down') newGrid[gridSize - 1 - j][i] = val;
       }
       if (JSON.stringify(originalRow) !== JSON.stringify(row)) {
         moved = true;
       }
     }
     const flatNewGrid = newGrid.flat();
     const hasChanged = JSON.stringify(oldGrid) !== JSON.stringify(flatNewGrid);
     if (hasChanged) {
       grid = flatNewGrid;
       addRandomTile();
       updateScore();
       drawGrid();
       if (isGameOver()) {
         document.getElementById('over-overlay').style.display = 'block';
         sendScoreToBot();
       }
     }
   }
   
   function mergeRow(row) {
     let merged = [];
     let skip = false;
     for (let i = 0; i < row.length; i++) {
       if (skip) {
         skip = false;
         continue;
       }
       if (i < row.length - 1 && row[i] === row[i + 1] && row[i] !== 0) {
         merged.push(row[i] * 2);
         score += row[i] * 2;
         skip = true;
       } else {
         merged.push(row[i]);
       }
     }
     return merged;
   }
   
   function isGameOver() {
     return !grid.includes(0) && !canMerge();
   }
   
   function canMerge() {
     for (let i = 0; i < gridSize * gridSize; i++) {
       const row = Math.floor(i / gridSize),
         col = i % gridSize;
       const current = grid[i];
       const right = col < gridSize - 1 ? grid[i + 1] : null;
       const down = row < gridSize - 1 ? grid[i + gridSize] : null;
       if (current === right || current === down) return true;
     }
     return false;
   }
   
   function sendScoreToBot() {
     if (m_id === 'None' || user === 'None') {
       showPopup("⚠️ Рекорд не сохранён.<br>Зайди из Телеграм!");
       return;
     }
     payload.score = record;
     fetch('https://mygame2048.loca.lt/game_score', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(payload),
         mode: 'cors',
       })
       .then(response => response.json())
       .then(data => {
         console.log("Server response:", data);
         showPopup(data.success ? "✅ Рекорд сохранён!" : "⚠️ Ошибка при сохранении рекорда");
       })
       .catch((error) => {
         console.error("Ошибка при отправке рекорда:", error);
         showPopup("⚠️ Не удалось сохранить рекорд");
       });
   }
   
   function showPopup(message) {
     const popup = document.getElementById('popup-message');
     popup.innerHTML = message;
     popup.style.display = 'flex';
     popup.style.opacity = '0';
     popup.style.transform = 'translate(-50%, -60%)';
     setTimeout(() => {
       popup.style.opacity = '1';
       popup.style.transform = 'translate(-50%, -50%)';
     }, 10);
     setTimeout(() => {
       popup.style.opacity = '0';
       popup.style.transform = 'translate(-50%, -60%)';
       setTimeout(() => {
         popup.style.display = 'none';
       }, 300);
     }, 2500);
   }
   
   window.addEventListener('keydown', e => {
     const key = e.key;
     const wasd = key.toLowerCase();
     const keys = {
       ArrowLeft: 'left',
       ArrowRight: 'right',
       ArrowUp: 'up',
       ArrowDown: 'down',
       a: 'left',
       d: 'right',
       w: 'up',
       s: 'down',
       ф: 'left',
       в: 'right',
       ц: 'up',
       ы: 'down'
     };
     if (keys[key]) {
       move(keys[key]);
     } else if (keys[wasd]) {
       move(keys[wasd]);
     }
   });
   
   window.addEventListener('touchstart', e => {
     const touch = e.touches[0];
     touchStartX = touch.clientX;
     touchStartY = touch.clientY;
   });
   
   window.addEventListener('touchend', e => {
     const touch = e.changedTouches[0];
     const dx = touch.clientX - touchStartX;
     const dy = touch.clientY - touchStartY;
     if (Math.abs(dx) < minSwipeDist && Math.abs(dy) < minSwipeDist) return;
     if (Math.abs(dx) > Math.abs(dy)) {
       move(dx > 0 ? 'right' : 'left');
     } else {
       move(dy > 0 ? 'down' : 'up');
     }
   });
   
   window.addEventListener('mousemove', e => {
     if (isDragging) return;
     const dx = e.clientX - mouseStartX;
     const dy = e.clientY - mouseStartY;
     if (Math.abs(dx) > minSwipeDist || Math.abs(dy) > minSwipeDist) {
       isDragging = true;
     }
   });
   
   window.addEventListener('mouseup', e => {
     if (!isDragging) return;
     const dx = e.clientX - mouseStartX;
     const dy = e.clientY - mouseStartY;
     if (Math.abs(dx) < minSwipeDist && Math.abs(dy) < minSwipeDist) return;
     if (Math.abs(dx) > Math.abs(dy)) {
       move(dx > 0 ? 'right' : 'left');
     } else {
       move(dy > 0 ? 'down' : 'up');
     }
     isDragging = false;
   });
   
   window.addEventListener('mousedown', e => {
     mouseStartX = e.clientX;
     mouseStartY = e.clientY;
     isDragging = false;
   });
   
   window.addEventListener('load', () => {
     const urlData = getParamsFromURL();
     user = urlData.user;
     m_id = urlData.m_id;
     record = urlData.record;
     payload = urlData.payload;
     init();
     updateFontSize();
     if (record > 0) {
       document.getElementById('record').textContent = record;
     }
     console.log(`User login:\ntype: '${payload.type}'\nuser: '${payload.user}'\nm_id: '${payload.m_id}'`);
     document.querySelector('.restart-button').addEventListener('click', init);
     document.getElementById('over-overlay').addEventListener('click', () => {
       document.getElementById('over-overlay').style.display = 'none';
       init();
     });
   });
