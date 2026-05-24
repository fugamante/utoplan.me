import { clearProfile, planningContextPath, readProfile, saveProfile } from "./profile.js";
const MEMORY_STORE = {};
export const NOOP_PROFILE_STORE = {
    getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(MEMORY_STORE, key) ? MEMORY_STORE[key] : null;
    },
    setItem: function (key, value) {
        MEMORY_STORE[key] = value;
    },
    removeItem: function (key) {
        delete MEMORY_STORE[key];
    }
};
function findUi(name) {
    const element = document.querySelector('[data-ui="' + name + '"]');
    if (!element) {
        throw new Error("Missing UI element: " + name);
    }
    return element;
}
function findOptionalUi(name) {
    return document.querySelector('[data-ui="' + name + '"]');
}
function findAllUi(name) {
    return document.querySelectorAll('[data-ui="' + name + '"]');
}
export function setVisible(element, visible) {
    element.style.display = visible ? "block" : "none";
}
export function isVisible(element) {
    return window.getComputedStyle(element).display !== "none";
}
export function toggleEyeState(element) {
    const isOpen = element.classList.contains("eyeOpened");
    element.classList.toggle("eyeOpened", !isOpen);
    element.classList.toggle("eyeClosed", isOpen);
}
export function bindLayerToggles() {
    const layers = findAllUi("layer-visibility");
    for (let i = 0; i < layers.length; i += 1) {
        layers[i].addEventListener("click", function (event) {
            event.preventDefault();
            toggleEyeState(event.currentTarget);
        });
    }
}
export function bindPanelToggles() {
    const sidebar = findUi("sidebar");
    const sidebarToggle = findUi("sidebar-toggle");
    const queryList = findUi("layer-menu");
    const queryToggle = findUi("layer-menu-toggle");
    setVisible(sidebar, false);
    sidebarToggle.addEventListener("click", function () {
        const shouldShow = !isVisible(sidebar);
        setVisible(sidebar, shouldShow);
        sidebarToggle.innerHTML = shouldShow ? "&#9658;" : "&#9668;";
    });
    queryToggle.addEventListener("click", function (event) {
        event.preventDefault();
        setVisible(queryList, !isVisible(queryList));
    });
}
function profileFromElements(elements) {
    return {
        businessIdea: elements.businessIdea.value,
        municipalityId: Number(elements.municipality.value),
        categoryId: elements.category.value
    };
}
function writeProfile(elements, profile) {
    elements.businessIdea.value = profile.businessIdea;
    elements.municipality.value = String(profile.municipalityId);
    elements.category.value = profile.categoryId;
    elements.link.setAttribute("href", planningContextPath(profile));
}
function setProfileStatus(elements, message) {
    elements.status.textContent = message;
}
export function bindProfileControls(storage) {
    const panel = findOptionalUi("profile-panel");
    if (!panel) {
        return;
    }
    const elements = {
        businessIdea: findUi("profile-business-idea"),
        municipality: findUi("profile-municipality"),
        category: findUi("profile-category"),
        status: findUi("profile-status"),
        link: findUi("profile-context-link")
    };
    const saveButton = findUi("profile-save");
    const loadButton = findUi("profile-load");
    const clearButton = findUi("profile-clear");
    writeProfile(elements, readProfile(storage));
    setProfileStatus(elements, "Profile ready.");
    saveButton.addEventListener("click", function () {
        const result = saveProfile(storage, profileFromElements(elements));
        writeProfile(elements, result.profile);
        setProfileStatus(elements, result.saved ? "Profile saved locally." : "Profile could not be saved in this browser.");
    });
    loadButton.addEventListener("click", function () {
        writeProfile(elements, readProfile(storage));
        setProfileStatus(elements, "Profile loaded.");
    });
    clearButton.addEventListener("click", function () {
        writeProfile(elements, clearProfile(storage));
        setProfileStatus(elements, "Profile cleared.");
    });
}
export function initProfileControls() {
    try {
        bindProfileControls(window.localStorage);
    }
    catch (error) {
        bindProfileControls(NOOP_PROFILE_STORE);
        const status = findOptionalUi("profile-status");
        if (status) {
            status.textContent = "Profile storage is unavailable.";
        }
    }
}
export function init() {
    bindLayerToggles();
    bindPanelToggles();
    initProfileControls();
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
}
else {
    init();
}
