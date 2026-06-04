/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-d488705a'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "index.html",
    "revision": "de230444ffe047f6c858780762a9528f"
  }, {
    "url": "images/체크.png",
    "revision": "4109479e08147b049be79f616253e135"
  }, {
    "url": "images/종이비행기.png",
    "revision": "c5edf68ff12aa4dd20a98519d175571e"
  }, {
    "url": "images/landing-logo.png",
    "revision": "47ef796874212bb5a0d59e120c829c7f"
  }, {
    "url": "images/icon-512.png",
    "revision": "976d816665d6f0c63597c45c811d2a6b"
  }, {
    "url": "images/icon-512-maskable.png",
    "revision": "03f7ec4989b7d909b5c766ee218e4078"
  }, {
    "url": "images/icon-192.png",
    "revision": "54d5bcbefba6877ea7d685c34c7d8a56"
  }, {
    "url": "images/default-avatar.png",
    "revision": "f12d4af99fbb37d49a2fa160222ac0cb"
  }, {
    "url": "images/avatar.png",
    "revision": "54862487dd42c71f77906c8ddabb3bab"
  }, {
    "url": "fonts/MyFont.ttf",
    "revision": "9a94232013b7a8c7b4c8b7aa7e974af3"
  }, {
    "url": "assets/index-CYPDfePA.js",
    "revision": null
  }, {
    "url": "assets/index-CCB2fydt.css",
    "revision": null
  }, {
    "url": "images/icon-192.png",
    "revision": "54d5bcbefba6877ea7d685c34c7d8a56"
  }, {
    "url": "images/icon-512-maskable.png",
    "revision": "03f7ec4989b7d909b5c766ee218e4078"
  }, {
    "url": "images/icon-512.png",
    "revision": "976d816665d6f0c63597c45c811d2a6b"
  }, {
    "url": "images/landing-logo.png",
    "revision": "47ef796874212bb5a0d59e120c829c7f"
  }, {
    "url": "manifest.webmanifest",
    "revision": "0eaec1b032617794455067d980009ff7"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api") || url.pathname.startsWith("/archive"), new workbox.NetworkFirst({
    "cacheName": "api-cache",
    "networkTimeoutSeconds": 5,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 86400
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => url.hostname.includes("supabase"), new workbox.CacheFirst({
    "cacheName": "supabase-images",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');

}));
