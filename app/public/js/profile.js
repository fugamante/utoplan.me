export const PROFILE_STORAGE_KEY = "utoplan.planningProfile.v1";
export const DEFAULT_PROFILE = {
    businessIdea: "",
    municipalityId: 1,
    categoryId: "professional_services"
};
export function normalizeProfile(value) {
    const municipalityId = Number(value.municipalityId);
    const categoryPattern = /^[a-z0-9]+(_[a-z0-9]+){0,2}$/;
    return {
        businessIdea: String(value.businessIdea || "").slice(0, 160),
        municipalityId: Number.isInteger(municipalityId) && municipalityId > 0 ? municipalityId : DEFAULT_PROFILE.municipalityId,
        categoryId: categoryPattern.test(String(value.categoryId || "")) ? String(value.categoryId) : DEFAULT_PROFILE.categoryId
    };
}
export function storedProfile(profile, updatedAt) {
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
export function profileFromStored(value) {
    if (value.schemaVersion !== 1 || value.mode !== "browser-local-profile") {
        return DEFAULT_PROFILE;
    }
    return normalizeProfile({
        businessIdea: value.profile ? value.profile.businessIdea : "",
        municipalityId: value.profile ? value.profile.selectedMunicipalityId || 0 : 0,
        categoryId: value.profile ? value.profile.selectedCategoryId || "" : ""
    });
}
export function readProfile(store) {
    let raw;
    try {
        raw = store.getItem(PROFILE_STORAGE_KEY);
    }
    catch (error) {
        return DEFAULT_PROFILE;
    }
    if (!raw) {
        return DEFAULT_PROFILE;
    }
    try {
        return profileFromStored(JSON.parse(raw));
    }
    catch (error) {
        return DEFAULT_PROFILE;
    }
}
export function saveProfile(store, profile) {
    const normalized = normalizeProfile(profile);
    try {
        store.setItem(PROFILE_STORAGE_KEY, JSON.stringify(storedProfile(normalized, new Date().toISOString())));
        return {
            profile: normalized,
            saved: true
        };
    }
    catch (error) {
        return {
            profile: normalized,
            saved: false
        };
    }
}
export function clearProfile(store) {
    try {
        store.removeItem(PROFILE_STORAGE_KEY);
    }
    catch (error) {
        return DEFAULT_PROFILE;
    }
    return DEFAULT_PROFILE;
}
export function planningContextPath(profile) {
    const normalized = normalizeProfile(profile);
    return "/v1/planning/context?municipality=" + encodeURIComponent(String(normalized.municipalityId)) +
        "&category=" + encodeURIComponent(normalized.categoryId);
}
