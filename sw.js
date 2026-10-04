/*
 * Service worker de la version en ligne : l'outil marche hors ligne et se met à jour proprement.
 * Ce fichier est un modèle : à la construction (vite.config.js), __VERSION__ et __FICHIERS__ sont remplacés
 * par l'empreinte de la version et la liste de ses fichiers.
 *  - les fichiers de la version sont gardés dès l'installation (copies retrouvées même si le serveur répondait
 *    « Vary: Origin » : un module chargé avec crossorigin envoie un en-tête Origin que la copie n'avait pas) ;
 *  - les pages : réseau d'abord (la dernière version), copie gardée si hors ligne ;
 *  - les bibliothèques du CDN (temps réel, QR code) : copie gardée, rafraîchie en arrière-plan ;
 *  - Supabase et tout le reste : jamais gardés (le direct reste le direct).
 * Une nouvelle version attend que l'utilisateur clique « Recharger » : jamais de rechargement en pleine impro.
 */
const VERSION = "29bd7e287567";
const FICHIERS = ["./","./apple-touch-icon.png","./assets/classement-C5t5GXom.js","./assets/classement-Cw7Xj98w.js","./assets/invite-BQP4jTyH.js","./assets/invite-BhmJJ0vM.css","./assets/jeu-D7gsMPQ8.js","./assets/mots-fr-CAuqfMRV.txt","./assets/outil-9GowEqeH.css","./assets/outil-WwPdAuG4.js","./assets/public-DHtBDxiu.css","./assets/reseau-BwUYf7nc.js","./assets/scene-BA5sWYT4.js","./assets/spectateurs-DH489sai.js","./favicon-32.png","./icone-192.png","./icone-512.png","./icone-masquable-512.png","./index.html","./invite/index.html","./manifest.webmanifest","./public/classement.html","./public/index.html"];
const CACHE = `juge-impro-${VERSION}`;
const CACHE_CDN = 'juge-impro-cdn';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const nom of await caches.keys()) if (nom.startsWith('juge-impro-') && nom !== CACHE && nom !== CACHE_CDN) await caches.delete(nom);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'activer') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const requete = e.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);

  if (url.origin === self.location.origin) {
    if (requete.mode === 'navigate') {
      e.respondWith(fetch(requete).then((r) => {
        if (r.ok) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(requete, copie)); }
        return r;
      }).catch(async () => (await caches.match(requete, { ignoreSearch: true, ignoreVary: true })) || caches.match('./index.html')));
      return;
    }
    e.respondWith(caches.match(requete, { ignoreSearch: true, ignoreVary: true }).then((r) => r || fetch(requete)));
    return;
  }

  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(CACHE_CDN).then(async (c) => {
      const garde = await c.match(requete);
      const reseau = fetch(requete).then((r) => { if (r.ok) c.put(requete, r.clone()); return r; }).catch(() => garde);
      return garde || reseau;
    }));
  }
});
