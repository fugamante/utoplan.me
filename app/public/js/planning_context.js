const SUMMARY_URL = '/v1/planning-context';
const DETAIL_URL_PREFIX = '/v1/planning-context/';
let selectedDetailId = null;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function asNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '' ? value : null;
}
function asStringList(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return null;
    }
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
        const item = asNonEmptyString(value[index]);
        if (!item) {
            return null;
        }
        output.push(item);
    }
    return output;
}
function asNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function formatFactValue(value, flag, maskedLabel) {
    if (flag === 'D') {
        return maskedLabel + ' (disclosure-limited)';
    }
    if (flag === 'H') {
        return 'approx. ' + String(value);
    }
    return String(value);
}
function asFact(value) {
    if (!isRecord(value)) {
        return null;
    }
    const naics = asNonEmptyString(value.naics);
    const naicsTitle = asNonEmptyString(value.naicsTitle);
    const notes = asNonEmptyString(value.notes);
    const establishments = asNumber(value.establishments);
    const annualPayroll = asNumber(value.annualPayroll);
    const employment = asNumber(value.employment);
    const sourceRow = isRecord(value.sourceRow) ? value.sourceRow : null;
    const employmentFlag = sourceRow ? asNonEmptyString(sourceRow.emp_nf) : null;
    const payrollFlag = sourceRow ? asNonEmptyString(sourceRow.ap_nf) : null;
    if (!naics || !naicsTitle || !notes || establishments === null || annualPayroll === null || employment === null) {
        return null;
    }
    return {
        naics: naics,
        naicsTitle: naicsTitle,
        notes: notes,
        display: {
            establishments: formatFactValue(establishments, null, 'masked'),
            annualPayroll: formatFactValue(annualPayroll, payrollFlag, 'masked'),
            employment: formatFactValue(employment, employmentFlag, 'masked')
        }
    };
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
function asDetail(value) {
    const summary = asSummary(value);
    if (!summary || !isRecord(value)) {
        return null;
    }
    const confidence = isRecord(value.confidence) ? value.confidence : null;
    const confidenceRationale = confidence ? asStringList(confidence.rationale) : null;
    const cbpFacts = Array.isArray(value.cbpFacts) ? value.cbpFacts : null;
    const limitations = asStringList(value.limitations);
    const unresolvedQuestions = asStringList(value.unresolvedQuestions);
    if (!confidenceRationale || !cbpFacts || !limitations || !unresolvedQuestions) {
        return null;
    }
    const normalizedFacts = [];
    for (let index = 0; index < cbpFacts.length; index += 1) {
        const fact = asFact(cbpFacts[index]);
        if (!fact) {
            return null;
        }
        normalizedFacts.push(fact);
    }
    return {
        id: summary.id,
        municipality: summary.municipality,
        businessCategory: summary.businessCategory,
        confidence: {
            overall: summary.confidence.overall,
            rationale: confidenceRationale
        },
        cbpFacts: normalizedFacts,
        limitations: limitations,
        unresolvedQuestions: unresolvedQuestions,
        guardrails: summary.guardrails
    };
}
export function normalizePlanningContextDetail(payload) {
    if (!Array.isArray(payload.data) || payload.data.length === 0) {
        return null;
    }
    return asDetail(payload.data[0]);
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
export function loadPlanningContextDetail(windowRef, id, callback) {
    windowRef.fetch(DETAIL_URL_PREFIX + encodeURIComponent(id), {
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(function (response) {
        if (!response.ok) {
            callback({
                available: false,
                detail: null
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
            detail: normalizePlanningContextDetail(payload)
        });
    }).catch(function () {
        callback({
            available: false,
            detail: null
        });
    });
}
function findUi(documentRef, name) {
    return documentRef.querySelector('[data-ui="' + name + '"]');
}
function appendListSection(documentRef, container, titleText, values) {
    const section = documentRef.createElement('section');
    section.className = 'planningContextSection';
    const title = documentRef.createElement('h4');
    title.className = 'planningContextSectionTitle';
    title.textContent = titleText;
    section.appendChild(title);
    const list = documentRef.createElement('ul');
    list.className = 'planningContextListBody';
    values.forEach(function (value) {
        const item = documentRef.createElement('li');
        item.textContent = value;
        list.appendChild(item);
    });
    section.appendChild(list);
    container.appendChild(section);
}
export function renderPlanningContextDetail(documentRef, result) {
    const status = findUi(documentRef, 'planning-context-detail-status');
    const container = findUi(documentRef, 'planning-context-detail');
    if (!status || !container) {
        return;
    }
    container.innerHTML = '';
    if (!result.available) {
        status.textContent = 'Planning-context detail is unavailable right now.';
        return;
    }
    if (!result.detail) {
        status.textContent = 'No descriptive planning-context detail is available for this option.';
        return;
    }
    status.textContent = 'Descriptive detail only (confidence, limitations, unresolved questions).';
    const detail = result.detail;
    const summary = documentRef.createElement('h3');
    summary.className = 'planningContextTitle';
    summary.textContent = describeSummary(detail);
    container.appendChild(summary);
    const confidence = documentRef.createElement('p');
    confidence.className = 'planningContextMeta';
    confidence.textContent = 'Overall confidence: ' + detail.confidence.overall;
    container.appendChild(confidence);
    detail.cbpFacts.forEach(function (fact) {
        const factSection = documentRef.createElement('section');
        factSection.className = 'planningContextSection';
        const factTitle = documentRef.createElement('h4');
        factTitle.className = 'planningContextSectionTitle';
        factTitle.textContent = 'CBP fact: ' + fact.naicsTitle + ' (' + fact.naics + ')';
        factSection.appendChild(factTitle);
        const values = documentRef.createElement('ul');
        values.className = 'planningContextListBody';
        [
            'Establishments: ' + fact.display.establishments,
            'Annual payroll: ' + fact.display.annualPayroll,
            'Employment: ' + fact.display.employment,
            'Notes: ' + fact.notes
        ].forEach(function (line) {
            const item = documentRef.createElement('li');
            item.textContent = line;
            values.appendChild(item);
        });
        factSection.appendChild(values);
        container.appendChild(factSection);
    });
    appendListSection(documentRef, container, 'Confidence rationale', detail.confidence.rationale);
    appendListSection(documentRef, container, 'Limitations', detail.limitations);
    appendListSection(documentRef, container, 'Unresolved questions', detail.unresolvedQuestions);
}
export function renderPlanningContext(documentRef, result) {
    const status = findUi(documentRef, 'planning-context-status');
    const list = findUi(documentRef, 'planning-context-list');
    if (!status || !list) {
        return;
    }
    list.innerHTML = '';
    list.className = 'planningContextList';
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
        const button = documentRef.createElement('button');
        button.className = 'planningContextButton';
        button.setAttribute('type', 'button');
        button.setAttribute('data-planning-context-id', summary.id);
        if (summary.id === selectedDetailId) {
            button.classList.add('planningContextButtonSelected');
        }
        const title = documentRef.createElement('h3');
        title.className = 'planningContextTitle';
        title.textContent = describeSummary(summary);
        button.appendChild(title);
        const confidence = documentRef.createElement('p');
        confidence.className = 'planningContextMeta';
        confidence.textContent = 'Confidence: ' + summary.confidence.overall;
        button.appendChild(confidence);
        const guardrails = documentRef.createElement('p');
        guardrails.className = 'planningContextMeta';
        guardrails.textContent = 'Descriptive only';
        button.appendChild(guardrails);
        item.appendChild(button);
        list.appendChild(item);
    });
}
export function init(windowRef, documentRef) {
    const status = findUi(documentRef, 'planning-context-status');
    const detailStatus = findUi(documentRef, 'planning-context-detail-status');
    const list = findUi(documentRef, 'planning-context-list');
    if (status) {
        status.textContent = 'Loading planning context...';
    }
    if (detailStatus) {
        detailStatus.textContent = 'Select a planning-context option to view descriptive detail.';
    }
    function selectDetail(id) {
        selectedDetailId = id;
        renderPlanningContext(documentRef, currentResult);
        if (detailStatus) {
            detailStatus.textContent = 'Loading planning-context detail...';
        }
        loadPlanningContextDetail(windowRef, id, function (detailResult) {
            renderPlanningContextDetail(documentRef, detailResult);
        });
    }
    let currentResult = {
        available: false,
        summaries: []
    };
    if (list) {
        list.addEventListener('click', function (event) {
            const target = event.target;
            const button = target ? target.closest('[data-planning-context-id]') : null;
            if (!button) {
                return;
            }
            const id = button.getAttribute('data-planning-context-id');
            if (id) {
                selectDetail(id);
            }
        });
    }
    loadPlanningContext(windowRef, function (result) {
        currentResult = result;
        renderPlanningContext(documentRef, result);
        if (result.available && result.summaries.length > 0) {
            selectDetail(result.summaries[0].id);
            return;
        }
        renderPlanningContextDetail(documentRef, {
            available: result.available,
            detail: null
        });
    });
}
