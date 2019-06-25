window.navigator.serviceWorker.register('sw.js');

const mapAsString = `
...............
...............
.....ggg.......
.....gxg.......
ww...ggg.......
ww....gg.......
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

  const villageEl = document.querySelector('.village');
  villageEl.addEventListener('click', e => {
    if (!e.target.classList.contains('cell')) return;
    const {x, y} = e.target.dataset;
    map[x][y] = 'l';
    renderVillage();
    fetch(`/build-house.json?x=${x}&y=${y}`).then(() => {
      map[x][y] = 'x';
      renderVillage();
    });
  });
}

function renderVillage() {
  const villageEl = document.querySelector('.village');
  villageEl.innerHTML = '';

  for (const [x, row] of map.entries()) {
    for (const [y, char] of row.entries()) {
      const cellEl = document.createElement('div');
      cellEl.dataset.x = x;
      cellEl.dataset.y = y;
      cellEl.classList.add('cell');
      if (char === 'g') {
        cellEl.classList.add('grass');
      } else if (char === 'w') {
        cellEl.classList.add('water');
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
