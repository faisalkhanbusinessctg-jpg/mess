/* মেস হিসাব — Service Worker
   অ্যাপ ইনস্টল ও অফলাইনে খোলার জন্য। নতুন ভার্শন দিলে নিচের VERSION বদলে দিন। */
const VERSION = 'mess-hishab-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase ডেটাবেস/API কখনো ক্যাশ হবে না
  if (url.hostname.endsWith('firebaseio.com') || url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts')) return;

  // পেজ: আগে নেটওয়ার্ক, না পেলে ক্যাশ (যাতে আপডেট সবসময় পাওয়া যায়)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // বাকি সব (ফন্ট, লাইব্রেরি, আইকন): ক্যাশ থেকে দেখাও, পেছনে আপডেট করো
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
