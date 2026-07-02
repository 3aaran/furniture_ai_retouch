async function clearDevelopmentServiceWorker(serviceWorker,cachesLike) {
  const registrations=await serviceWorker.getRegistrations?.()||[];
  await Promise.all(registrations.map(registration=>registration.unregister()));
  const cacheKeys=await cachesLike?.keys?.()||[];
  await Promise.all(cacheKeys.map(key=>cachesLike.delete(key)));
}

export function registerServiceWorker({
  isDev=Boolean(import.meta.env?.DEV),
  navigatorLike=globalThis.navigator,
  cachesLike=globalThis.caches,
  windowLike=globalThis.window,
  documentLike=globalThis.document
}={}) {
  const serviceWorker=navigatorLike?.serviceWorker;
  if (!serviceWorker) return;
  if (isDev) return clearDevelopmentServiceWorker(serviceWorker,cachesLike);

  const hadController = Boolean(serviceWorker.controller);

  windowLike.addEventListener('load', () => {
    serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(registration => {
        const applyWaitingWorker = () => {
          if (registration.waiting && navigator.serviceWorker.controller) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };
        const checkUpdate = () => registration.update().then(applyWaitingWorker).catch(() => {});

        checkUpdate();
        applyWaitingWorker();

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        documentLike.addEventListener('visibilitychange', () => {
          if (documentLike.visibilityState === 'visible') checkUpdate();
        });
        windowLike.addEventListener('online', checkUpdate);
      })
      .catch(() => {
        // PWA registration is optional; the app should continue to run normally.
      });
  });

  let refreshing = false;
  serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (refreshing) return;
    refreshing = true;
    windowLike.location.reload();
  });
}
