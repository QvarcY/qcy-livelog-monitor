const MAX_RAW_EVENTS = 300;
const ACTIVITY_WINDOW_SECONDS = 60;
let selectedTimelineSecond = null;
let monitoredProjectFilter = null;
let liveSearchQuery = "";
let liveUiPaused = false;
let liveSearchSuggestionIndex = -1;
let liveProjectViewFilter = null;
let liveTypeViewFilter = null;
let liveStatusViewFilter = null;
let openLiveToolbarFilter = null;
let selectedLiveDetail = null;
let activityTimer = null;
const ALL_LAYERS = [
    "human-like",
    "bot",
    "security",
    "server",
    "error",
    "unknown"
];
const rawRequests = new Map();
const smartGroups = new Map();
const expandedGroups = new Set();
const activeLayers = new Set(ALL_LAYERS);
let viewMode = "smart";
let renderScheduled = false;
let controlsReady = false;
const LIVE_FONT_STORAGE_KEY = "qcy-live-font-size";
const LIVE_FONT_ORDER = [
    "compact",
    "normal",
    "large"
];
function readLiveFontSize() {
    try {
        const stored = window.localStorage.getItem(LIVE_FONT_STORAGE_KEY);
        if (stored === "compact" ||
            stored === "normal" ||
            stored === "large") {
            return stored;
        }
    }
    catch {
        // UI preference only
    }
    return "normal";
}
let liveFontSize = readLiveFontSize();
const PROJECT_LABEL_STORAGE_KEY = "qcy-smart-project-labels";
function readProjectLabelsVisible() {
    try {
        return (window.localStorage.getItem(PROJECT_LABEL_STORAGE_KEY) !== "collapsed");
    }
    catch {
        return true;
    }
}
let projectLabelsVisible = readProjectLabelsVisible();
function applyProjectLabels() {
    document.documentElement
        .dataset.smartProjectLabels =
        projectLabelsVisible
            ? "visible"
            : "collapsed";
    try {
        window.localStorage.setItem(PROJECT_LABEL_STORAGE_KEY, projectLabelsVisible
            ? "visible"
            : "collapsed");
    }
    catch {
        // UI preference only
    }
    const button = document.getElementById("smart-project-label-toggle");
    if (button instanceof
        HTMLButtonElement) {
        button.classList.toggle("is-active", projectLabelsVisible);
        button.setAttribute("aria-pressed", String(projectLabelsVisible));
    }
}
function applyLiveFontSize() {
    document.documentElement
        .dataset.liveFontSize =
        liveFontSize;
    try {
        window.localStorage.setItem(LIVE_FONT_STORAGE_KEY, liveFontSize);
    }
    catch {
        // UI preference only
    }
    const value = document.getElementById("live-font-value");
    if (value) {
        value.textContent =
            liveFontSize === "compact"
                ? "90%"
                : liveFontSize === "large"
                    ? "115%"
                    : "100%";
    }
}
function changeLiveFontSize(direction) {
    const currentIndex = LIVE_FONT_ORDER.indexOf(liveFontSize);
    const nextIndex = Math.max(0, Math.min(LIVE_FONT_ORDER.length - 1, currentIndex + direction));
    liveFontSize =
        LIVE_FONT_ORDER[nextIndex] ?? "normal";
    applyLiveFontSize();
}
function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing live UI element: ${id}`);
    }
    return element;
}
function currentLanguage() {
    const htmlLanguage = document.documentElement
        .lang
        .toLowerCase();
    if (htmlLanguage.startsWith("lv")) {
        return "lv";
    }
    const heading = document.querySelector(".events-header strong")?.textContent ??
        "";
    return heading.includes("Tieš")
        ? "lv"
        : "en";
}
function labels() {
    const language = currentLanguage();
    if (language === "lv") {
        return {
            smartTitle: "Viedā aktivitāte",
            rawTitle: "Tiešie pieprasījumi",
            smart: "Smart",
            raw: "Raw",
            layers: "Slāņi",
            projectLabels: "Adreses",
            projectLabelsTitle: "Rādīt vai paslēpt projektu adreses",
            activity: "Aktivitāte",
            requestVolume: "pieprasījumu apjoms",
            last60: "pēdējās 60s",
            peak: "pīķis",
            selectedSecond: "atlasīta sekunde",
            clearSecond: "Noņemt sekundes filtru",
            time: "Laiks",
            smartActivity: "Projekts / aktivitāte",
            rawRequest: "Projekts / pieprasījums",
            layer: "Slānis",
            type: "Tips",
            status: "Statuss",
            requests: "Pieprasījumi",
            delay: "Aizture",
            groups: "grupas",
            requestsCount: "pieprasījumi",
            noSmart: "Viedo aktivitāšu vēl nav",
            noSmartHelp: "Saistītie requesti tiks apvienoti vienā aktivitātes grupā.",
            noRaw: "Pieprasījumu vēl nav",
            noRawHelp: "Ienākošie access log ieraksti šeit parādīsies reāllaikā.",
            showRequests: "Rādīt requestus",
            hideRequests: "Paslēpt requestus",
            humanLike: "Iesp. apmeklētājs",
            bot: "Bots",
            security: "Drošība",
            server: "Serveris",
            error: "Kļūda",
            unknown: "Nezināms",
            pages: "lapas",
            actions: "darbības",
            assets: "resursi",
            background: "fona",
            errors: "kļūdas"
        };
    }
    return {
        smartTitle: "Smart activity",
        rawTitle: "Live requests",
        smart: "Smart",
        raw: "Raw",
        layers: "Layers",
        projectLabels: "Domains",
        projectLabelsTitle: "Show or hide project domains",
        activity: "Activity",
        requestVolume: "request volume",
        last60: "last 60s",
        peak: "peak",
        selectedSecond: "selected second",
        clearSecond: "Clear second filter",
        time: "Time",
        smartActivity: "Project / activity",
        rawRequest: "Project / request",
        layer: "Layer",
        type: "Type",
        status: "Status",
        requests: "Requests",
        delay: "Delay",
        groups: "groups",
        requestsCount: "requests",
        noSmart: "No smart activity yet",
        noSmartHelp: "Related requests will be grouped into activity sessions.",
        noRaw: "No requests yet",
        noRawHelp: "Incoming access-log entries will appear here in real time.",
        showRequests: "Show requests",
        hideRequests: "Hide requests",
        humanLike: "Human-like",
        bot: "Bot",
        security: "Security",
        server: "Server",
        error: "Error",
        unknown: "Unknown",
        pages: "pages",
        actions: "actions",
        assets: "assets",
        background: "background",
        errors: "errors"
    };
}
function layerLabel(layer) {
    const text = labels();
    switch (layer) {
        case "human-like":
            return text.humanLike;
        case "bot":
            return text.bot;
        case "security":
            return text.security;
        case "server":
            return text.server;
        case "error":
            return text.error;
        case "unknown":
            return text.unknown;
    }
}
function formatClock(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return "--:--:--";
    }
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}
function formatDelay(delayMs) {
    if (delayMs === null ||
        !Number.isFinite(delayMs)) {
        return "—";
    }
    if (delayMs < 1000) {
        return `${Math.round(delayMs)}ms`;
    }
    return `${(delayMs /
        1000).toFixed(1)}s`;
}
function hashDomain(domain) {
    let hash = 2166136261;
    for (let index = 0; index < domain.length; index += 1) {
        hash ^=
            domain.charCodeAt(index);
        hash =
            Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function projectHue(domain) {
    return (hashDomain(domain) %
        360);
}
function projectMonogram(domain) {
    const value = domain
        .trim()
        .replace(/^www\./iu, "");
    const match = value.match(/[a-z0-9]/iu);
    return (match?.[0] ??
        "?").toUpperCase();
}
function createEmptyState(title, help) {
    const empty = document.createElement("div");
    empty.className =
        "empty-event";
    const mark = document.createElement("span");
    mark.className =
        "empty-event-mark";
    mark.textContent =
        "↳";
    const copy = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent =
        title;
    const paragraph = document.createElement("p");
    paragraph.textContent =
        help;
    copy.append(strong, paragraph);
    empty.append(mark, copy);
    return empty;
}
function isMonitoredProject(domain) {
    return (monitoredProjectFilter ===
        null ||
        monitoredProjectFilter.has(domain
            .trim()
            .toLowerCase()));
}
function handleProjectFilterEvent(event) {
    const custom = event;
    const domains = custom.detail
        ?.domains;
    if (domains === null) {
        monitoredProjectFilter =
            null;
    }
    else if (Array.isArray(domains)) {
        monitoredProjectFilter =
            new Set(domains.map(domain => domain
                .trim()
                .toLowerCase()));
    }
    else {
        return;
    }
    selectedTimelineSecond =
        null;
    renderCurrentView();
}
function eventSecond(iso) {
    const milliseconds = Date.parse(iso);
    if (!Number.isFinite(milliseconds)) {
        return null;
    }
    return Math.floor(milliseconds /
        1000);
}
function createActivityBucket(second) {
    return {
        second,
        total: 0,
        counts: {
            "human-like": 0,
            bot: 0,
            security: 0,
            server: 0,
            error: 0,
            unknown: 0
        }
    };
}
function buildActivityBuckets() {
    const nowSecond = Math.floor(Date.now() /
        1000);
    const firstSecond = nowSecond -
        ACTIVITY_WINDOW_SECONDS +
        1;
    if (selectedTimelineSecond !== null &&
        (selectedTimelineSecond <
            firstSecond ||
            selectedTimelineSecond >
                nowSecond)) {
        selectedTimelineSecond =
            null;
    }
    const buckets = Array.from({
        length: ACTIVITY_WINDOW_SECONDS
    }, (_, index) => createActivityBucket(firstSecond +
        index));
    const bySecond = new Map(buckets.map(bucket => [
        bucket.second,
        bucket
    ]));
    for (const group of smartGroups.values()) {
        if (!isMonitoredProject(group.domain) ||
            !activeLayers.has(group.layer)) {
            continue;
        }
        for (const request of group.requests) {
            const second = eventSecond(request.receivedAt);
            if (second === null) {
                continue;
            }
            const bucket = bySecond.get(second);
            if (!bucket) {
                continue;
            }
            bucket.total +=
                1;
            bucket.counts[group.layer] += 1;
        }
    }
    return buckets;
}
function formatTimelineTime(second) {
    return new Date(second *
        1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}
function activityTooltip(bucket) {
    const lines = [
        `${formatTimelineTime(bucket.second)} · ${bucket.total} req`
    ];
    for (const layer of ALL_LAYERS) {
        const count = bucket.counts[layer];
        if (count === 0) {
            continue;
        }
        lines.push(`${layerLabel(layer)}: ${count}`);
    }
    return lines.join("\n");
}
function groupTouchesSecond(group, second) {
    return group.requests.some(request => eventSecond(request.receivedAt) === second);
}
function requestTouchesSelectedSecond(event) {
    if (selectedTimelineSecond ===
        null) {
        return true;
    }
    return (eventSecond(event.receivedAt) ===
        selectedTimelineSecond);
}
function createActivityTimeline() {
    const activity = document.querySelector(".activity");
    if (!activity) {
        throw new Error("Missing activity section.");
    }
    activity.replaceChildren();
    const header = document.createElement("div");
    header.className =
        "activity-header";
    const heading = document.createElement("div");
    const strong = document.createElement("strong");
    strong.id =
        "live-activity-title";
    const description = document.createElement("span");
    description.id =
        "live-activity-description";
    heading.append(strong, description);
    const range = document.createElement("div");
    range.id =
        "live-activity-range";
    range.className =
        "activity-range";
    header.append(heading, range);
    const chart = document.createElement("div");
    chart.className =
        "live-activity-chart";
    const legend = document.createElement("div");
    legend.className =
        "live-activity-legend";
    legend.id =
        "live-activity-legend";
    const bars = document.createElement("div");
    bars.id =
        "live-activity-bars";
    bars.className =
        "live-activity-bars";
    const selection = document.createElement("button");
    selection.id =
        "live-activity-selection";
    selection.type =
        "button";
    selection.className =
        "live-activity-selection";
    selection.hidden =
        true;
    selection.addEventListener("click", () => {
        selectedTimelineSecond =
            null;
        renderCurrentView();
    });
    chart.append(legend, bars, selection);
    activity.append(header, chart);
}
function toggleActivityLayer(layer) {
    if (activeLayers.has(layer)) {
        activeLayers.delete(layer);
    }
    else {
        activeLayers.add(layer);
    }
    const option = document.querySelector(`.smart-layer-option[data-layer="${layer}"]`);
    const input = option?.querySelector('input[type="checkbox"]');
    if (input) {
        input.checked =
            activeLayers.has(layer);
    }
    updateLayerButton();
    renderCurrentView();
}
function renderActivityLegend() {
    const legend = document.getElementById("live-activity-legend");
    if (!legend) {
        return;
    }
    legend.replaceChildren();
    for (const layer of ALL_LAYERS) {
        const button = document.createElement("button");
        button.type =
            "button";
        button.className =
            "live-activity-legend-item";
        button.dataset.layer =
            layer;
        button.classList.toggle("is-disabled", !activeLayers.has(layer));
        button.title =
            layerLabel(layer);
        const dot = document.createElement("span");
        dot.className =
            "live-activity-legend-dot";
        const text = document.createElement("span");
        text.textContent =
            layerLabel(layer);
        button.append(dot, text);
        button.addEventListener("click", () => {
            toggleActivityLayer(layer);
        });
        legend.append(button);
    }
}
function renderActivityTimeline() {
    if (liveUiPaused) {
        return;
    }
    const bars = document.getElementById("live-activity-bars");
    if (!bars) {
        return;
    }
    const text = labels();
    const title = document.getElementById("live-activity-title");
    const description = document.getElementById("live-activity-description");
    const range = document.getElementById("live-activity-range");
    if (title) {
        title.textContent =
            text.activity;
    }
    if (description) {
        description.textContent =
            text.requestVolume;
    }
    const buckets = buildActivityBuckets();
    const total = buckets.reduce((sum, bucket) => sum +
        bucket.total, 0);
    const peak = Math.max(0, ...buckets.map(bucket => bucket.total));
    if (range) {
        range.textContent =
            `${text.last60} · ${total} req · ${text.peak} ${peak}/s`;
    }
    const selection = document.getElementById("live-activity-selection");
    if (selection instanceof
        HTMLButtonElement) {
        if (selectedTimelineSecond ===
            null) {
            selection.hidden =
                true;
        }
        else {
            selection.hidden =
                false;
            selection.textContent =
                `${text.selectedSecond}: ${formatTimelineTime(selectedTimelineSecond)} ×`;
            selection.title =
                text.clearSecond;
        }
    }
    renderActivityLegend();
    bars.replaceChildren();
    const maxVisual = Math.max(1, peak);
    const lastIndex = buckets.length -
        1;
    for (let index = 0; index < buckets.length; index += 1) {
        const bucket = buckets[index];
        const button = document.createElement("button");
        button.type =
            "button";
        button.className =
            "live-activity-bucket";
        button.dataset.total =
            String(bucket.total);
        button.title =
            activityTooltip(bucket);
        if (index === lastIndex) {
            button.classList.add("is-live");
        }
        if (selectedTimelineSecond ===
            bucket.second) {
            button.classList.add("is-selected");
        }
        const scaled = bucket.total === 0
            ? 5
            : Math.max(10, Math.round((Math.sqrt(bucket.total) /
                Math.sqrt(maxVisual)) *
                100));
        const stack = document.createElement("span");
        stack.className =
            "live-activity-stack";
        stack.style.height =
            `${scaled}%`;
        if (bucket.total === 0) {
            const empty = document.createElement("span");
            empty.className =
                "live-activity-empty";
            stack.append(empty);
        }
        else {
            for (const layer of ALL_LAYERS) {
                const count = bucket.counts[layer];
                if (count === 0) {
                    continue;
                }
                const segment = document.createElement("span");
                segment.className =
                    "live-activity-segment";
                segment.dataset.layer =
                    layer;
                segment.style.flexGrow =
                    String(count);
                stack.append(segment);
            }
        }
        button.append(stack);
        button.addEventListener("click", () => {
            selectedTimelineSecond =
                selectedTimelineSecond ===
                    bucket.second
                    ? null
                    : bucket.second;
            renderCurrentView();
        });
        bars.append(button);
    }
}
function startActivityClock() {
    if (activityTimer !==
        null) {
        return;
    }
    activityTimer =
        window.setInterval(() => {
            renderActivityTimeline();
        }, 1000);
}
function trimRawBuffer() {
    while (rawRequests.size >
        MAX_RAW_EVENTS) {
        const oldest = [...rawRequests.keys()]
            .sort((left, right) => left - right)[0];
        if (oldest === undefined) {
            return;
        }
        rawRequests.delete(oldest);
    }
}
function recordRawRequest(event) {
    rawRequests.set(event.sequence, event);
    trimRawBuffer();
    requireElement("status-delay").textContent =
        `delay ${formatDelay(event.observedDelayMs)}`;
    scheduleRender();
}
function recordSmartGroup(update) {
    smartGroups.set(update.group.id, update.group);
    scheduleRender();
}
function setHeaderColumns(values) {
    const columns = [
        ...document.querySelectorAll(".event-columns > span")
    ];
    for (let index = 0; index < columns.length; index += 1) {
        const column = columns[index];
        const value = values[index];
        if (!column ||
            value === undefined) {
            continue;
        }
        column.removeAttribute("data-i18n");
        column.textContent =
            value;
    }
}
function updateCounter(value) {
    const header = requireElement("event-count");
    const footer = requireElement("status-event-count");
    header.removeAttribute("data-i18n");
    footer.removeAttribute("data-i18n");
    header.textContent =
        value;
    footer.textContent =
        value;
}
function updateLayerButton() {
    const button = document.getElementById("smart-layer-toggle");
    if (!(button instanceof HTMLButtonElement)) {
        return;
    }
    const text = labels();
    button.textContent =
        `${text.layers} ${activeLayers.size}/${ALL_LAYERS.length}`;
}
function updateViewControls() {
    const smart = document.getElementById("smart-view-toggle");
    const raw = document.getElementById("raw-view-toggle");
    if (smart instanceof HTMLButtonElement) {
        smart.classList.toggle("is-active", viewMode === "smart");
        smart.setAttribute("aria-pressed", String(viewMode === "smart"));
    }
    if (raw instanceof HTMLButtonElement) {
        raw.classList.toggle("is-active", viewMode === "raw");
        raw.setAttribute("aria-pressed", String(viewMode === "raw"));
    }
    const layers = document.getElementById("smart-layer-wrap");
    layers?.classList.toggle("is-hidden", viewMode !== "smart");
}
function updatePresentation() {
    const text = labels();
    const heading = document.querySelector(".events-header strong");
    if (heading) {
        heading.removeAttribute("data-i18n");
        heading.textContent =
            viewMode === "smart"
                ? text.smartTitle
                : text.rawTitle;
    }
    setHeaderColumns(viewMode === "smart"
        ? [
            text.time,
            text.smartActivity,
            text.layer,
            text.status,
            text.requests
        ]
        : [
            text.time,
            text.rawRequest,
            text.type,
            text.status,
            text.delay
        ]);
    const smartButton = document.getElementById("smart-view-toggle");
    const rawButton = document.getElementById("raw-view-toggle");
    if (smartButton instanceof
        HTMLButtonElement) {
        smartButton.textContent =
            text.smart;
    }
    if (rawButton instanceof
        HTMLButtonElement) {
        rawButton.textContent =
            text.raw;
    }
    updateLayerButton();
    const projectLabelsButton = document.getElementById("smart-project-label-toggle");
    if (projectLabelsButton instanceof
        HTMLButtonElement) {
        projectLabelsButton.textContent =
            text.projectLabels;
        projectLabelsButton.title =
            text.projectLabelsTitle;
    }
    applyProjectLabels();
    updateViewControls();
}
function setViewMode(mode) {
    if (viewMode === mode) {
        return;
    }
    viewMode =
        mode;
    const menu = document.getElementById("smart-layer-menu");
    menu?.classList.remove("is-open");
    const layerButton = document.getElementById("smart-layer-toggle");
    layerButton?.setAttribute("aria-expanded", "false");
    renderCurrentView();
}
function createViewControls() {
    if (controlsReady) {
        return;
    }
    const actions = document.querySelector(".events-actions");
    if (!actions) {
        throw new Error("Missing events actions container.");
    }
    const firstExisting = actions.firstElementChild;
    const switcher = document.createElement("div");
    switcher.className =
        "smart-view-switch";
    switcher.setAttribute("role", "group");
    const smart = document.createElement("button");
    smart.id =
        "smart-view-toggle";
    smart.type =
        "button";
    smart.className =
        "smart-view-button";
    smart.addEventListener("click", () => {
        setViewMode("smart");
    });
    const raw = document.createElement("button");
    raw.id =
        "raw-view-toggle";
    raw.type =
        "button";
    raw.className =
        "smart-view-button";
    raw.addEventListener("click", () => {
        setViewMode("raw");
    });
    switcher.append(smart, raw);
    const fontControls = document.createElement("div");
    fontControls.className =
        "smart-font-controls";
    const fontDown = document.createElement("button");
    fontDown.type =
        "button";
    fontDown.className =
        "smart-font-button";
    fontDown.textContent =
        "A−";
    fontDown.title =
        "Mazāks teksts / Smaller text";
    fontDown.addEventListener("click", () => {
        changeLiveFontSize(-1);
    });
    const fontValue = document.createElement("button");
    fontValue.id =
        "live-font-value";
    fontValue.type =
        "button";
    fontValue.className =
        "smart-font-value";
    fontValue.title =
        "Atjaunot teksta izmēru / Reset text size";
    fontValue.addEventListener("click", () => {
        liveFontSize =
            "normal";
        applyLiveFontSize();
    });
    const fontUp = document.createElement("button");
    fontUp.type =
        "button";
    fontUp.className =
        "smart-font-button";
    fontUp.textContent =
        "A+";
    fontUp.title =
        "Lielāks teksts / Larger text";
    fontUp.addEventListener("click", () => {
        changeLiveFontSize(1);
    });
    fontControls.append(fontDown, fontValue, fontUp);
    const projectLabelsToggle = document.createElement("button");
    projectLabelsToggle.id =
        "smart-project-label-toggle";
    projectLabelsToggle.type =
        "button";
    projectLabelsToggle.className =
        "smart-project-label-toggle";
    projectLabelsToggle.addEventListener("click", () => {
        projectLabelsVisible =
            !projectLabelsVisible;
        applyProjectLabels();
    });
    const layerWrap = document.createElement("div");
    layerWrap.id =
        "smart-layer-wrap";
    layerWrap.className =
        "smart-layer-wrap";
    const layerToggle = document.createElement("button");
    layerToggle.id =
        "smart-layer-toggle";
    layerToggle.type =
        "button";
    layerToggle.className =
        "smart-layer-toggle";
    layerToggle.setAttribute("aria-expanded", "false");
    const menu = document.createElement("div");
    menu.id =
        "smart-layer-menu";
    menu.className =
        "smart-layer-menu";
    for (const layer of ALL_LAYERS) {
        const option = document.createElement("label");
        option.className =
            "smart-layer-option";
        option.dataset.layer =
            layer;
        const input = document.createElement("input");
        input.type =
            "checkbox";
        input.checked =
            true;
        input.addEventListener("change", () => {
            if (input.checked) {
                activeLayers.add(layer);
            }
            else {
                activeLayers.delete(layer);
            }
            updateLayerButton();
            scheduleRender();
        });
        const dot = document.createElement("span");
        dot.className =
            "smart-layer-dot";
        const label = document.createElement("span");
        label.className =
            "smart-layer-label";
        label.textContent =
            layerLabel(layer);
        option.append(input, dot, label);
        menu.append(option);
    }
    const closeLayerMenu = () => {
        menu.classList.remove("is-open");
        layerToggle.setAttribute("aria-expanded", "false");
    };
    const positionLayerMenu = () => {
        const buttonRect = layerToggle
            .getBoundingClientRect();
        const margin = 8;
        const gap = 5;
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        let left = buttonRect.right -
            menuWidth;
        left =
            Math.max(margin, Math.min(left, window.innerWidth -
                menuWidth -
                margin));
        let top = buttonRect.bottom +
            gap;
        if (top +
            menuHeight >
            window.innerHeight -
                margin) {
            top =
                Math.max(margin, buttonRect.top -
                    menuHeight -
                    gap);
        }
        menu.style.left =
            `${Math.round(left)}px`;
        menu.style.top =
            `${Math.round(top)}px`;
    };
    layerToggle.addEventListener("click", event => {
        event.stopPropagation();
        const shouldOpen = !menu.classList.contains("is-open");
        closeLayerMenu();
        if (shouldOpen) {
            menu.classList.add("is-open");
            layerToggle.setAttribute("aria-expanded", "true");
            positionLayerMenu();
        }
    });
    menu.addEventListener("click", event => {
        event.stopPropagation();
    });
    layerWrap.append(layerToggle);
    document.body.append(menu);
    if (firstExisting) {
        actions.insertBefore(switcher, firstExisting);
        actions.insertBefore(layerWrap, firstExisting);
        actions.insertBefore(fontControls, firstExisting);
        actions.insertBefore(projectLabelsToggle, firstExisting);
    }
    else {
        actions.append(switcher, layerWrap, fontControls, projectLabelsToggle);
    }
    document.addEventListener("click", closeLayerMenu);
    window.addEventListener("resize", closeLayerMenu);
    window.addEventListener("blur", closeLayerMenu);
    document.addEventListener("scroll", closeLayerMenu, true);
    controlsReady =
        true;
    applyLiveFontSize();
    applyProjectLabels();
    updatePresentation();
}
function createRawRow(event) {
    const row = document.createElement("div");
    row.className =
        "event-row";
    row.dataset.sequence =
        String(event.sequence);
    row.tabIndex =
        0;
    const time = document.createElement("span");
    time.textContent =
        formatClock(event.receivedAt);
    const request = document.createElement("span");
    request.textContent =
        `${event.domain} · ${event.method} ${event.path}`;
    request.title =
        [
            event.domain,
            `${event.method} ${event.path}`,
            event.ip,
            event.userAgent
        ].join("\n");
    const type = document.createElement("span");
    type.textContent =
        event.category ===
            "VISITOR"
            ? "UNCLASSIFIED"
            : event.category;
    const status = document.createElement("span");
    status.textContent =
        String(event.status);
    const delay = document.createElement("span");
    delay.textContent =
        formatDelay(event.observedDelayMs);
    row.append(time, request, type, status, delay);
    return row;
}
function liveToolbarFilterButton(kind) {
    const key = kind === "project"
        ? "filterProject"
        : kind === "type"
            ? "filterType"
            : "filterStatus";
    const label = document.querySelector(`[data-i18n="${key}"]`);
    const button = label?.closest("button");
    if (!button) {
        throw new Error(`Toolbar filter button missing: ${kind}`);
    }
    return button;
}
function liveToolbarFilterSelection(kind) {
    if (kind === "project") {
        return liveProjectViewFilter;
    }
    if (kind === "type") {
        return liveTypeViewFilter;
    }
    return liveStatusViewFilter;
}
function setLiveToolbarFilterSelection(kind, value) {
    if (kind === "project") {
        liveProjectViewFilter =
            value;
    }
    else if (kind === "type") {
        liveTypeViewFilter =
            value;
    }
    else {
        liveStatusViewFilter =
            value;
    }
    selectedTimelineSecond =
        null;
    closeLiveToolbarFilterMenu();
    renderCurrentView();
}
function rawRequestMatchesToolbarFilters(event) {
    if (liveProjectViewFilter !== null &&
        event.domain !==
            liveProjectViewFilter) {
        return false;
    }
    if (liveTypeViewFilter !== null &&
        String(event.category) !==
            liveTypeViewFilter) {
        return false;
    }
    if (liveStatusViewFilter !== null &&
        String(event.status) !==
            liveStatusViewFilter) {
        return false;
    }
    return true;
}
function smartGroupMatchesToolbarFilters(group) {
    if (liveProjectViewFilter !== null &&
        group.domain !==
            liveProjectViewFilter) {
        return false;
    }
    if (liveTypeViewFilter !== null &&
        String(group.layer) !==
            liveTypeViewFilter) {
        return false;
    }
    if (liveStatusViewFilter !== null &&
        !group.requests.some(request => String(request.status) ===
            liveStatusViewFilter)) {
        return false;
    }
    return true;
}
function collectLiveToolbarFilterOptions(kind) {
    const counts = new Map();
    const add = (value) => {
        const normalized = String(value ?? "").trim();
        if (!normalized) {
            return;
        }
        counts.set(normalized, (counts.get(normalized) ??
            0) + 1);
    };
    if (viewMode === "raw") {
        for (const event of rawRequests.values()) {
            if (!isMonitoredProject(event.domain)) {
                continue;
            }
            if (kind === "project") {
                add(event.domain);
            }
            else if (kind === "type") {
                add(event.category);
            }
            else {
                add(event.status);
            }
        }
    }
    else {
        for (const group of smartGroups.values()) {
            if (!isMonitoredProject(group.domain)) {
                continue;
            }
            if (kind === "project") {
                add(group.domain);
            }
            else if (kind === "type") {
                add(group.layer);
            }
            else {
                const seenStatuses = new Set(group.requests.map(request => String(request.status)));
                for (const status of seenStatuses) {
                    add(status);
                }
            }
        }
    }
    return [...counts.entries()]
        .map(([value, count]) => ({
        value,
        count
    }))
        .sort((left, right) => {
        if (kind === "status") {
            return (Number(left.value) -
                Number(right.value));
        }
        return left.value
            .localeCompare(right.value);
    });
}
function liveToolbarFilterDefaultLabel(kind) {
    const lv = isLatvianUi();
    if (kind === "project") {
        return lv
            ? "Projekts"
            : "Project";
    }
    if (kind === "type") {
        return lv
            ? "Tips"
            : "Type";
    }
    return lv
        ? "Statuss"
        : "Status";
}
function liveToolbarFilterAllLabel(kind) {
    const lv = isLatvianUi();
    if (kind === "project") {
        return lv
            ? "Visi projekti"
            : "All projects";
    }
    if (kind === "type") {
        return lv
            ? "Visi tipi"
            : "All types";
    }
    return lv
        ? "Visi statusi"
        : "All statuses";
}
function displayLiveToolbarFilterValue(kind, value) {
    if (kind === "type" &&
        viewMode === "smart") {
        const values = {
            "human-like": "Human-like",
            bot: "Bot",
            security: "Security",
            server: "Server",
            error: "Error",
            unknown: "Unknown"
        };
        return (values[value] ??
            value);
    }
    return value;
}
function updateLiveToolbarFilterButtons() {
    const kinds = [
        "project",
        "type",
        "status"
    ];
    for (const kind of kinds) {
        const button = liveToolbarFilterButton(kind);
        button.disabled =
            false;
        button.removeAttribute("aria-disabled");
        const selected = liveToolbarFilterSelection(kind);
        button.classList.toggle("is-active", selected !== null);
        button.setAttribute("aria-expanded", String(openLiveToolbarFilter ===
            kind));
        const label = button.querySelector("[data-i18n]");
        if (label) {
            label.textContent =
                selected === null
                    ? liveToolbarFilterDefaultLabel(kind)
                    : displayLiveToolbarFilterValue(kind, selected);
        }
        button.title =
            selected === null
                ? liveToolbarFilterDefaultLabel(kind)
                : `${liveToolbarFilterDefaultLabel(kind)}: ${displayLiveToolbarFilterValue(kind, selected)}`;
    }
}
function normalizeLiveToolbarFilterSelections() {
    const kinds = [
        "project",
        "type",
        "status"
    ];
    for (const kind of kinds) {
        const selected = liveToolbarFilterSelection(kind);
        if (selected ===
            null) {
            continue;
        }
        const available = collectLiveToolbarFilterOptions(kind)
            .some(option => option.value ===
            selected);
        if (!available) {
            if (kind === "project") {
                liveProjectViewFilter =
                    null;
            }
            else if (kind === "type") {
                liveTypeViewFilter =
                    null;
            }
            else {
                liveStatusViewFilter =
                    null;
            }
        }
    }
}
function ensureLiveToolbarFilterMenu() {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) {
        throw new Error("Toolbar container is missing.");
    }
    let menu = toolbar.querySelector(".live-toolbar-filter-menu");
    if (!menu) {
        menu =
            document.createElement("div");
        menu.className =
            "live-toolbar-filter-menu";
        menu.hidden =
            true;
        menu.setAttribute("role", "menu");
        toolbar.append(menu);
    }
    return menu;
}
function closeLiveToolbarFilterMenu() {
    const menu = document.querySelector(".live-toolbar-filter-menu");
    if (menu) {
        menu.hidden =
            true;
        menu.replaceChildren();
    }
    openLiveToolbarFilter =
        null;
    updateLiveToolbarFilterButtons();
}
function renderLiveToolbarFilterMenu(kind) {
    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) {
        return;
    }
    closeLiveSearchSuggestions();
    const menu = ensureLiveToolbarFilterMenu();
    const button = liveToolbarFilterButton(kind);
    const toolbarRect = toolbar.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const width = Math.max(190, buttonRect.width);
    let left = buttonRect.left -
        toolbarRect.left;
    left =
        Math.min(left, Math.max(8, toolbar.clientWidth -
            width -
            8));
    menu.style.left =
        `${Math.max(8, left)}px`;
    menu.style.width =
        `${width}px`;
    menu.replaceChildren();
    const heading = document.createElement("div");
    heading.className =
        "live-toolbar-filter-heading";
    heading.textContent =
        liveToolbarFilterDefaultLabel(kind);
    menu.append(heading);
    const selected = liveToolbarFilterSelection(kind);
    const appendOption = (value, label, count) => {
        const option = document.createElement("button");
        option.type =
            "button";
        option.className =
            "live-toolbar-filter-option";
        const active = value ===
            selected;
        option.classList.toggle("is-selected", active);
        option.setAttribute("aria-checked", String(active));
        const text = document.createElement("span");
        text.textContent =
            label;
        option.append(text);
        if (typeof count ===
            "number") {
            const badge = document.createElement("span");
            badge.className =
                "live-toolbar-filter-count";
            badge.textContent =
                String(count);
            option.append(badge);
        }
        option.addEventListener("click", event => {
            event.stopPropagation();
            setLiveToolbarFilterSelection(kind, value);
        });
        menu.append(option);
    };
    appendOption(null, liveToolbarFilterAllLabel(kind));
    const options = collectLiveToolbarFilterOptions(kind);
    for (const option of options) {
        appendOption(option.value, displayLiveToolbarFilterValue(kind, option.value), option.count);
    }
    if (options.length ===
        0) {
        const empty = document.createElement("div");
        empty.className =
            "live-toolbar-filter-empty";
        empty.textContent =
            isLatvianUi()
                ? "Šajā sesijā vēl nav vērtību."
                : "No values in this session yet.";
        menu.append(empty);
    }
    menu.hidden =
        false;
    openLiveToolbarFilter =
        kind;
    updateLiveToolbarFilterButtons();
}
function setupLiveToolbarFilters() {
    const kinds = [
        "project",
        "type",
        "status"
    ];
    for (const kind of kinds) {
        const button = liveToolbarFilterButton(kind);
        button.disabled =
            false;
        button.removeAttribute("aria-disabled");
        button.setAttribute("aria-haspopup", "menu");
        button.addEventListener("click", event => {
            event.stopPropagation();
            if (openLiveToolbarFilter ===
                kind) {
                closeLiveToolbarFilterMenu();
                return;
            }
            renderLiveToolbarFilterMenu(kind);
        });
    }
    document.addEventListener("click", event => {
        const target = event.target;
        if (target instanceof
            Element &&
            target.closest(".live-toolbar-filter-menu")) {
            return;
        }
        closeLiveToolbarFilterMenu();
    });
    window.addEventListener("blur", closeLiveToolbarFilterMenu);
    window.addEventListener("resize", closeLiveToolbarFilterMenu);
    updateLiveToolbarFilterButtons();
}
function normalizedLiveSearch(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}
function rawRequestMatchesSearch(event) {
    const query = normalizedLiveSearch(liveSearchQuery);
    if (!query) {
        return true;
    }
    return [
        event.domain,
        event.category,
        event.ip,
        event.method,
        event.path,
        event.protocol,
        event.status,
        event.bytes,
        event.referer,
        event.userAgent
    ]
        .map(normalizedLiveSearch)
        .join("\n")
        .includes(query);
}
function smartGroupMatchesSearch(group) {
    const query = normalizedLiveSearch(liveSearchQuery);
    if (!query) {
        return true;
    }
    if ([
        group.domain,
        group.layer
    ]
        .map(normalizedLiveSearch)
        .join("\n")
        .includes(query)) {
        return true;
    }
    return group.requests.some(request => [
        request.ip,
        request.method,
        request.path,
        request.role,
        request.status,
        request.referer,
        request.userAgent
    ]
        .map(normalizedLiveSearch)
        .join("\n")
        .includes(query));
}
function isLatvianUi() {
    return document
        .documentElement
        .lang
        .toLowerCase()
        .startsWith("lv");
}
function updatePauseButton() {
    const pause = document.querySelector(".pause-button");
    if (!pause) {
        return;
    }
    const label = pause.querySelector("[data-i18n='pause']");
    if (label) {
        label.textContent =
            liveUiPaused
                ? (isLatvianUi()
                    ? "Atsākt"
                    : "Resume")
                : (isLatvianUi()
                    ? "Pauze"
                    : "Pause");
    }
    pause.classList.toggle("is-active", liveUiPaused);
    pause.setAttribute("aria-pressed", String(liveUiPaused));
    pause.title =
        liveUiPaused
            ? (isLatvianUi()
                ? "Atsākt tiešraides attēlošanu"
                : "Resume live rendering")
            : (isLatvianUi()
                ? "Apturēt ekrāna atjaunošanu"
                : "Pause screen updates");
}
function searchSuggestionKindLabel(kind) {
    const lv = isLatvianUi();
    const labels = {
        project: [
            "Project",
            "Projekts"
        ],
        path: [
            "Path",
            "Ceļš"
        ],
        ip: [
            "IP",
            "IP"
        ],
        method: [
            "Method",
            "Metode"
        ],
        status: [
            "Status",
            "Statuss"
        ],
        type: [
            "Type",
            "Tips"
        ],
        layer: [
            "Layer",
            "Slānis"
        ],
        agent: [
            "User-Agent",
            "User-Agent"
        ]
    };
    return labels[kind][lv
        ? 1
        : 0];
}
function userAgentSuggestion(userAgent) {
    const lower = userAgent.toLowerCase();
    const candidates = [
        {
            needle: "googlebot",
            value: "Googlebot",
            searchValue: "Googlebot"
        },
        {
            needle: "bingbot",
            value: "Bingbot",
            searchValue: "bingbot"
        },
        {
            needle: "firefox/",
            value: "Firefox",
            searchValue: "Firefox/"
        },
        {
            needle: "edg/",
            value: "Edge",
            searchValue: "Edg/"
        },
        {
            needle: "chrome/",
            value: "Chrome",
            searchValue: "Chrome/"
        },
        {
            needle: "safari/",
            value: "Safari",
            searchValue: "Safari/"
        },
        {
            needle: "curl/",
            value: "curl",
            searchValue: "curl/"
        },
        {
            needle: "wget/",
            value: "Wget",
            searchValue: "Wget/"
        }
    ];
    for (const candidate of candidates) {
        if (lower.includes(candidate.needle)) {
            return {
                value: candidate.value,
                searchValue: candidate.searchValue
            };
        }
    }
    return null;
}
function collectLiveSearchSuggestions() {
    const query = normalizedLiveSearch(liveSearchQuery);
    const values = new Map();
    const add = (kind, value, searchValue = value) => {
        const display = String(value ?? "").trim();
        const search = String(searchValue ?? "").trim();
        if (!display ||
            !search) {
            return;
        }
        const key = `${kind}:${normalizedLiveSearch(search)}`;
        if (!values.has(key)) {
            values.set(key, {
                kind,
                value: display,
                searchValue: search
            });
        }
    };
    const recentRequests = [...rawRequests.values()]
        .sort((left, right) => right.sequence -
        left.sequence)
        .slice(0, 250);
    for (const event of recentRequests) {
        add("project", event.domain);
        add("path", event.path);
        add("ip", event.ip);
        add("method", event.method);
        add("status", event.status);
        add("type", event.category);
        const agent = userAgentSuggestion(event.userAgent);
        if (agent) {
            add("agent", agent.value, agent.searchValue);
        }
    }
    for (const group of smartGroups.values()) {
        add("project", group.domain);
        add("layer", group.layer);
    }
    const all = [...values.values()];
    if (!query) {
        const priority = [
            "project",
            "path",
            "ip",
            "agent",
            "status",
            "method",
            "type",
            "layer"
        ];
        const examples = [];
        for (const kind of priority) {
            const example = all.find(item => item.kind ===
                kind);
            if (example) {
                examples.push(example);
            }
            if (examples.length >=
                7) {
                break;
            }
        }
        return examples;
    }
    const matching = all.filter(item => {
        const kind = normalizedLiveSearch(searchSuggestionKindLabel(item.kind));
        const value = normalizedLiveSearch(item.value);
        const search = normalizedLiveSearch(item.searchValue);
        return (kind.includes(query) ||
            value.includes(query) ||
            search.includes(query));
    });
    const score = (item) => {
        const value = normalizedLiveSearch(item.value);
        const search = normalizedLiveSearch(item.searchValue);
        const kind = normalizedLiveSearch(searchSuggestionKindLabel(item.kind));
        if (value === query ||
            search === query) {
            return 0;
        }
        if (value.startsWith(query) ||
            search.startsWith(query)) {
            return 1;
        }
        if (kind.startsWith(query)) {
            return 2;
        }
        return 3;
    };
    return matching
        .sort((left, right) => {
        const difference = score(left) -
            score(right);
        if (difference !== 0) {
            return difference;
        }
        return left.value
            .localeCompare(right.value);
    })
        .slice(0, 8);
}
function ensureLiveSearchSuggestions(search) {
    const toolbar = search.closest(".toolbar");
    const searchShell = search.closest(".search");
    if (!toolbar ||
        !searchShell) {
        throw new Error("Search suggestion container cannot be positioned.");
    }
    let box = toolbar.querySelector(".live-search-suggestions");
    if (!box) {
        box =
            document.createElement("div");
        box.className =
            "live-search-suggestions";
        box.hidden =
            true;
        box.setAttribute("role", "listbox");
        toolbar.append(box);
    }
    box.style.left =
        `${searchShell.offsetLeft}px`;
    box.style.width =
        `${searchShell.offsetWidth}px`;
    return box;
}
function closeLiveSearchSuggestions() {
    const box = document.querySelector(".live-search-suggestions");
    if (box) {
        box.hidden =
            true;
        box.replaceChildren();
    }
    liveSearchSuggestionIndex =
        -1;
}
function applyLiveSearchSuggestion(search, suggestion) {
    search.value =
        suggestion.searchValue;
    liveSearchQuery =
        suggestion.searchValue;
    selectedTimelineSecond =
        null;
    closeLiveSearchSuggestions();
    renderCurrentView();
    search.focus();
}
function renderLiveSearchSuggestions(search) {
    const box = ensureLiveSearchSuggestions(search);
    if (document.activeElement !==
        search) {
        closeLiveSearchSuggestions();
        return;
    }
    const suggestions = collectLiveSearchSuggestions();
    box.replaceChildren();
    const hint = document.createElement("div");
    hint.className =
        "live-search-suggestions-hint";
    hint.textContent =
        liveSearchQuery.trim()
            ? (isLatvianUi()
                ? "Ieteikumi no pašreizējās sesijas"
                : "Suggestions from the current session")
            : (isLatvianUi()
                ? "Var meklēt projektu, ceļu, IP, User-Agent, statusu vai metodi"
                : "Search project, path, IP, User-Agent, status or method");
    box.append(hint);
    if (suggestions.length ===
        0) {
        const empty = document.createElement("div");
        empty.className =
            "live-search-suggestions-empty";
        empty.textContent =
            isLatvianUi()
                ? "Dzīvs ieteikums nav atrasts — meklēšana joprojām pārbaudīs visus laukus."
                : "No live suggestion found — search will still scan all fields.";
        box.append(empty);
        box.hidden =
            false;
        return;
    }
    suggestions.forEach((suggestion, index) => {
        const button = document.createElement("button");
        button.type =
            "button";
        button.className =
            "live-search-suggestion";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(index ===
            liveSearchSuggestionIndex));
        if (index ===
            liveSearchSuggestionIndex) {
            button.classList.add("is-selected");
        }
        const kind = document.createElement("span");
        kind.className =
            "live-search-suggestion-kind";
        kind.textContent =
            searchSuggestionKindLabel(suggestion.kind);
        const value = document.createElement("span");
        value.className =
            "live-search-suggestion-value";
        value.textContent =
            suggestion.value;
        value.title =
            suggestion.searchValue;
        button.append(kind, value);
        button.addEventListener("mousedown", event => {
            event.preventDefault();
        });
        button.addEventListener("click", () => {
            applyLiveSearchSuggestion(search, suggestion);
        });
        box.append(button);
    });
    box.hidden =
        false;
}
function moveLiveSearchSuggestion(search, direction) {
    const suggestions = collectLiveSearchSuggestions();
    if (suggestions.length ===
        0) {
        return;
    }
    liveSearchSuggestionIndex =
        (liveSearchSuggestionIndex +
            direction +
            suggestions.length) %
            suggestions.length;
    renderLiveSearchSuggestions(search);
}
function setupSearchAndPauseControls() {
    const search = document.querySelector(".search input");
    const pause = document.querySelector(".pause-button");
    if (!search ||
        !pause) {
        throw new Error("Live Search/Pause controls are missing.");
    }
    search.disabled =
        false;
    search.removeAttribute("aria-disabled");
    search.autocomplete =
        "off";
    search.spellcheck =
        false;
    search.setAttribute("aria-autocomplete", "list");
    search.setAttribute("aria-haspopup", "listbox");
    pause.disabled =
        false;
    pause.removeAttribute("aria-disabled");
    search.addEventListener("focus", () => {
        liveSearchSuggestionIndex =
            -1;
        renderLiveSearchSuggestions(search);
    });
    search.addEventListener("input", () => {
        liveSearchQuery =
            search.value;
        liveSearchSuggestionIndex =
            -1;
        selectedTimelineSecond =
            null;
        renderCurrentView();
        renderLiveSearchSuggestions(search);
    });
    search.addEventListener("keydown", event => {
        if (event.key ===
            "ArrowDown") {
            event.preventDefault();
            moveLiveSearchSuggestion(search, 1);
            return;
        }
        if (event.key ===
            "ArrowUp") {
            event.preventDefault();
            moveLiveSearchSuggestion(search, -1);
            return;
        }
        if (event.key ===
            "Enter" &&
            liveSearchSuggestionIndex >=
                0) {
            const suggestions = collectLiveSearchSuggestions();
            const selected = suggestions[liveSearchSuggestionIndex];
            if (selected) {
                event.preventDefault();
                applyLiveSearchSuggestion(search, selected);
            }
            return;
        }
        if (event.key ===
            "Escape") {
            closeLiveSearchSuggestions();
            search.blur();
        }
    });
    search.addEventListener("blur", () => {
        window.setTimeout(closeLiveSearchSuggestions, 120);
    });
    pause.addEventListener("click", () => {
        liveUiPaused =
            !liveUiPaused;
        updatePauseButton();
        if (!liveUiPaused) {
            renderCurrentView();
        }
    });
    window.addEventListener("keydown", event => {
        if (event.key !== "/" ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey) {
            return;
        }
        const target = event.target;
        if (target instanceof
            HTMLInputElement ||
            target instanceof
                HTMLTextAreaElement ||
            target instanceof
                HTMLSelectElement) {
            return;
        }
        event.preventDefault();
        search.focus();
        search.select();
        renderLiveSearchSuggestions(search);
    });
    window.addEventListener("resize", () => {
        if (document.activeElement ===
            search) {
            renderLiveSearchSuggestions(search);
        }
    });
    updatePauseButton();
}
function detailText(value) {
    const text = String(value ?? "").trim();
    return text || "—";
}
function createLiveDetailPair(label, value, wide = false) {
    const pair = document.createElement("div");
    pair.className =
        wide
            ? "live-detail-pair is-wide"
            : "live-detail-pair";
    const key = document.createElement("span");
    key.className =
        "live-detail-key";
    key.textContent =
        label;
    const content = document.createElement("div");
    content.className =
        "live-detail-value";
    content.textContent =
        detailText(value);
    pair.append(key, content);
    return pair;
}
function liveDetailDrawer() {
    const drawer = document.querySelector(".details");
    if (!drawer) {
        throw new Error("Event details drawer is missing.");
    }
    return drawer;
}
function closeLiveDetailDrawer() {
    selectedLiveDetail =
        null;
    const drawer = liveDetailDrawer();
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    renderCurrentView();
}
function createLiveDetailHeader(subtitle) {
    const header = document.createElement("div");
    header.className =
        "details-header";
    const titleWrap = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent =
        isLatvianUi()
            ? "Notikuma detaļas"
            : "Event details";
    const sub = document.createElement("span");
    sub.textContent =
        subtitle;
    titleWrap.append(title, sub);
    const close = document.createElement("button");
    close.type =
        "button";
    close.className =
        "details-close";
    close.textContent =
        "×";
    close.title =
        isLatvianUi()
            ? "Aizvērt detaļas"
            : "Close details";
    close.setAttribute("aria-label", close.title);
    close.addEventListener("click", event => {
        event.stopPropagation();
        closeLiveDetailDrawer();
    });
    header.append(titleWrap, close);
    return header;
}
function rawDetailContent(event) {
    const body = document.createElement("div");
    body.className =
        "live-detail-body";
    const overview = document.createElement("div");
    overview.className =
        "live-detail-hero";
    const method = document.createElement("span");
    method.className =
        "live-detail-method";
    method.textContent =
        event.method;
    const path = document.createElement("strong");
    path.textContent =
        event.path;
    overview.append(method, path);
    const grid = document.createElement("div");
    grid.className =
        "live-detail-grid";
    grid.append(createLiveDetailPair(isLatvianUi()
        ? "Projekts"
        : "Project", event.domain), createLiveDetailPair(isLatvianUi()
        ? "Tips"
        : "Type", event.category), createLiveDetailPair(isLatvianUi()
        ? "Statuss"
        : "Status", event.status), createLiveDetailPair("IP", event.ip), createLiveDetailPair(isLatvianUi()
        ? "Protokols"
        : "Protocol", event.protocol), createLiveDetailPair(isLatvianUi()
        ? "Baiti"
        : "Bytes", event.bytes), createLiveDetailPair(isLatvianUi()
        ? "Servera laiks"
        : "Server time", event.timestamp, true), createLiveDetailPair(isLatvianUi()
        ? "Saņemts"
        : "Received", event.receivedAt, true), createLiveDetailPair(isLatvianUi()
        ? "Aizture"
        : "Delay", event.observedDelayMs ===
        null
        ? "—"
        : formatDelay(event.observedDelayMs)), createLiveDetailPair(isLatvianUi()
        ? "Secība"
        : "Sequence", event.sequence), createLiveDetailPair("Referrer", event.referer, true), createLiveDetailPair("User-Agent", event.userAgent, true));
    body.append(overview, grid);
    return body;
}
function smartDetailContent(group) {
    const body = document.createElement("div");
    body.className =
        "live-detail-body";
    const requests = group.requests;
    const documents = requests.filter(request => request.role ===
        "document").length;
    const assets = requests.filter(request => request.role ===
        "asset").length;
    const background = requests.filter(request => request.role ===
        "background").length;
    const errors = requests.filter(request => request.status >=
        400).length;
    const lastRequest = requests[requests.length - 1];
    const overview = document.createElement("div");
    overview.className =
        "live-detail-hero";
    const layer = document.createElement("span");
    layer.className =
        "live-detail-layer";
    layer.dataset.layer =
        group.layer;
    layer.textContent =
        displayLiveToolbarFilterValue("type", group.layer);
    const project = document.createElement("strong");
    project.textContent =
        group.domain;
    overview.append(layer, project);
    const grid = document.createElement("div");
    grid.className =
        "live-detail-grid";
    grid.append(createLiveDetailPair(isLatvianUi()
        ? "Pieprasījumi"
        : "Requests", requests.length), createLiveDetailPair(isLatvianUi()
        ? "Lapas"
        : "Documents", documents), createLiveDetailPair(isLatvianUi()
        ? "Resursi"
        : "Assets", assets), createLiveDetailPair(isLatvianUi()
        ? "Fona darbības"
        : "Background", background), createLiveDetailPair(isLatvianUi()
        ? "Kļūdas"
        : "Errors", errors), createLiveDetailPair(isLatvianUi()
        ? "Atjaunots"
        : "Updated", group.updatedAt), createLiveDetailPair("IP", lastRequest?.ip, true), createLiveDetailPair("User-Agent", lastRequest?.userAgent, true), createLiveDetailPair("Referrer", lastRequest?.referer, true));
    const section = document.createElement("section");
    section.className =
        "live-detail-request-section";
    const sectionTitle = document.createElement("strong");
    sectionTitle.textContent =
        isLatvianUi()
            ? "Grupas pieprasījumi"
            : "Grouped requests";
    section.append(sectionTitle);
    const requestList = document.createElement("div");
    requestList.className =
        "live-detail-request-list";
    for (const request of requests.slice(-25)) {
        const row = document.createElement("div");
        row.className =
            "live-detail-request";
        const meta = document.createElement("div");
        meta.className =
            "live-detail-request-meta";
        meta.textContent =
            `${request.role} · ${request.status} · ${formatClock(request.receivedAt)}`;
        const requestPath = document.createElement("div");
        requestPath.className =
            "live-detail-request-path";
        requestPath.textContent =
            `${request.method} ${request.path}`;
        row.append(meta, requestPath);
        requestList.append(row);
    }
    section.append(requestList);
    body.append(overview, grid, section);
    return body;
}
function renderSelectedLiveDetail() {
    const drawer = liveDetailDrawer();
    if (selectedLiveDetail ===
        null) {
        drawer.classList.remove("is-open");
        drawer.setAttribute("aria-hidden", "true");
        return;
    }
    if (selectedLiveDetail.kind ===
        "raw") {
        const event = rawRequests.get(Number(selectedLiveDetail.id));
        if (!event) {
            selectedLiveDetail =
                null;
            drawer.classList.remove("is-open");
            return;
        }
        drawer.replaceChildren(createLiveDetailHeader(isLatvianUi()
            ? "tiešais pieprasījums"
            : "raw request"), rawDetailContent(event));
    }
    else {
        const group = smartGroups.get(selectedLiveDetail.id);
        if (!group) {
            selectedLiveDetail =
                null;
            drawer.classList.remove("is-open");
            return;
        }
        drawer.replaceChildren(createLiveDetailHeader(isLatvianUi()
            ? "Smart aktivitāte"
            : "Smart activity"), smartDetailContent(group));
    }
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
}
function selectLiveDetail(kind, id) {
    selectedLiveDetail = {
        kind,
        id
    };
    if (kind === "smart") {
        expandedGroups.delete(id);
    }
    closeLiveSearchSuggestions();
    closeLiveToolbarFilterMenu();
    renderCurrentView();
}
function setupLiveDetailDrawer() {
    const list = requireElement("event-list");
    const drawer = liveDetailDrawer();
    drawer.setAttribute("aria-hidden", "true");
    list.addEventListener("click", event => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }
        const item = target.closest("[data-live-detail-kind]");
        if (!item) {
            return;
        }
        const kind = item.dataset
            .liveDetailKind;
        const id = item.dataset
            .liveDetailId;
        if (!id ||
            (kind !== "raw" &&
                kind !== "smart")) {
            return;
        }
        if (kind === "smart" &&
            target.closest(".smart-group-summary")) {
            event.stopPropagation();
        }
        selectLiveDetail(kind, id);
    }, true);
    window.addEventListener("keydown", event => {
        if (event.key !==
            "Escape" ||
            selectedLiveDetail ===
                null) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        closeLiveDetailDrawer();
    }, true);
}
function renderRawView() {
    const text = labels();
    const list = requireElement("event-list");
    list.replaceChildren();
    const events = [...rawRequests.values()]
        .filter(event => isMonitoredProject(event.domain) &&
        rawRequestMatchesToolbarFilters(event) &&
        rawRequestMatchesSearch(event) &&
        requestTouchesSelectedSecond(event))
        .sort((left, right) => right.sequence -
        left.sequence);
    if (events.length === 0) {
        list.append(createEmptyState(text.noRaw, text.noRawHelp));
    }
    else {
        for (const event of events) {
            const row = createRawRow(event);
            row.dataset.liveDetailKind =
                "raw";
            row.dataset.liveDetailId =
                String(event.sequence);
            if (selectedLiveDetail?.kind ===
                "raw" &&
                selectedLiveDetail.id ===
                    String(event.sequence)) {
                row.classList.add("is-detail-selected");
            }
            list.append(row);
        }
    }
    updateCounter(`${events.length} ${text.requestsCount}`);
}
function createProjectIdentity(domain) {
    const identity = document.createElement("span");
    identity.className =
        "smart-project-identity";
    identity.title =
        domain;
    identity.style.setProperty("--project-hue", String(projectHue(domain)));
    const mark = document.createElement("span");
    mark.className =
        "smart-project-mark";
    mark.textContent =
        projectMonogram(domain);
    const domainLabel = document.createElement("span");
    domainLabel.className =
        "smart-project-domain";
    domainLabel.textContent =
        domain;
    identity.append(mark, domainLabel);
    return identity;
}
function createLayerPill(layer) {
    const pill = document.createElement("span");
    pill.className =
        "smart-layer-pill";
    pill.dataset.layer =
        layer;
    pill.textContent =
        layerLabel(layer);
    return pill;
}
function createGroupDetails(group) {
    const details = document.createElement("div");
    details.className =
        "smart-group-details";
    const requests = group.requests.slice(-30);
    for (const request of requests) {
        const row = document.createElement("div");
        row.className =
            "smart-raw-row";
        const time = document.createElement("span");
        time.textContent =
            formatClock(request.receivedAt);
        const role = document.createElement("span");
        role.className =
            "smart-request-role";
        role.dataset.role =
            request.role;
        role.textContent =
            request.role;
        const path = document.createElement("span");
        path.textContent =
            `${request.method} ${request.path}`;
        path.title =
            [
                request.ip,
                request.userAgent,
                request.referer
            ].join("\n");
        const status = document.createElement("span");
        status.textContent =
            String(request.status);
        const delay = document.createElement("span");
        delay.textContent =
            formatDelay(request.observedDelayMs);
        row.append(time, role, path, status, delay);
        details.append(row);
    }
    if (group.requests.length >
        requests.length) {
        const more = document.createElement("div");
        more.className =
            "smart-group-more";
        more.textContent =
            `+ ${group.requests.length -
                requests.length}`;
        details.append(more);
    }
    return details;
}
function createSmartGroup(group) {
    const text = labels();
    const container = document.createElement("article");
    container.className =
        "smart-group";
    container.dataset.groupId =
        group.id;
    container.dataset.layer =
        group.layer;
    const expanded = expandedGroups.has(group.id);
    container.classList.toggle("is-expanded", expanded);
    const summary = document.createElement("button");
    summary.type =
        "button";
    summary.className =
        "smart-group-summary";
    summary.setAttribute("aria-expanded", String(expanded));
    const time = document.createElement("span");
    time.className =
        "smart-group-time";
    time.textContent =
        formatClock(group.updatedAt);
    const activity = document.createElement("span");
    activity.className =
        "smart-group-activity";
    const identity = createProjectIdentity(group.domain);
    const copy = document.createElement("span");
    copy.className =
        "smart-activity-copy";
    const documents = group.requests.filter(request => request.role ===
        "document");
    const actions = group.requests.filter(request => {
        if (request.role !==
            "background") {
            return false;
        }
        const method = request.method
            .trim()
            .toUpperCase();
        if (method === "GET" ||
            method === "HEAD") {
            return false;
        }
        return (!/^\/_analytics(?:\/|$)/iu.test(request.path));
    });
    const meaningful = [
        ...documents,
        ...actions
    ].sort((left, right) => left.sequence -
        right.sequence);
    const headline = meaningful[meaningful.length - 1];
    const primary = document.createElement("strong");
    if (headline) {
        primary.textContent =
            `${headline.method} ${headline.path}`;
    }
    else if (group.primaryRequest) {
        primary.textContent =
            `${group.primaryRequest.method} ${group.primaryRequest.path}`;
    }
    else {
        primary.textContent =
            "background activity";
    }
    const meta = document.createElement("small");
    const metaParts = [];
    if (documents.length > 0) {
        metaParts.push(`${documents.length} ${text.pages}`);
    }
    metaParts.push(`${group.requestCount} req`);
    if (group.assetCount > 0) {
        metaParts.push(`${group.assetCount} ${text.assets}`);
    }
    if (actions.length > 0) {
        metaParts.push(`${actions.length} ${text.actions}`);
    }
    if (group.errorCount > 0) {
        metaParts.push(`${group.errorCount} ${text.errors}`);
    }
    meta.textContent =
        metaParts.join(" · ");
    copy.append(primary, meta);
    const documentPaths = [
        ...new Set(documents.map(request => request.path))
    ];
    if (documentPaths.length >
        1) {
        const trail = document.createElement("small");
        trail.className =
            "smart-navigation-trail";
        const visiblePaths = documentPaths.slice(-3);
        const hiddenCount = Math.max(0, documentPaths.length -
            visiblePaths.length);
        trail.textContent =
            `${visiblePaths.join(" → ")}${hiddenCount > 0
                ? ` · +${hiddenCount}`
                : ""}`;
        trail.title =
            documentPaths.join("\n");
        copy.append(trail);
    }
    activity.append(identity, copy);
    const layer = createLayerPill(group.layer);
    const status = document.createElement("span");
    status.className =
        "smart-group-status";
    status.textContent =
        headline
            ? String(headline.status)
            : group.primaryRequest
                ? String(group.primaryRequest.status)
                : "—";
    const count = document.createElement("span");
    count.className =
        "smart-group-count";
    count.textContent =
        String(group.requestCount);
    summary.append(time, activity, layer, status, count);
    summary.title =
        isLatvianUi()
            ? "Skatīt detaļas"
            : "View details";
    summary.addEventListener("click", () => {
        if (expandedGroups.has(group.id)) {
            expandedGroups.delete(group.id);
        }
        else {
            expandedGroups.add(group.id);
        }
        scheduleRender();
    });
    container.append(summary);
    if (expanded) {
        container.append(createGroupDetails(group));
    }
    return container;
}
function renderSmartView() {
    const text = labels();
    const list = requireElement("event-list");
    list.replaceChildren();
    const allGroups = [...smartGroups.values()]
        .sort((left, right) => Date.parse(right.updatedAt) -
        Date.parse(left.updatedAt));
    const groups = allGroups.filter(group => isMonitoredProject(group.domain) &&
        smartGroupMatchesToolbarFilters(group) &&
        smartGroupMatchesSearch(group) &&
        activeLayers.has(group.layer) &&
        (selectedTimelineSecond ===
            null ||
            groupTouchesSecond(group, selectedTimelineSecond)));
    if (groups.length === 0) {
        list.append(createEmptyState(text.noSmart, text.noSmartHelp));
    }
    else {
        for (const group of groups) {
            const element = createSmartGroup(group);
            element.dataset.liveDetailKind =
                "smart";
            element.dataset.liveDetailId =
                group.id;
            if (selectedLiveDetail?.kind ===
                "smart" &&
                selectedLiveDetail.id ===
                    group.id) {
                element.classList.add("is-detail-selected");
            }
            list.append(element);
        }
    }
    const count = groups.length ===
        allGroups.length
        ? `${groups.length} ${text.groups}`
        : `${groups.length}/${allGroups.length} ${text.groups}`;
    updateCounter(count);
}
function renderCurrentView() {
    normalizeLiveToolbarFilterSelections();
    updateLiveToolbarFilterButtons();
    updatePauseButton();
    updatePresentation();
    renderSelectedLiveDetail();
    renderActivityTimeline();
    if (viewMode === "smart") {
        renderSmartView();
    }
    else {
        renderRawView();
    }
}
function scheduleRender() {
    if (liveUiPaused) {
        return;
    }
    if (renderScheduled) {
        return;
    }
    renderScheduled =
        true;
    requestAnimationFrame(() => {
        renderScheduled =
            false;
        renderCurrentView();
    });
}
function renderCollectorStatus(status) {
    const top = requireElement("shell-status");
    const footer = requireElement("collector-status-text");
    footer.removeAttribute("data-i18n");
    let label = `collector ${status.state}`;
    if (status.state ===
        "monitoring") {
        label =
            status.projectCount ===
                undefined
                ? "collector live"
                : `collector live · ${status.projectCount} projects`;
    }
    if (status.state ===
        "reconnecting" &&
        status.retryInMs !==
            undefined) {
        label =
            `collector reconnecting · ${Math.round(status.retryInMs /
                1000)}s`;
    }
    footer.textContent =
        label;
    top.classList.remove("is-ready", "is-error");
    if (status.state ===
        "monitoring" ||
        status.state ===
            "connected") {
        top.classList.add("is-ready");
    }
    else if (status.state ===
        "reconnecting" ||
        status.state ===
            "stopped") {
        top.classList.add("is-error");
    }
    const topLabel = top.querySelector("span:last-child");
    if (topLabel) {
        topLabel.textContent =
            label;
    }
}
function renderLogRotation(event) {
    const project = document.querySelector(`.project-row[data-project-id="${CSS.escape(event.domain)}"]`);
    if (!project) {
        return;
    }
    project.dataset.logState =
        event.state;
    project.title =
        event.state ===
            "following"
            ? `${event.domain} · following log`
            : `${event.domain} · log unavailable`;
}
function watchLanguage() {
    const observer = new MutationObserver(mutations => {
        if (mutations.some(mutation => mutation.type ===
            "attributes" &&
            mutation.attributeName ===
                "lang")) {
            renderCurrentView();
        }
    });
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
            "lang"
        ]
    });
}
export async function setupLiveBridge() {
    window.addEventListener("qcy:project-filter", handleProjectFilterEvent);
    createActivityTimeline();
    createViewControls();
    setupSearchAndPauseControls();
    setupLiveToolbarFilters();
    setupLiveDetailDrawer();
    watchLanguage();
    startActivityClock();
    window.qcyLiveLog
        .onCollectorStatus(renderCollectorStatus);
    window.qcyLiveLog
        .onLiveRequest(recordRawRequest);
    window.qcyLiveLog
        .onLogRotation(renderLogRotation);
    window.qcyLiveLog
        .onSmartGroupUpdate(recordSmartGroup);
    const [liveSnapshot, smartSnapshot] = await Promise.all([
        window.qcyLiveLog
            .getLiveSnapshot(),
        window.qcyLiveLog
            .getSmartSnapshot()
    ]);
    if (liveSnapshot.status !==
        null) {
        renderCollectorStatus(liveSnapshot.status);
    }
    for (const event of liveSnapshot.requests) {
        rawRequests.set(event.sequence, event);
    }
    trimRawBuffer();
    for (const event of liveSnapshot.rotations) {
        renderLogRotation(event);
    }
    for (const group of smartSnapshot) {
        smartGroups.set(group.id, group);
    }
    renderCurrentView();
}
