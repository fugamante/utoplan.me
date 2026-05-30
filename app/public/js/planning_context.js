const SUMMARY_URL = '/v1/planning-context';
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}
function asSummary(value) {
    if (!isRecord(value)) {
        return null;
    }
    const id = asNonEmptyString(value.id);
    const municipality = isRecord(value.municipality) ? value.municipality : null;
    const businessCategory = isRecord(value.businessCategory) ? value.businessCategory : null;
    const confidence = isRecord(value.confidence) ? value.confidence : null;
    const guardrails = isRecord(value.guardrails) ? value.guardrails : null;
    if (!id || !municipality || !businessCategory || !confidence || !guardrails) {
        return null;
    }
    const municipalityCode = asNonEmptyString(municipality.code);
    const municipalityLabel = asNonEmptyString(municipality.label);
    const categoryId = asNonEmptyString(businessCategory.id);
    const categoryName = asNonEmptyString(businessCategory.displayName);
    const confidenceOverall = asNonEmptyString(confidence.overall);
    if (!municipalityCode || !municipalityLabel || !categoryId || !categoryName || !confidenceOverall) {
        return null;
    }
    if (guardrails.descriptiveOnly !== true ||
        guardrails.noScores !== true ||
        guardrails.noRankings !== true ||
        guardrails.noRecommendations !== true) {
        return null;
    }
    return {
        id: id,
        municipality: {
            code: municipalityCode,
            label: municipalityLabel
        },
        businessCategory: {
            id: categoryId,
            displayName: categoryName
        },
        confidence: {
            overall: confidenceOverall
        },
        guardrails: {
            descriptiveOnly: true,
            noScores: true,
            noRankings: true,
            noRecommendations: true
        }
    };
}
export function normalizePlanningContext(payload) {
    if (!Array.isArray(payload.data)) {
        return [];
    }
    const summaries = [];
    payload.data.forEach(function (summary) {
        const normalized = asSummary(summary);
        if (normalized) {
            summaries.push(normalized);
        }
    });
    return summaries;
}
export function describeSummary(summary) {
    return summary.municipality.label + ' - ' + summary.businessCategory.displayName;
}
export function loadPlanningContext(windowRef, callback) {
    windowRef.fetch(SUMMARY_URL, {
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(function (response) {
        if (!response.ok) {
            callback({
                available: false,
                summaries: []
            });
            return null;
        }
        return response.json();
    }).then(function (payload) {
        if (!payload) {
            return;
        }
        callback({
            available: true,
            summaries: normalizePlanningContext(payload)
        });
    }).catch(function () {
        callback({
            available: false,
            summaries: []
        });
    });
}
function findUi(documentRef, name) {
    return documentRef.querySelector('[data-ui="' + name + '"]');
}
export function renderPlanningContext(documentRef, result) {
    const status = findUi(documentRef, 'planning-context-status');
    const list = findUi(documentRef, 'planning-context-list');
    if (!status || !list) {
        return;
    }
    list.innerHTML = '';
    if (!result.available) {
        status.textContent = 'Planning context is unavailable right now.';
        return;
    }
    if (result.summaries.length === 0) {
        status.textContent = 'No planning-context options are available.';
        return;
    }
    status.textContent = 'Descriptive planning-context options (no scores, rankings, or recommendations).';
    result.summaries.forEach(function (summary) {
        const item = documentRef.createElement('li');
        item.className = 'planningContextItem';
        const title = documentRef.createElement('h3');
        title.className = 'planningContextTitle';
        title.textContent = describeSummary(summary);
        item.appendChild(title);
        const confidence = documentRef.createElement('p');
        confidence.className = 'planningContextMeta';
        confidence.textContent = 'Confidence: ' + summary.confidence.overall;
        item.appendChild(confidence);
        const guardrails = documentRef.createElement('p');
        guardrails.className = 'planningContextMeta';
        guardrails.textContent = 'Descriptive only';
        item.appendChild(guardrails);
        list.appendChild(item);
    });
}
export function init(windowRef, documentRef) {
    const status = findUi(documentRef, 'planning-context-status');
    if (status) {
        status.textContent = 'Loading planning context...';
    }
    loadPlanningContext(windowRef, function (result) {
        renderPlanningContext(documentRef, result);
    });
}
