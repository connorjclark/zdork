window.navigator.serviceWorker.register('sw.js');

const mapAsString = `
...............
...............
.....ggg....ttt
.....gxg....ttt
ww...ggg....ttt
ww....gg....ttt
ww....gg.......
ww....gg.......
ww....ggg......
.......ggg.....
.......gxg.....
.......ggg.....
...............
...............
...............
...............
`;
const map = [];
for (const line of mapAsString.split('\n')) {
  const row = [];
  for (const char of line) {
    row.push(char);
  }
  map.push(row);
}

function begin() {
  document.querySelector('.container--loading').classList.remove('active');
  document.querySelector('.container--game').classList.add('active');

  renderVillage();
  fetch('/wood.json');
  fetch('/wood.json');
  fetch('/wood.json');
  for (const row of map) {
    for (const char of row) {
      if (char === 'x') getLabor();
    }
  }
  askForMovement();

  const villageEl = document.querySelector('.village');
  villageEl.addEventListener('click', e => {
    if (!e.target.classList.contains('cell')) return;
    const {x, y, type} = e.target.dataset;
    if (type === '.' || type === 'g') {
      buildHouse(x, y);
    } else if (type === 't') {
      cutDownTree(x, y);
    }
  });
}

function buildHouse(x, y) {
  const before = map[x][y];
  map[x][y] = 'l';
  renderVillage();
  fetch(`/build-house.json?x=${x}&y=${y}`).then((response) => {
    if (response.status === 200) {
      getLabor();
      getLabor();
      map[x][y] = 'x';
    } else {
      map[x][y] = before;
    }
    renderVillage();
  });
}

function cutDownTree(x, y) {
  const before = map[x][y];
  map[x][y] = 'l';
  renderVillage();
  fetch(`/cut-down-tree.json?x=${x}&y=${y}`).then((response) => {
    if (response.status === 200) {
      getLabor();
      map[x][y] = 'g';
      fetch('/wood.json');
    } else {
      map[x][y] = before;
    }
    renderVillage();
  });
}

function getLabor() {
  fetch('/labor.json');
}

function askForMovement() {
  fetch('/move.json?direction=up').catch(() => {});
  fetch('/move.json?direction=right').catch(() => {});
  fetch('/move.json?direction=down').catch(() => {});
  fetch('/move.json?direction=left').catch(() => {});
}

function renderVillage() {
  const villageEl = document.querySelector('.village');
  villageEl.innerHTML = '';

  for (const [x, row] of map.entries()) {
    for (const [y, char] of row.entries()) {
      const cellEl = document.createElement('div');
      cellEl.dataset.x = x;
      cellEl.dataset.y = y;
      cellEl.dataset.type = char;
      cellEl.classList.add('cell');
      if (char === 'g') {
        cellEl.classList.add('grass');
      } else if (char === 'w') {
        cellEl.classList.add('water');
      } else if (char === 't') {
        cellEl.classList.add('wood');
      } else if (char === 'l') {
        cellEl.classList.add('loading');
      } else if (char === 'x') {
        cellEl.classList.add('grass', 'house');
        cellEl.title = 'A nice house';
      } else if (char === '.') {
        cellEl.textContent = '.';
      }
      villageEl.appendChild(cellEl);
    }
  }
}

fetch('/start.json').then(async response => {
  const data = await response.json();
  if (data.success) begin();
});
