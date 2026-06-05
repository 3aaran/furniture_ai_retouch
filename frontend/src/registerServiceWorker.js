export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
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

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkUpdate();
        });
        window.addEventListener('online', checkUpdate);
      })
      .catch(() => {
        // PWA registration is optional; the app should continue to run normally.
      });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
