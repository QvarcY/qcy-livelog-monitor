(() => {
  "use strict";

  const DEMO_FINGERPRINT =
    "SHA256:Q2NZRGVtb0hvc3RLZXlTeW50aGV0aWNPbmx5";

  const demoLogs = [
    {
      domain: "example.com",
      fileName: "example.com.access.log",
      remotePath: "/var/log/nginx/example.com.access.log"
    },
    {
      domain: "shop.example.com",
      fileName: "shop.example.com.access.log",
      remotePath: "/var/log/nginx/shop.example.com.access.log"
    },
    {
      domain: "api.example.com",
      fileName: "api.example.com.access.log",
      remotePath: "/var/log/nginx/api.example.com.access.log"
    },
    {
      domain: "docs.example.com",
      fileName: "docs.example.com.access.log",
      remotePath: "/var/log/nginx/docs.example.com.access.log"
    },
    {
      domain: "example.net",
      fileName: "example.net.access.log",
      remotePath: "/var/log/nginx/example.net.access.log"
    },
    {
      domain: "status.example.net",
      fileName: "status.example.net.access.log",
      remotePath: "/var/log/nginx/status.example.net.access.log"
    }
  ];

  let preferences = {
    language: "en",
    theme: "dark",
    alwaysOnTop: false,
    defaultServerProfileId: "demo-server",
    autoConnect: true,
    launchAtLogin: false,
    monitoredProjectDomains: null
  };

  let serverProfiles = [
    {
      id: "demo-server",
      name: "Demo server",
      ssh: {
        host: "demo.example.com",
        port: 22,
        username: "demo",
        privateKeyPath: "C:\\Users\\demo\\.ssh\\id_ed25519",
        hostKeySha256: DEMO_FINGERPRINT
      },
      logs: {
        directory: "/var/log/nginx",
        pattern: "*.access.log",
        parser: "auto",
        projectNameSuffix: ".access.log"
      }
    }
  ];

  const rememberedPassphrases =
    new Set(["demo-server"]);

  const listeners = {
    status: new Set(),
    request: new Set(),
    rotation: new Set(),
    smart: new Set()
  };

  const rawRequests = [];
  const smartGroups = new Map();
  const actorGroups = new Map();

  let requestSequence = 0;
  let groupSequence = 0;

  const actors = [
    {
      ip: "192.0.2.14",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/154.0 Safari/537.36"
    },
    {
      ip: "198.51.100.22",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605.1.15"
    },
    {
      ip: "203.0.113.17",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) Firefox/145.0"
    },
    {
      ip: "198.51.100.73",
      userAgent:
        "Googlebot/2.1 (+http://www.google.com/bot.html)"
    },
    {
      ip: "203.0.113.98",
      userAgent:
        "SyntheticScanner/1.4"
    },
    {
      ip: "192.0.2.86",
      userAgent:
        "curl/8.11.1"
    }
  ];

  const humanPaths = [
    "/",
    "/products",
    "/products/keyboard",
    "/cart",
    "/checkout",
    "/account",
    "/docs/getting-started",
    "/pricing",
    "/blog/qcy-demo"
  ];

  const assets = [
    "/assets/app.css",
    "/assets/app.js",
    "/assets/logo.svg",
    "/assets/fonts/inter.woff2",
    "/favicon.ico"
  ];

  const apiPaths = [
    "/api/v1/session",
    "/api/v1/cart",
    "/api/v1/search?q=monitor",
    "/api/v1/preferences",
    "/api/health"
  ];

  const securityPaths = [
    "/.env",
    "/wp-login.php",
    "/admin/config.php",
    "/.git/config"
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function random(items) {
    return items[
      Math.floor(Math.random() * items.length)
    ];
  }

  function chance(probability) {
    return Math.random() < probability;
  }

  function activeDomains() {
    if (preferences.monitoredProjectDomains === null) {
      return demoLogs.map((log) => log.domain);
    }

    const available =
      new Set(demoLogs.map((log) => log.domain));

    return preferences.monitoredProjectDomains
      .filter((domain) => available.has(domain));
  }

  function categoryForLayer(layer, path, status) {
    if (layer === "bot") {
      return "BOT";
    }

    if (layer === "security") {
      return path.includes("wp-")
        ? "WP_PROBE"
        : "SECURITY_PROBE";
    }

    if (layer === "error" || status >= 500) {
      return "SERVER_ERROR";
    }

    if (status === 404) {
      return "NOT_FOUND";
    }

    return "VISITOR";
  }

  function roleFor(path, method) {
    if (
      /\.(?:css|js|mjs|svg|png|jpe?g|gif|webp|ico|woff2?)$/i
        .test(path)
    ) {
      return "asset";
    }

    if (
      path.startsWith("/api/") ||
      !["GET", "HEAD"].includes(method)
    ) {
      return "background";
    }

    return "document";
  }

  function makeTimestamp(date) {
    return date.toISOString();
  }

  function makeRequest(options = {}) {
    const domains = activeDomains();

    if (domains.length === 0) {
      return null;
    }

    const domain =
      options.domain || random(domains);

    const actor =
      options.actor || random(actors.slice(0, 3));

    const layer =
      options.layer || "human-like";

    const method =
      options.method ||
      (
        layer === "human-like" && chance(.12)
          ? random(["POST", "PUT"])
          : "GET"
      );

    let path =
      options.path ||
      (
        layer === "security"
          ? random(securityPaths)
          : layer === "server"
            ? "/api/health"
            : layer === "bot"
              ? random([
                  "/robots.txt",
                  "/sitemap.xml",
                  "/products",
                  "/docs"
                ])
              : random(humanPaths)
      );

    let status =
      options.status ??
      (
        layer === "security"
          ? random([403, 404])
          : layer === "error"
            ? random([500, 502, 503])
            : layer === "server"
              ? random([200, 200, 503])
              : chance(.94)
                ? random([200, 200, 200, 204, 304])
                : random([401, 404, 429])
      );

    const receivedAt =
      options.receivedAt || new Date();

    requestSequence += 1;

    return {
      sequence: requestSequence,
      receivedAt: receivedAt.toISOString(),
      domain,
      category:
        categoryForLayer(
          layer,
          path,
          status
        ),
      ip: actor.ip,
      timestamp:
        makeTimestamp(receivedAt),
      method,
      path,
      protocol:
        chance(.88)
          ? "HTTP/2"
          : "HTTP/1.1",
      status,
      bytes:
        String(
          Math.floor(
            420 +
            Math.random() * 92000
          )
        ),
      referer:
        chance(.72)
          ? random([
              "https://www.google.com/",
              "https://example.com/",
              "https://docs.example.com/",
              "-"
            ])
          : "-",
      userAgent:
        actor.userAgent,
      observedDelayMs:
        Math.floor(
          18 +
          Math.random() *
            (
              status >= 500
                ? 1250
                : 340
            )
        ),
      __demoLayer: layer
    };
  }

  function eventRole(event) {
    return roleFor(
      event.path,
      event.method
    );
  }

  function groupKey(event) {
    return [
      event.domain,
      event.ip,
      event.userAgent,
      event.__demoLayer
    ].join("|");
  }

  function makeGroup(event, role) {
    groupSequence += 1;

    const id =
      `demo-group-${groupSequence}`;

    const request = {
      ...event,
      role
    };

    delete request.__demoLayer;

    return {
      id,
      actorKey:
        `${event.ip}|${event.userAgent}`,
      domain: event.domain,
      ip: event.ip,
      userAgent: event.userAgent,
      startedAt: event.receivedAt,
      updatedAt: event.receivedAt,
      layer: event.__demoLayer,
      primaryRequest: {
        sequence: event.sequence,
        method: event.method,
        path: event.path,
        status: event.status
      },
      requestCount: 1,
      documentCount:
        role === "document" ? 1 : 0,
      assetCount:
        role === "asset" ? 1 : 0,
      backgroundCount:
        role === "background" ? 1 : 0,
      errorCount:
        event.status >= 500 ? 1 : 0,
      droppedRequestCount: 0,
      requests: [request]
    };
  }

  function addToGroup(group, event, role) {
    const request = {
      ...event,
      role
    };

    delete request.__demoLayer;

    group.updatedAt =
      event.receivedAt;

    group.requestCount += 1;

    if (role === "document") {
      group.documentCount += 1;
    } else if (role === "asset") {
      group.assetCount += 1;
    } else {
      group.backgroundCount += 1;
    }

    if (event.status >= 500) {
      group.errorCount += 1;
    }

    if (
      role === "document" ||
      (
        role === "background" &&
        !["GET", "HEAD"].includes(
          event.method
        )
      )
    ) {
      group.primaryRequest = {
        sequence: event.sequence,
        method: event.method,
        path: event.path,
        status: event.status
      };
    }

    group.requests.push(request);

    if (group.requests.length > 60) {
      group.requests.shift();
      group.droppedRequestCount += 1;
    }
  }

  function ingestSmart(event) {
    const role = eventRole(event);
    const key = groupKey(event);
    const now =
      Date.parse(event.receivedAt);

    const current =
      actorGroups.get(key);

    let group = null;

    if (current) {
      const candidate =
        smartGroups.get(
          current.groupId
        );

      if (
        candidate &&
        now - current.lastAt <= 10000 &&
        !(
          role === "document" &&
          now - current.lastDocumentAt >
            2800
        )
      ) {
        group = candidate;
      }
    }

    let created = false;

    if (!group) {
      group =
        makeGroup(
          event,
          role
        );

      smartGroups.set(
        group.id,
        group
      );

      created = true;
    } else {
      addToGroup(
        group,
        event,
        role
      );
    }

    actorGroups.set(
      key,
      {
        groupId: group.id,
        lastAt: now,
        lastDocumentAt:
          role === "document"
            ? now
            : (
                current?.lastDocumentAt ??
                now
              )
      }
    );

    while (smartGroups.size > 220) {
      const oldest =
        smartGroups.keys().next().value;

      if (!oldest) {
        break;
      }

      smartGroups.delete(oldest);
    }

    return {
      created,
      group: clone(group)
    };
  }

  function emitRequest(
    event,
    notify = true
  ) {
    if (!event) {
      return;
    }

    rawRequests.push(event);

    while (rawRequests.length > 420) {
      rawRequests.shift();
    }

    const smartUpdate =
      ingestSmart(event);

    if (notify) {
      const publicEvent = {
        ...event
      };

      delete publicEvent.__demoLayer;

      for (const callback of listeners.request) {
        callback(clone(publicEvent));
      }

      for (const callback of listeners.smart) {
        callback(clone(smartUpdate));
      }
    }
  }

  function seed() {
    const now = Date.now();

    for (let i = 0; i < 105; i += 1) {
      const age =
        59000 -
        Math.floor(
          i * (56000 / 104)
        );

      const receivedAt =
        new Date(now - age);

      const roll = Math.random();

      let layer =
        "human-like";

      let actor =
        random(actors.slice(0, 3));

      let path = null;
      let status = null;

      if (roll > .87 && roll <= .93) {
        layer = "bot";
        actor = actors[3];
      } else if (roll > .93 && roll <= .965) {
        layer = "security";
        actor = actors[4];
      } else if (roll > .965 && roll <= .985) {
        layer = "server";
      } else if (roll > .985) {
        layer = "error";
      }

      if (
        layer === "human-like" &&
        chance(.27)
      ) {
        path = random(assets);
      }

      if (
        layer === "human-like" &&
        chance(.16)
      ) {
        path = random(apiPaths);
      }

      if (layer === "error") {
        status = random([500, 502, 503]);
      }

      const event =
        makeRequest({
          layer,
          actor,
          path: path || undefined,
          status:
            status === null
              ? undefined
              : status,
          receivedAt
        });

      emitRequest(
        event,
        false
      );
    }
  }

  function emitHumanBurst() {
    const domains = activeDomains();

    if (domains.length === 0) {
      return;
    }

    const domain = random(domains);
    const actor = random(actors.slice(0, 3));

    const page =
      makeRequest({
        domain,
        actor,
        layer: "human-like",
        method: "GET",
        path: random(humanPaths)
      });

    emitRequest(page);

    if (chance(.72)) {
      window.setTimeout(
        () => {
          emitRequest(
            makeRequest({
              domain,
              actor,
              layer: "human-like",
              method: "GET",
              path: random(assets)
            })
          );
        },
        80 + Math.random() * 180
      );
    }

    if (chance(.46)) {
      window.setTimeout(
        () => {
          emitRequest(
            makeRequest({
              domain,
              actor,
              layer: "human-like",
              method: "GET",
              path: random(assets)
            })
          );
        },
        180 + Math.random() * 260
      );
    }

    if (chance(.19)) {
      window.setTimeout(
        () => {
          emitRequest(
            makeRequest({
              domain,
              actor,
              layer: "human-like",
              method: random(["POST", "PUT"]),
              path: random(apiPaths),
              status: random([200, 204])
            })
          );
        },
        320 + Math.random() * 420
      );
    }
  }

  function emitAutomation() {
    const roll = Math.random();

    if (roll < .48) {
      emitRequest(
        makeRequest({
          layer: "bot",
          actor: actors[3],
          method: "GET",
          path: random([
            "/robots.txt",
            "/sitemap.xml",
            "/products",
            "/docs"
          ])
        })
      );

      return;
    }

    if (roll < .78) {
      emitRequest(
        makeRequest({
          layer: "security",
          actor: actors[4],
          method: "GET",
          path: random(securityPaths),
          status: random([403, 404])
        })
      );

      return;
    }

    if (roll < .9) {
      emitRequest(
        makeRequest({
          layer: "server",
          actor: actors[5],
          method: "GET",
          path: "/api/health",
          status: 200
        })
      );

      return;
    }

    emitRequest(
      makeRequest({
        layer: "error",
        actor: random(actors.slice(0, 3)),
        method: "GET",
        path: random([
          "/api/v1/orders",
          "/checkout",
          "/api/v1/session"
        ]),
        status: random([500, 502, 503])
      })
    );
  }

  function scheduleTraffic() {
    const delay =
      430 +
      Math.floor(
        Math.random() * 1050
      );

    window.setTimeout(
      () => {
        if (chance(.82)) {
          emitHumanBurst();
        } else {
          emitAutomation();
        }

        scheduleTraffic();
      },
      delay
    );
  }

  function liveStatus() {
    return {
      state: "monitoring",
      attempt: 1,
      projectCount:
        activeDomains().length
    };
  }

  function startupProfile() {
    return (
      serverProfiles.find(
        (profile) =>
          profile.id ===
          preferences.defaultServerProfileId
      ) ||
      serverProfiles[0] ||
      {
        id: "demo-server",
        name: "Demo server",
        ssh: {
          host: "demo.example.com",
          port: 22,
          username: "demo",
          privateKeyPath:
            "C:\\Users\\demo\\.ssh\\id_ed25519",
          hostKeySha256:
            DEMO_FINGERPRINT
        },
        logs: {
          directory:
            "/var/log/nginx",
          pattern:
            "*.access.log",
          parser:
            "auto",
          projectNameSuffix:
            ".access.log"
        }
      }
    );
  }

  function syntheticLogs(directory) {
    const base =
      (
        directory ||
        "/var/log/nginx"
      ).replace(/\/+$/, "");

    return demoLogs.map(
      (log) => ({
        ...log,
        remotePath:
          `${base}/${log.fileName}`
      })
    );
  }

  seed();
  scheduleTraffic();

  const api = {
    async getAppInfo() {
      return {
        name:
          "QcY LiveLog Monitor",
        author:
          "QvarcY",
        authorLabel:
          "By QvarcY",
        githubUrl:
          "https://github.com/QvarcY/qcy-livelog-monitor",
        supportLabel:
          "Buy Me a Coffee",
        supportUrl:
          "https://buymeacoffee.com/craftin",
        version:
          "1.0.0-demo",
        platform:
          "web demo"
      };
    },

    async openBrandLink(kind) {
      const url =
        kind === "support"
          ? "https://buymeacoffee.com/craftin"
          : "https://github.com/QvarcY/qcy-livelog-monitor";

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      return true;
    },

    async getPreferences() {
      return clone(preferences);
    },

    async updatePreferences(patch) {
      preferences = {
        ...preferences,
        ...patch
      };

      return clone(preferences);
    },

    async setAlwaysOnTop(enabled) {
      preferences.alwaysOnTop =
        Boolean(enabled);

      return preferences.alwaysOnTop;
    },

    async updateStartupPreferences(patch) {
      preferences = {
        ...preferences,
        ...patch
      };

      return clone(preferences);
    },

    async bootstrapStartup() {
      await sleep(180);

      return {
        status: "ready",
        profile:
          clone(startupProfile()),
        logs:
          clone(syntheticLogs(
            startupProfile().logs.directory
          )),
        latencyMs: 38
      };
    },

    async rememberPassphrase(
      profileId,
      _passphrase
    ) {
      rememberedPassphrases.add(
        profileId
      );

      return true;
    },

    async forgetPassphrase(
      profileId
    ) {
      rememberedPassphrases.delete(
        profileId
      );

      return true;
    },

    async hasRememberedPassphrase(
      profileId
    ) {
      return rememberedPassphrases.has(
        profileId
      );
    },

    async listServerProfiles() {
      return clone(serverProfiles);
    },

    async saveServerProfile(input) {
      const id =
        String(
          input.id ||
          crypto.randomUUID()
        );

      const profile = {
        id,
        name:
          String(
            input.name ||
            "Demo server"
          ),
        ssh: {
          host:
            String(
              input.ssh?.host ||
              "demo.example.com"
            ),
          port:
            Number(
              input.ssh?.port ||
              22
            ),
          username:
            String(
              input.ssh?.username ||
              "demo"
            ),
          privateKeyPath:
            String(
              input.ssh?.privateKeyPath ||
              "C:\\Users\\demo\\.ssh\\id_ed25519"
            ),
          hostKeySha256:
            String(
              input.ssh?.hostKeySha256 ||
              DEMO_FINGERPRINT
            )
        },
        logs: {
          directory:
            String(
              input.logs?.directory ||
              "/var/log/nginx"
            ),
          pattern:
            String(
              input.logs?.pattern ||
              "*.access.log"
            ),
          parser:
            String(
              input.logs?.parser ||
              "auto"
            ),
          projectNameSuffix:
            String(
              input.logs?.projectNameSuffix ||
              ""
            )
        }
      };

      const index =
        serverProfiles.findIndex(
          (candidate) =>
            candidate.id === id
        );

      if (index >= 0) {
        serverProfiles[index] =
          profile;
      } else {
        serverProfiles.push(
          profile
        );
      }

      return clone(serverProfiles);
    },

    async deleteServerProfile(
      profileId
    ) {
      serverProfiles =
        serverProfiles.filter(
          (profile) =>
            profile.id !==
            profileId
        );

      rememberedPassphrases.delete(
        profileId
      );

      return clone(serverProfiles);
    },

    async selectPrivateKey() {
      await sleep(180);

      return (
        "C:\\Users\\demo\\.ssh\\" +
        "id_ed25519"
      );
    },

    async testSshConnection(
      ssh,
      _passphrase
    ) {
      await sleep(520);

      const host =
        String(
          ssh?.host ||
          "demo.example.com"
        );

      const username =
        String(
          ssh?.username ||
          "demo"
        );

      const port =
        Number(
          ssh?.port ||
          22
        );

      return {
        ok: true,
        target:
          `${username}@${host}:${port}`,
        latencyMs:
          28 +
          Math.floor(
            Math.random() * 35
          ),
        hostKeySha256:
          DEMO_FINGERPRINT,
        hostKeyTrusted:
          ssh?.hostKeySha256 ===
          DEMO_FINGERPRINT
      };
    },

    async discoverLogs(request) {
      await sleep(650);

      return clone(
        syntheticLogs(
          request?.logs?.directory
        )
      );
    },

    async setMonitoredProjects(
      domains
    ) {
      preferences.monitoredProjectDomains =
        domains === null
          ? null
          : [...domains];

      const status =
        liveStatus();

      for (
        const callback
        of listeners.status
      ) {
        callback(
          clone(status)
        );
      }

      return (
        preferences.monitoredProjectDomains ===
          null
          ? null
          : [
              ...preferences
                .monitoredProjectDomains
            ]
      );
    },

    async getLiveSnapshot() {
      return {
        status:
          clone(liveStatus()),
        requests:
          rawRequests.map(
            (event) => {
              const result = {
                ...event
              };

              delete result.__demoLayer;

              return result;
            }
          ),
        rotations:
          syntheticLogs(
            startupProfile().logs.directory
          ).map(
            (log) => ({
              domain:
                log.domain,
              state:
                "following",
              remotePath:
                log.remotePath
            })
          )
      };
    },

    onCollectorStatus(callback) {
      listeners.status.add(
        callback
      );

      return () => {
        listeners.status.delete(
          callback
        );
      };
    },

    onLiveRequest(callback) {
      listeners.request.add(
        callback
      );

      return () => {
        listeners.request.delete(
          callback
        );
      };
    },

    onLogRotation(callback) {
      listeners.rotation.add(
        callback
      );

      return () => {
        listeners.rotation.delete(
          callback
        );
      };
    },

    async getSmartSnapshot() {
      return [
        ...smartGroups.values()
      ].map(clone);
    },

    onSmartGroupUpdate(callback) {
      listeners.smart.add(
        callback
      );

      return () => {
        listeners.smart.delete(
          callback
        );
      };
    }
  };

  Object.defineProperty(
    window,
    "qcyLiveLog",
    {
      configurable: false,
      enumerable: true,
      writable: false,
      value:
        Object.freeze(api)
    }
  );

  function addDemoMarker() {
    const actions =
      document.querySelector(
        ".context-actions"
      );

    if (
      actions &&
      !document.getElementById(
        "qcy-demo-badge"
      )
    ) {
      const badge =
        document.createElement(
          "span"
        );

      badge.id =
        "qcy-demo-badge";

      badge.className =
        "qcy-demo-badge";

      badge.textContent =
        "DEMO";

      badge.title =
        "Interactive browser demo — synthetic data only, no SSH connection";

      actions.prepend(
        badge
      );
    }

    const breadcrumbs =
      document.querySelector(
        ".breadcrumbs"
      );

    if (
      breadcrumbs &&
      !document.getElementById(
        "qcy-demo-note"
      )
    ) {
      const note =
        document.createElement(
          "span"
        );

      note.id =
        "qcy-demo-note";

      note.className =
        "qcy-demo-note";

      note.textContent =
        "synthetic data · no SSH connection";

      breadcrumbs.append(
        note
      );
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      addDemoMarker,
      {
        once: true
      }
    );
  } else {
    addDemoMarker();
  }
})();