const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime';

const PRECACHE_URLS = [
];
const NEVER_CACHE = [
  '/index.html',
  '/',
  '/styles.css',
  '/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

const START = '/start.json';
const BUILD_HOUSE = '/build-house.json';
const CUT_DOWN_TREE = '/cut-down-tree.json';
const WOOD = '/wood.json';

const pendingTasksByType = {
  [BUILD_HOUSE]: [], // only allow one task at a time.
  [CUT_DOWN_TREE]: [], // only allow one task at a time.
  [WOOD]: [], // inventory
};

function createTask(type, duration) {
  const tasks = pendingTasksByType[type];

  let resolve;
  const promise = new Promise(_r => resolve = _r).then(() => {
    tasks.splice(tasks.indexOf(task), 1);
  });
  const task = {
    type,
    duration,
    promise,
    resolve,
  };

  if (duration > 0 && !tasks.length) {
    setTimeout(() => finishTask(task), 1000 * duration);
  }

  tasks.push(task);
  return task;
}

function finishTask(task) {
  task.resolve();
  const tasks = pendingTasksByType[task.type];
  if (tasks.length) {
    const nextTask = tasks[0];
    setTimeout(() => finishTask(nextTask), 1000 * nextTask.duration); 
  }
}

function getItem(type) {
  const items = pendingTasksByType[type];
  if (items.length) return items[0];
}

self.addEventListener('fetch', async event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  const url = new URL(event.request.url);
  const pathname = url.pathname;
  if (NEVER_CACHE.includes(pathname)) return;

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;

    let response = {
      success: true,
    };
    let timeout = 0;
    if (pathname === START) {
      // nothing ...
    } else if (pathname === BUILD_HOUSE) {
      timeout = 10;
      const wood = getItem(WOOD);
      if (wood) {
        wood.resolve();
      } else {
        response.success = false;
      }
    } else if (pathname === CUT_DOWN_TREE) {
      timeout = 5;
    } else if (pathname === WOOD) {
      timeout = -1;
    }

    if (response.success) {
      if (timeout > 0) {
        const task = createTask(pathname, timeout);
        await task.promise;
      }
  
      if (timeout === -1) {
        const task = createTask(pathname, timeout);
        await task.promise; // resolves when item is used.
      }
    }

    return new Response(JSON.stringify(response), {
      headers: {'Content-Type': 'application/json'},
      status: response.success ? 200 : 400,
    });
  })());
});
