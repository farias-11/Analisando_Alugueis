const CACHE_NAME = "trainer-pro-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Network-first só pra navegação de verdade (troca de aba/URL, refresh) —
// NUNCA intercepta os fetch() internos do Next.js usados na navegação
// client-side (RSC payload), senão quebra o roteamento rápido do app inteiro
// (botão voltar, troca de aba pela bottom nav etc. passam a depender de rede
// e ficam lentos/quebrados). Cacheia as páginas de treino visitadas de
// verdade pra continuar navegável na academia sem sinal — os registros de
// série ficam numa fila local separada (lib/offline-queue.ts) até a conexão
// voltar. Não intercepta chamadas de API/Supabase.
const ROTAS_CACHEAVEIS = ["/home", "/treino", "/progresso", "/conta"];

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const devecachear = ROTAS_CACHEAVEIS.some((rota) => url.pathname.startsWith(rota));

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (devecachear && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cacheado = await caches.match(request);
        if (cacheado) return cacheado;
        const raiz = await caches.match(OFFLINE_URL);
        return raiz ?? Response.error();
      })
  );
});

// Web Push: exibe a notificação recebida do backend.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Trainer Pro", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Trainer Pro", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(targetUrl));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});
