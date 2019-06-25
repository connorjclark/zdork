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

const MOVE = '/move.json';

const NETWORK_ACTIONS = {
  '/start.json': {},
  '/move.json': {},
  '/labor.json': {
    resource: true,
  },
  '/wood.json': {
    resource: true,
  },
  '/cut-down-tree.json': {
    duration: 5,
    requires: {
      '/labor.json': 1,
    },
  },
  '/build-house.json': {
    duration: 10,
    requires: {
      '/wood.json': 1,
      '/labor.json': 1,
    },
  },
}

const statesForClients = {};
function getStateForClient(clientId) {
  if (statesForClients[clientId]) return statesForClients[clientId];

  const pendingTasksByType = {};
  for (const type in NETWORK_ACTIONS) {
    pendingTasksByType[type] = [];
  }

  const position = { x: 0, y: 0 };

  return statesForClients[clientId] = {
    position,
    createTask,
    getResources,
  };

  function createTask(type) {
    const networkAction = NETWORK_ACTIONS[type];
    const tasks = pendingTasksByType[type];

    let resolve;
    const promise = new Promise(_r => resolve = _r).then(() => {
      tasks.splice(tasks.indexOf(task), 1);
    });
    const task = {
      type,
      duration: networkAction.duration,
      promise,
      resolve,
    };

    if (task.duration > 0 && !tasks.length) {
      setTimeout(() => finishTask(task), 1000 * task.duration);
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

  function getResources(type, quantity) {
    const items = pendingTasksByType[type];
    if (items.length >= quantity) return items.slice(0, quantity);
  }
}


self.addEventListener('fetch', async event => {
  if (!event.request.url.startsWith(self.location.origin)) return;
  const url = new URL(event.request.url);
  if (NEVER_CACHE.includes(url.pathname)) return;
  const type = url.pathname;
  const state = getStateForClient(event.clientId);

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;

    let response = {
      success: true,
    };
    const networkAction = NETWORK_ACTIONS[type];

    if (networkAction.requires) {
      let allResources = [];
      for (const [type, quantity] of Object.entries(networkAction.requires)) {
        const resources = state.getResources(type, quantity);
        if (!resources) {
          response.success = false;
          response.message = 'need ' + type;
          break;
        }
        allResources.push(...resources);
      }
      if (response.success) {
        allResources.forEach(resource => resource.resolve());
      }
    }

    if (type === MOVE) {
      switch (url.searchParams.get('direction')) {
        case 'up':
          state.position.y += 1;
          break;
        case 'right':
          state.position.x += 1;
          break;
        case 'down':
          state.position.y -= 1;
          break;
        case 'left':
          state.position.x -= 1;
          break;
      }
      response.position = state.position;
    }

    if (response.success && (networkAction.duration > 0 || networkAction.resource)) {
      const task = state.createTask(type);
      await task.promise;
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
      status: response.success ? 200 : 400,
    });
  })());
});
