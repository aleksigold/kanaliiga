const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}serviceworker.js`,
        {
          scope: import.meta.env.BASE_URL,
        },
      );
    } catch (error) {
      console.error(error);
    }
  }
};

const cache = async ({ request }: FetchEvent) => {
  if (!request.url.endsWith('/landing') && !request.url.endsWith('.png')) {
    return fetch(request);
  }

  const cache = await caches.open('v1');
  const cached = await cache.match(request);

  if (cached) {
    console.log('Serving from cache:', request.url);
    return cached;
  }

  const response = await fetch(request);

  if (response.status === 200) {
    cache.put(request, response.clone());
  }

  return response;
};

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(cache(event));
});

registerServiceWorker();
