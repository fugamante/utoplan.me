export const PROFILE_STORAGE_KEY = "utoplan.planningProfile.v1";

export interface PlanningProfile {
  businessIdea: string;
  municipalityId: number;
  categoryId: string;
}

export interface StoredPlanningProfile {
  schemaVersion: 1;
  mode: "browser-local-profile";
  updatedAt: string;
  profile: {
    businessIdea: string;
    selectedMunicipalityId: number | null;
    selectedCategoryId: string | null;
  };
}

export interface ProfileSaveResult {
  profile: PlanningProfile;
  saved: boolean;
}

export interface ProfileStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_PROFILE: PlanningProfile = {
  businessIdea: "",
  municipalityId: 1,
  categoryId: "professional_services"
};

export function normalizeProfile(value: Partial<PlanningProfile>): PlanningProfile {
  const municipalityId = Number(value.municipalityId);
  const categoryPattern = /^[a-z0-9]+(_[a-z0-9]+){0,2}$/;

  return {
    businessIdea: String(value.businessIdea || "").slice(0, 160),
    municipalityId: Number.isInteger(municipalityId) && municipalityId > 0 ? municipalityId : DEFAULT_PROFILE.municipalityId,
    categoryId: categoryPattern.test(String(value.categoryId || "")) ? String(value.categoryId) : DEFAULT_PROFILE.categoryId
  };
}

export function storedProfile(profile: PlanningProfile, updatedAt: string): StoredPlanningProfile {
  const normalized = normalizeProfile(profile);

  return {
    schemaVersion: 1,
    mode: "browser-local-profile",
    updatedAt: updatedAt,
    profile: {
      businessIdea: normalized.businessIdea,
      selectedMunicipalityId: normalized.municipalityId,
      selectedCategoryId: normalized.categoryId
    }
  };
}

export function profileFromStored(value: StoredPlanningProfile): PlanningProfile {
  if (value.schemaVersion !== 1 || value.mode !== "browser-local-profile") {
    return DEFAULT_PROFILE;
  }

  return normalizeProfile({
    businessIdea: value.profile ? value.profile.businessIdea : "",
    municipalityId: value.profile ? value.profile.selectedMunicipalityId || 0 : 0,
    categoryId: value.profile ? value.profile.selectedCategoryId || "" : ""
  });
}

export function readProfile(store: ProfileStore): PlanningProfile {
  let raw: string | null;

  try {
    raw = store.getItem(PROFILE_STORAGE_KEY);
  } catch (error) {
    return DEFAULT_PROFILE;
  }

  if (!raw) {
    return DEFAULT_PROFILE;
  }

  try {
    return profileFromStored(JSON.parse(raw) as StoredPlanningProfile);
  } catch (error) {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(store: ProfileStore, profile: PlanningProfile): ProfileSaveResult {
  const normalized = normalizeProfile(profile);

  try {
    store.setItem(PROFILE_STORAGE_KEY, JSON.stringify(storedProfile(normalized, new Date().toISOString())));
    return {
      profile: normalized,
      saved: true
    };
  } catch (error) {
    return {
      profile: normalized,
      saved: false
    };
  }
}

export function clearProfile(store: ProfileStore): PlanningProfile {
  try {
    store.removeItem(PROFILE_STORAGE_KEY);
  } catch (error) {
    return DEFAULT_PROFILE;
  }

  return DEFAULT_PROFILE;
}

export function planningContextPath(profile: PlanningProfile): string {
  const normalized = normalizeProfile(profile);
  return "/v1/planning/context?municipality=" + encodeURIComponent(String(normalized.municipalityId)) +
    "&category=" + encodeURIComponent(normalized.categoryId);
}
