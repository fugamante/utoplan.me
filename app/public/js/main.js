import * as planningContext from "./planning_context.js";
function findUi(name) {
    const element = document.querySelector('[data-ui="' + name + '"]');
    if (!element) {
        throw new Error("Missing UI element: " + name);
    }
    return element;
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
export function init() {
    bindLayerToggles();
    bindPanelToggles();
    planningContext.init(window, document);
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
}
else {
    init();
}
