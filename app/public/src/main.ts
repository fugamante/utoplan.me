import {
  type PlanningProfile,
  type ProfileStore,
  clearProfile,
  planningContextPath,
  readProfile,
  saveProfile
} from "./profile.js";

interface ProfileElements {
  businessIdea: HTMLInputElement;
  municipality: HTMLInputElement;
  category: HTMLInputElement;
  status: HTMLElement;
  link: HTMLAnchorElement;
}

const MEMORY_STORE: Record<string, string> = {};

export const NOOP_PROFILE_STORE: ProfileStore = {
  getItem: function(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(MEMORY_STORE, key) ? MEMORY_STORE[key] : null;
  },
  setItem: function(key: string, value: string): void {
    MEMORY_STORE[key] = value;
  },
  removeItem: function(key: string): void {
    delete MEMORY_STORE[key];
  }
};

function findUi(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-ui="' + name + '"]');

  if (!element) {
    throw new Error("Missing UI element: " + name);
  }

  return element;
}

function findOptionalUi(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-ui="' + name + '"]');
}

function findAllUi(name: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>('[data-ui="' + name + '"]');
}

export function setVisible(element: HTMLElement, visible: boolean): void {
  element.style.display = visible ? "block" : "none";
}

export function isVisible(element: HTMLElement): boolean {
  return window.getComputedStyle(element).display !== "none";
}

export function toggleEyeState(element: HTMLElement): void {
  const isOpen = element.classList.contains("eyeOpened");
  element.classList.toggle("eyeOpened", !isOpen);
  element.classList.toggle("eyeClosed", isOpen);
}

export function bindLayerToggles(): void {
  const layers = findAllUi("layer-visibility");

  for (let i = 0; i < layers.length; i += 1) {
    layers[i].addEventListener("click", function(event: MouseEvent): void {
      event.preventDefault();
      toggleEyeState(event.currentTarget as HTMLElement);
    });
  }
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
    sidebarToggle.innerHTML = shouldShow ? "&#9658;" : "&#9668;";
  });

  queryToggle.addEventListener("click", function(event: MouseEvent): void {
    event.preventDefault();
    setVisible(queryList, !isVisible(queryList));
  });
}

function profileFromElements(elements: ProfileElements): PlanningProfile {
  return {
    businessIdea: elements.businessIdea.value,
    municipalityId: Number(elements.municipality.value),
    categoryId: elements.category.value
  };
}

function writeProfile(elements: ProfileElements, profile: PlanningProfile): void {
  elements.businessIdea.value = profile.businessIdea;
  elements.municipality.value = String(profile.municipalityId);
  elements.category.value = profile.categoryId;
  elements.link.setAttribute("href", planningContextPath(profile));
}

function setProfileStatus(elements: ProfileElements, message: string): void {
  elements.status.textContent = message;
}

export function bindProfileControls(storage: ProfileStore): void {
  const panel = findOptionalUi("profile-panel");

  if (!panel) {
    return;
  }

  const elements: ProfileElements = {
    businessIdea: findUi("profile-business-idea") as HTMLInputElement,
    municipality: findUi("profile-municipality") as HTMLInputElement,
    category: findUi("profile-category") as HTMLInputElement,
    status: findUi("profile-status"),
    link: findUi("profile-context-link") as HTMLAnchorElement
  };
  const saveButton = findUi("profile-save");
  const loadButton = findUi("profile-load");
  const clearButton = findUi("profile-clear");

  writeProfile(elements, readProfile(storage));
  setProfileStatus(elements, "Profile ready.");

  saveButton.addEventListener("click", function(): void {
    const result = saveProfile(storage, profileFromElements(elements));
    writeProfile(elements, result.profile);
    setProfileStatus(elements, result.saved ? "Profile saved locally." : "Profile could not be saved in this browser.");
  });

  loadButton.addEventListener("click", function(): void {
    writeProfile(elements, readProfile(storage));
    setProfileStatus(elements, "Profile loaded.");
  });

  clearButton.addEventListener("click", function(): void {
    writeProfile(elements, clearProfile(storage));
    setProfileStatus(elements, "Profile cleared.");
  });
}

export function initProfileControls(): void {
  try {
    bindProfileControls(window.localStorage);
  } catch (error) {
    bindProfileControls(NOOP_PROFILE_STORE);
    const status = findOptionalUi("profile-status");

    if (status) {
      status.textContent = "Profile storage is unavailable.";
    }
  }
}

export function init(): void {
  bindLayerToggles();
  bindPanelToggles();
  initProfileControls();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
