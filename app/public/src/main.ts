import * as planningContext from "./planning_context.js";

function findUi(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-ui="' + name + '"]');

  if (!element) {
    throw new Error("Missing UI element: " + name);
  }

  return element;
}

function findAllUi(name: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>('[data-ui="' + name + '"]');
}

export function setVisible(element: HTMLElement, visible: boolean): void {
  element.style.display = visible ? "block" : "none";
}

export function setExpanded(element: HTMLElement, expanded: boolean): void {
  element.setAttribute("aria-expanded", expanded ? "true" : "false");
}

export function isVisible(element: HTMLElement): boolean {
  return window.getComputedStyle(element).display !== "none";
}

export function toggleEyeState(element: HTMLElement): void {
  const isOpen = element.classList.contains("eyeOpened");
  element.classList.toggle("eyeOpened", !isOpen);
  element.classList.toggle("eyeClosed", isOpen);
  element.setAttribute("aria-pressed", isOpen ? "false" : "true");
}

export function bindLayerToggles(): void {
  const layers = findAllUi("layer-visibility");

  for (let i = 0; i < layers.length; i += 1) {
    layers[i].setAttribute("aria-pressed", layers[i].classList.contains("eyeOpened") ? "true" : "false");
    layers[i].addEventListener("click", function(event: MouseEvent): void {
      event.preventDefault();
      toggleEyeState(event.currentTarget as HTMLElement);
    });
  }
}

export function bindLayerFilter(): void {
  const filter = findUi("layer-filter") as HTMLInputElement;
  const layerMenu = findUi("layer-menu");
  const layers = layerMenu.querySelectorAll<HTMLElement>("li");

  filter.addEventListener("input", function(): void {
    const query = filter.value.trim().toLowerCase();

    for (let i = 0; i < layers.length; i += 1) {
      const label = (layers[i].textContent || "").toLowerCase();
      layers[i].hidden = query !== "" && label.indexOf(query) === -1;
    }
  });
}

export function bindPanelToggles(): void {
  const sidebar = findUi("sidebar");
  const sidebarToggle = findUi("sidebar-toggle");
  const queryList = findUi("layer-menu");
  const queryToggle = findUi("layer-menu-toggle");

  setVisible(sidebar, false);

  sidebarToggle.addEventListener("click", function(): void {
    const shouldShow = !isVisible(sidebar);
    setVisible(sidebar, shouldShow);
    setExpanded(sidebarToggle, shouldShow);
    sidebarToggle.textContent = shouldShow ? "▶" : "◀";
  });

  queryToggle.addEventListener("click", function(event: MouseEvent): void {
    event.preventDefault();
    const shouldShow = !isVisible(queryList);
    setVisible(queryList, shouldShow);
    setExpanded(queryToggle, shouldShow);
  });
}

export function init(): void {
  bindLayerToggles();
  bindLayerFilter();
  bindPanelToggles();
  planningContext.init(window, document);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
