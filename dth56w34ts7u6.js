const gridSize = 4;
let grid = [];
let score = 0;
let record = 0;
let initialRecordLoaded = false;

function init() {
  document.getElementById('game-over-overlay').style.display = 'none';
  grid = Array(gridSize * gridSize).fill(0);
  score = 0;
  updateScore();
  addRandomTile();
  addRandomTile();
  drawGrid();
}

function getParamsFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedData = urlParams.get('r');
  let user = 'Unknown';
  let m_id = '0000';
  let record = 0;
  if (!encodedData) {
    console.error("No data found in URL! Starting game with default values.");
  } else {
    try {
      const jsonString = atob(encodedData);
      const data = JSON.parse(jsonString);
      user = data.u || user;
      m_id = data.m || m_id;
      record = data.r || record;
    } catch (error) {
      console.error("Error parsing JSON from URL:", error);
    }
  }
  const payload = {
    type: "2048",
    score: record,
    user: user,
    m_id: m_id
  };
  return {
    user,
    m_id,
    record,
    payload
  };
}

function isGameOver() {
  return !grid.includes(0) && !canMerge();
}

function showPopup(message) {
  const popup = document.getElementById('popup-message');
  popup.textContent = message;
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

function sendScoreToBot() {
  const {
    user,
    m_id
  } = getParamsFromURL();
  if (m_id === "0000") {
    showPopup("⚠️ Рекорд не сохранён, зайди через Телеграм!");
    return;
  }
  const payload = {
    type: "2048",
    score: record,
    user,
    m_id
  };
  console.log(user, m_id, record);
  console.log(payload);
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

function updateFontSize() {
  const scoreElement = document.getElementById('score');
  const recordElement = document.getElementById('record');

  function adjustFontSize(element) {
    const value = element.textContent;
    let fontSize = 1.5;
    const maxWidth = element.offsetWidth;
    while (element.scrollWidth > maxWidth && fontSize > 0.5) {
      fontSize -= 0.1;
      element.style.fontSize = `${fontSize}rem`;
    }
  }
  adjustFontSize(scoreElement);
  adjustFontSize(recordElement);
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

function canMerge() {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const current = grid[i * gridSize + j];
      const right = j < gridSize - 1 ? grid[i * gridSize + j + 1] : 0;
      const down = i < gridSize - 1 ? grid[(i + 1) * gridSize + j] : 0;
      if (current === right || current === down) return true;
    }
  }
  return false;
}

function drawGrid() {
  const container = document.getElementById('game-container');
  container.innerHTML = '';
  grid.forEach(value => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-value', value > 0 ? value : '');
    tile.style.background = value > 0 ? getTileColor(value) : '#3a3a3a';
    tile.textContent = value > 0 ? value : '';
    container.appendChild(tile);
  });
}

function getTileColor(value) {
  const colors = {
    0: '#3a3a3a',
    2: '#eee4da',
    4: '#ede0c8',
    8: '#f2b179',
    16: '#f59563',
    32: '#f67c5f',
    64: '#f65e3b',
    128: '#edcf72',
    256: '#edcc61',
    512: '#edc850',
    1024: '#edc53f',
    2048: '#edc22e',
  };
  if (value in colors) return colors[value];
  let exponent = Math.log2(value);
  let hue = (exponent * 35) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function addRandomTile() {
  const empty = grid.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);
  if (empty.length === 0) return;
  const randIndex = empty[Math.floor(Math.random() * empty.length)];
  grid[randIndex] = Math.random() < 0.9 ? 2 : 4;
}

function move(dir) {
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
  if (moved) {
    grid = newGrid.flat();
    addRandomTile();
    updateScore();
    drawGrid();
    if (isGameOver()) {
      document.getElementById('game-over-overlay').style.display = 'block';
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
window.addEventListener('keydown', e => {
  const keys = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down'
  };
  if (keys[e.key]) {
    move(keys[e.key]);
  }
});
let touchStartX = 0;
let touchStartY = 0;
window.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
});
window.addEventListener('touchend', e => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 'right' : 'left');
  } else {
    move(dy > 0 ? 'down' : 'up');
  }
});
let mouseStartX = 0;
let mouseStartY = 0;
let isDragging = false;
const minSwipeDistance = 10;
window.addEventListener('mousedown', e => {
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
  isDragging = false;
});
window.addEventListener('mousemove', e => {
  if (isDragging) return;
  const dx = e.clientX - mouseStartX;
  const dy = e.clientY - mouseStartY;
  if (Math.abs(dx) > minSwipeDistance || Math.abs(dy) > minSwipeDistance) {
    isDragging = true;
  }
});
window.addEventListener('mouseup', e => {
  if (!isDragging) return;
  const dx = e.clientX - mouseStartX;
  const dy = e.clientY - mouseStartY;
  if (Math.abs(dx) < minSwipeDistance && Math.abs(dy) < minSwipeDistance) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 'right' : 'left');
  } else {
    move(dy > 0 ? 'down' : 'up');
  }
  isDragging = false;
});
window.onload = () => {
  init();
  updateFontSize();
  const {
    user,
    m_id,
    record,
    payload
  } = getParamsFromURL();
  console.log(user, m_id, record);
  console.log(payload);
  if (record > 0) {
    document.getElementById('record').textContent = record;
  }
  document.querySelector('.restart-button').addEventListener('click', init);
  document.getElementById('game-over-overlay').addEventListener('click', () => {
    document.getElementById('game-over-overlay').style.display = 'none';
    init();
  });
};
