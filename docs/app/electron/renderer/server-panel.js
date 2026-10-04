import { translate } from "./i18n.js";
function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing server panel element: ${id}`);
    }
    return element;
}
function readInput(id) {
    return requireElement(id).value.trim();
}
function sshSignature() {
    return JSON.stringify({
        host: readInput("server-host"),
        port: readInput("server-port"),
        username: readInput("server-username"),
        privateKeyPath: readInput("server-key"),
        hostKeySha256: readInput("server-host-key"),
        passphrase: requireElement("server-passphrase").value
    });
}
export async function setupServerPanel(getLanguage) {
    const modal = requireElement("server-modal");
    const openButton = requireElement("servers-button");
    const closeButton = requireElement("server-modal-close");
    const newButton = requireElement("server-new");
    const panelTitle = requireElement("server-panel-title");
    const cancelButton = requireElement("server-cancel");
    const browseButton = requireElement("server-key-browse");
    const testButton = requireElement("server-test");
    const discoverButton = requireElement("server-discover");
    const discoveryResults = requireElement("server-discovery-results");
    const discoveryCount = requireElement("server-discovery-count");
    const discoveryList = requireElement("server-discovery-list");
    const saveButton = requireElement("server-save");
    const form = requireElement("server-form");
    const profileList = requireElement("server-profile-list");
    const status = requireElement("server-test-status");
    const keyInput = requireElement("server-key");
    const passphraseInput = requireElement("server-passphrase");
    const hostKeyInput = requireElement("server-host-key");
    const forgetHostKeyButton = requireElement("server-host-key-reset");
    const portInput = requireElement("server-port");
    const parser = requireElement("server-parser");
    const defaultProfileCheckbox = requireElement("server-default-profile");
    const autoConnectCheckbox = requireElement("server-auto-connect");
    const rememberPassphraseCheckbox = requireElement("server-remember-passphrase");
    const launchAtLoginCheckbox = requireElement("server-launch-at-login");
    let startupPreferences = await window.qcyLiveLog
        .getPreferences();
    let rememberedPassphrase = false;
    let profiles = [];
    let selectedProfileId = null;
    let verifiedSignature = null;
    let discoveredLogs = [];
    function clearDiscovery() {
        discoveredLogs = [];
        discoveryResults.hidden =
            true;
        discoveryCount.textContent =
            "";
        discoveryList.replaceChildren();
    }
    function renderDiscovery() {
        const language = getLanguage();
        discoveryList.replaceChildren();
        discoveryResults.hidden =
            false;
        discoveryCount.textContent =
            `${discoveredLogs.length} ${translate(language, "logsFound")}`;
        if (discoveredLogs.length === 0) {
            const empty = document.createElement("div");
            empty.className =
                "server-discovery-empty";
            empty.textContent =
                translate(language, "noLogsFound");
            discoveryList.append(empty);
            return;
        }
        for (const log of discoveredLogs) {
            const row = document.createElement("div");
            row.className =
                "server-discovery-row";
            const project = document.createElement("strong");
            project.textContent =
                log.domain;
            const file = document.createElement("span");
            file.textContent =
                log.fileName;
            const remotePath = document.createElement("small");
            remotePath.textContent =
                log.remotePath;
            row.append(project, file, remotePath);
            discoveryList.append(row);
        }
    }
    function setStatus(message, kind) {
        status.textContent =
            message;
        status.dataset.state =
            kind;
    }
    function invalidateVerification() {
        verifiedSignature = null;
        saveButton.disabled = true;
        discoverButton.disabled = true;
        clearDiscovery();
        setStatus("", "idle");
    }
    function updateModeLabels() {
        const language = getLanguage();
        panelTitle.textContent =
            translate(language, selectedProfileId === null
                ? "addServer"
                : "editServer");
        saveButton.textContent =
            translate(language, selectedProfileId === null
                ? "saveServer"
                : "saveChanges");
    }
    async function refreshStartupOptions(profile) {
        const profileId = profile?.id ??
            null;
        const nextPreferences = await window.qcyLiveLog
            .getPreferences();
        if (profileId !== null &&
            selectedProfileId !==
                profileId) {
            return;
        }
        startupPreferences =
            nextPreferences;
        launchAtLoginCheckbox.checked =
            startupPreferences
                .launchAtLogin;
        if (!profile) {
            defaultProfileCheckbox.checked =
                false;
            autoConnectCheckbox.checked =
                false;
            rememberPassphraseCheckbox.checked =
                false;
            rememberedPassphrase =
                false;
            return;
        }
        const isDefault = startupPreferences
            .defaultServerProfileId ===
            profile.id;
        defaultProfileCheckbox.checked =
            isDefault;
        autoConnectCheckbox.checked =
            isDefault &&
                startupPreferences
                    .autoConnect;
        const stored = await window.qcyLiveLog
            .hasRememberedPassphrase(profile.id);
        if (selectedProfileId !==
            profile.id) {
            return;
        }
        rememberedPassphrase =
            stored;
        rememberPassphraseCheckbox.checked =
            stored;
    }
    function resetForm() {
        form.reset();
        selectedProfileId = null;
        portInput.value = "22";
        parser.value = "auto";
        hostKeyInput.value = "";
        verifiedSignature = null;
        saveButton.disabled = true;
        discoverButton.disabled = true;
        clearDiscovery();
        updateModeLabels();
        setStatus("", "idle");
        renderProfiles();
    }
    function loadProfile(profile) {
        selectedProfileId =
            profile.id;
        requireElement("server-name").value =
            profile.name;
        requireElement("server-host").value =
            profile.ssh.host;
        requireElement("server-port").value =
            String(profile.ssh.port);
        requireElement("server-username").value =
            profile.ssh.username;
        requireElement("server-key").value =
            profile.ssh.privateKeyPath;
        hostKeyInput.value =
            profile.ssh.hostKeySha256 ??
                "";
        requireElement("server-passphrase").value =
            "";
        requireElement("server-log-directory").value =
            profile.logs.directory;
        requireElement("server-log-pattern").value =
            profile.logs.pattern;
        requireElement("server-parser").value =
            profile.logs.parser;
        requireElement("server-project-suffix").value =
            profile.logs.projectNameSuffix;
        verifiedSignature = null;
        saveButton.disabled = true;
        discoverButton.disabled = true;
        clearDiscovery();
        updateModeLabels();
        renderProfiles();
        void refreshStartupOptions(profile);
        setStatus(translate(getLanguage(), "testBeforeSave"), "idle");
    }
    function closeModal() {
        modal.hidden = true;
        passphraseInput.value = "";
        invalidateVerification();
    }
    function openModal() {
        modal.hidden = false;
        void refreshProfiles();
        window.setTimeout(() => {
            requireElement("server-name").focus();
        }, 0);
    }
    function createProfileCard(profile) {
        const card = document.createElement("div");
        card.className =
            profile.id === selectedProfileId
                ? "server-profile-card is-selected"
                : "server-profile-card";
        card.tabIndex = 0;
        card.addEventListener("click", () => {
            loadProfile(profile);
        });
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" ||
                event.key === " ") {
                event.preventDefault();
                loadProfile(profile);
            }
        });
        const copy = document.createElement("div");
        copy.className =
            "server-profile-copy";
        const title = document.createElement("strong");
        title.textContent =
            profile.name;
        const target = document.createElement("span");
        target.textContent =
            `${profile.ssh.username}@${profile.ssh.host}:${profile.ssh.port}`;
        const logs = document.createElement("small");
        logs.textContent =
            `${profile.logs.directory}/${profile.logs.pattern}`;
        copy.append(title, target, logs);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className =
            "server-profile-delete";
        remove.textContent =
            translate(getLanguage(), "deleteServer");
        remove.addEventListener("click", async (event) => {
            event.stopPropagation();
            const language = getLanguage();
            const confirmed = window.confirm(`${translate(language, "deleteServerConfirm")}\n\n${profile.name}`);
            if (!confirmed) {
                return;
            }
            remove.disabled = true;
            try {
                profiles =
                    await window.qcyLiveLog
                        .deleteServerProfile(profile.id);
                await window.qcyLiveLog
                    .forgetPassphrase(profile.id);
                if (startupPreferences
                    .defaultServerProfileId ===
                    profile.id) {
                    startupPreferences =
                        await window.qcyLiveLog
                            .updateStartupPreferences({
                            defaultServerProfileId: null,
                            autoConnect: false
                        });
                }
                if (selectedProfileId ===
                    profile.id) {
                    resetForm();
                }
                else {
                    renderProfiles();
                }
                setStatus(translate(language, "serverDeleted"), "success");
            }
            catch (error) {
                setStatus(error instanceof Error
                    ? error.message
                    : String(error), "error");
            }
        });
        card.append(copy, remove);
        return card;
    }
    function renderProfiles() {
        profileList.replaceChildren();
        if (profiles.length === 0) {
            const empty = document.createElement("div");
            empty.className =
                "server-profile-empty";
            empty.textContent =
                translate(getLanguage(), "noServerProfiles");
            profileList.append(empty);
            return;
        }
        for (const profile of profiles) {
            profileList.append(createProfileCard(profile));
        }
    }
    async function refreshProfiles() {
        try {
            profiles =
                await window.qcyLiveLog
                    .listServerProfiles();
            renderProfiles();
        }
        catch (error) {
            setStatus(error instanceof Error
                ? error.message
                : String(error), "error");
        }
    }
    openButton.addEventListener("click", () => {
        resetForm();
        openModal();
    });
    newButton.addEventListener("click", () => {
        resetForm();
        requireElement("server-name").focus();
    });
    closeButton.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
        if (event.target instanceof HTMLElement &&
            event.target.dataset.serverModalBackdrop ===
                "true") {
            closeModal();
        }
    });
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" &&
            !modal.hidden) {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeModal();
        }
    }, {
        capture: true
    });
    browseButton.addEventListener("click", async () => {
        const selected = await window.qcyLiveLog
            .selectPrivateKey();
        if (!selected) {
            return;
        }
        keyInput.value =
            selected;
        invalidateVerification();
    });
    for (const id of [
        "server-host",
        "server-port",
        "server-username",
        "server-key",
        "server-passphrase"
    ]) {
        requireElement(id).addEventListener("input", invalidateVerification);
    }
    for (const id of [
        "server-host",
        "server-port"
    ]) {
        requireElement(id).addEventListener("input", () => {
            hostKeyInput.value = "";
            invalidateVerification();
        });
    }
    forgetHostKeyButton.addEventListener("click", () => {
        if (hostKeyInput.value === "") {
            return;
        }
        const language = getLanguage();
        if (!window.confirm(translate(language, "forgetHostKeyConfirm"))) {
            return;
        }
        hostKeyInput.value = "";
        invalidateVerification();
    });
    testButton.addEventListener("click", async () => {
        const language = getLanguage();
        testButton.disabled = true;
        saveButton.disabled = true;
        discoverButton.disabled = true;
        clearDiscovery();
        setStatus(translate(language, "testingConnection"), "working");
        const connectionInput = (hostKeySha256) => ({
            host: readInput("server-host"),
            port: readInput("server-port"),
            username: readInput("server-username"),
            privateKeyPath: readInput("server-key"),
            hostKeySha256
        });
        try {
            const existingHostKey = readInput("server-host-key");
            let result = await window.qcyLiveLog
                .testSshConnection(connectionInput(existingHostKey ||
                undefined), passphraseInput.value);
            if (!result.hostKeyTrusted) {
                const accepted = window.confirm(`${translate(language, "trustHostKeyPrompt")}\n\n${result.hostKeySha256}`);
                if (!accepted) {
                    hostKeyInput.value = "";
                    verifiedSignature = null;
                    setStatus(translate(language, "hostKeyRejected"), "error");
                    return;
                }
                hostKeyInput.value =
                    result.hostKeySha256;
                setStatus(translate(language, "verifyingTrustedHostKey"), "working");
                result =
                    await window.qcyLiveLog
                        .testSshConnection(connectionInput(result.hostKeySha256), passphraseInput.value);
            }
            if (!result.hostKeyTrusted) {
                throw new Error("SSH host key could not be verified.");
            }
            hostKeyInput.value =
                result.hostKeySha256;
            verifiedSignature =
                sshSignature();
            saveButton.disabled =
                false;
            discoverButton.disabled =
                false;
            setStatus(`${translate(language, "connectionSuccess")} ${result.target} · ${result.latencyMs} ms · ${result.hostKeySha256}`, "success");
        }
        catch (error) {
            verifiedSignature =
                null;
            saveButton.disabled =
                true;
            discoverButton.disabled =
                true;
            const message = error instanceof Error
                ? error.message
                : String(error);
            setStatus(`${translate(language, "connectionFailed")}: ${message}`, "error");
        }
        finally {
            testButton.disabled =
                false;
        }
    });
    discoverButton.addEventListener("click", async () => {
        const language = getLanguage();
        if (verifiedSignature === null ||
            verifiedSignature !==
                sshSignature()) {
            discoverButton.disabled =
                true;
            setStatus(translate(language, "testBeforeDiscover"), "error");
            return;
        }
        discoverButton.disabled =
            true;
        testButton.disabled =
            true;
        clearDiscovery();
        setStatus(translate(language, "discoveringLogs"), "working");
        try {
            discoveredLogs =
                await window.qcyLiveLog
                    .discoverLogs({
                    ssh: {
                        host: readInput("server-host"),
                        port: readInput("server-port"),
                        username: readInput("server-username"),
                        privateKeyPath: readInput("server-key"),
                        hostKeySha256: readInput("server-host-key")
                    },
                    logs: {
                        directory: readInput("server-log-directory"),
                        pattern: readInput("server-log-pattern"),
                        projectNameSuffix: readInput("server-project-suffix")
                    }
                }, passphraseInput.value);
            renderDiscovery();
            setStatus(`${discoveredLogs.length} ${translate(language, "logsFound")}`, "success");
        }
        catch (error) {
            const message = error instanceof Error
                ? error.message
                : String(error);
            setStatus(`${translate(language, "discoverFailed")}: ${message}`, "error");
        }
        finally {
            testButton.disabled =
                false;
            discoverButton.disabled =
                verifiedSignature === null ||
                    verifiedSignature !==
                        sshSignature();
        }
    });
    autoConnectCheckbox.addEventListener("change", () => {
        if (autoConnectCheckbox
            .checked) {
            defaultProfileCheckbox.checked =
                true;
        }
    });
    defaultProfileCheckbox.addEventListener("change", () => {
        if (!defaultProfileCheckbox
            .checked) {
            autoConnectCheckbox.checked =
                false;
        }
    });
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const language = getLanguage();
        if (verifiedSignature === null ||
            verifiedSignature !==
                sshSignature()) {
            saveButton.disabled = true;
            setStatus(translate(language, "testBeforeSave"), "error");
            return;
        }
        const projectNameSuffix = readInput("server-project-suffix");
        const profileId = selectedProfileId ??
            window.crypto.randomUUID();
        const profile = {
            id: profileId,
            name: readInput("server-name"),
            ssh: {
                host: readInput("server-host"),
                port: readInput("server-port"),
                username: readInput("server-username"),
                privateKeyPath: readInput("server-key"),
                hostKeySha256: readInput("server-host-key")
            },
            logs: {
                directory: readInput("server-log-directory"),
                pattern: readInput("server-log-pattern"),
                parser: parser.value,
                projectNameSuffix
            }
        };
        saveButton.disabled = true;
        testButton.disabled = true;
        setStatus(translate(language, "savingServer"), "working");
        try {
            profiles =
                await window.qcyLiveLog
                    .saveServerProfile(profile);
            if (rememberPassphraseCheckbox
                .checked) {
                if (passphraseInput.value !== "") {
                    await window.qcyLiveLog
                        .rememberPassphrase(profileId, passphraseInput.value);
                    rememberedPassphrase =
                        true;
                }
                else if (!rememberedPassphrase) {
                    throw new Error("Enter the SSH passphrase before enabling secure passphrase storage.");
                }
            }
            else {
                await window.qcyLiveLog
                    .forgetPassphrase(profileId);
                rememberedPassphrase =
                    false;
            }
            const wasDefault = startupPreferences
                .defaultServerProfileId ===
                profileId;
            let nextDefaultProfileId = startupPreferences
                .defaultServerProfileId;
            let nextAutoConnect = startupPreferences
                .autoConnect;
            if (defaultProfileCheckbox
                .checked ||
                autoConnectCheckbox
                    .checked) {
                nextDefaultProfileId =
                    profileId;
                nextAutoConnect =
                    autoConnectCheckbox
                        .checked;
            }
            else if (wasDefault) {
                nextDefaultProfileId =
                    null;
                nextAutoConnect =
                    false;
            }
            startupPreferences =
                await window.qcyLiveLog
                    .updateStartupPreferences({
                    defaultServerProfileId: nextDefaultProfileId,
                    autoConnect: nextAutoConnect,
                    launchAtLogin: launchAtLoginCheckbox
                        .checked
                });
            renderProfiles();
            resetForm();
            setStatus(translate(language, "serverSaved"), "success");
        }
        catch (error) {
            setStatus(error instanceof Error
                ? error.message
                : String(error), "error");
        }
        finally {
            testButton.disabled =
                false;
        }
    });
    await refreshProfiles();
    return {
        async refreshLanguage() {
            updateModeLabels();
            renderProfiles();
            if (!discoveryResults.hidden) {
                renderDiscovery();
            }
        }
    };
}
