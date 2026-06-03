export interface PlanningContextSummary {
  id: string;
  municipality: {
    code: string;
    label: string;
  };
  businessCategory: {
    id: string;
    displayName: string;
  };
  confidence: {
    overall: string;
  };
  guardrails: {
    descriptiveOnly: boolean;
    noScores: boolean;
    noRankings: boolean;
    noRecommendations: boolean;
  };
}

export interface PlanningContextPayload {
  data?: unknown;
}

export interface PlanningContextResult {
  available: boolean;
  summaries: PlanningContextSummary[];
}

export interface PlanningContextDetail {
  id: string;
  municipality: {
    code: string;
    label: string;
  };
  businessCategory: {
    id: string;
    displayName: string;
  };
  confidence: {
    overall: string;
    rationale: string[];
  };
  limitations: string[];
  unresolvedQuestions: string[];
  guardrails: {
    descriptiveOnly: boolean;
    noScores: boolean;
    noRankings: boolean;
    noRecommendations: boolean;
  };
}

export interface PlanningContextDetailResult {
  available: boolean;
  detail: PlanningContextDetail | null;
}

interface RequestWindow {
  fetch: typeof fetch;
}

const SUMMARY_URL = '/v1/planning-context';
const DETAIL_URL_PREFIX = '/v1/planning-context/';

let selectedDetailId: string | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const output: string[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const item = asNonEmptyString(value[index]);

    if (!item) {
      return null;
    }

    output.push(item);
  }

  return output;
}

function asSummary(value: unknown): PlanningContextSummary | null {
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

  if (
    guardrails.descriptiveOnly !== true ||
    guardrails.noScores !== true ||
    guardrails.noRankings !== true ||
    guardrails.noRecommendations !== true
  ) {
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

export function normalizePlanningContext(payload: PlanningContextPayload): PlanningContextSummary[] {
  if (!Array.isArray(payload.data)) {
    return [];
  }

  const summaries: PlanningContextSummary[] = [];

  payload.data.forEach(function(summary): void {
    const normalized = asSummary(summary);

    if (normalized) {
      summaries.push(normalized);
    }
  });

  return summaries;
}

export function describeSummary(summary: PlanningContextSummary): string {
  return summary.municipality.label + ' - ' + summary.businessCategory.displayName;
}

function asDetail(value: unknown): PlanningContextDetail | null {
  const summary = asSummary(value);

  if (!summary || !isRecord(value)) {
    return null;
  }

  const confidence = isRecord(value.confidence) ? value.confidence : null;
  const confidenceRationale = confidence ? asStringList(confidence.rationale) : null;
  const limitations = asStringList(value.limitations);
  const unresolvedQuestions = asStringList(value.unresolvedQuestions);

  if (!confidenceRationale || !limitations || !unresolvedQuestions) {
    return null;
  }

  return {
    id: summary.id,
    municipality: summary.municipality,
    businessCategory: summary.businessCategory,
    confidence: {
      overall: summary.confidence.overall,
      rationale: confidenceRationale
    },
    limitations: limitations,
    unresolvedQuestions: unresolvedQuestions,
    guardrails: summary.guardrails
  };
}

export function normalizePlanningContextDetail(payload: PlanningContextPayload): PlanningContextDetail | null {
  if (!Array.isArray(payload.data) || payload.data.length === 0) {
    return null;
  }

  return asDetail(payload.data[0]);
}

export function loadPlanningContext(windowRef: RequestWindow, callback: (result: PlanningContextResult) => void): void {
  windowRef.fetch(SUMMARY_URL, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function(response: Response): Promise<unknown> | null {
    if (!response.ok) {
      callback({
        available: false,
        summaries: []
      });
      return null;
    }

    return response.json();
  }).then(function(payload: unknown): void {
    if (!payload) {
      return;
    }

    callback({
      available: true,
      summaries: normalizePlanningContext(payload as PlanningContextPayload)
    });
  }).catch(function(): void {
    callback({
      available: false,
      summaries: []
    });
  });
}

export function loadPlanningContextDetail(
  windowRef: RequestWindow,
  id: string,
  callback: (result: PlanningContextDetailResult) => void
): void {
  windowRef.fetch(DETAIL_URL_PREFIX + encodeURIComponent(id), {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function(response: Response): Promise<unknown> | null {
    if (!response.ok) {
      callback({
        available: false,
        detail: null
      });
      return null;
    }

    return response.json();
  }).then(function(payload: unknown): void {
    if (!payload) {
      return;
    }

    callback({
      available: true,
      detail: normalizePlanningContextDetail(payload as PlanningContextPayload)
    });
  }).catch(function(): void {
    callback({
      available: false,
      detail: null
    });
  });
}

function findUi(documentRef: Document, name: string): HTMLElement | null {
  return documentRef.querySelector<HTMLElement>('[data-ui="' + name + '"]');
}

function appendListSection(
  documentRef: Document,
  container: HTMLElement,
  titleText: string,
  values: string[]
): void {
  const section = documentRef.createElement('section');
  section.className = 'planningContextSection';

  const title = documentRef.createElement('h4');
  title.className = 'planningContextSectionTitle';
  title.textContent = titleText;
  section.appendChild(title);

  const list = documentRef.createElement('ul');
  list.className = 'planningContextListBody';

  values.forEach(function(value: string): void {
    const item = documentRef.createElement('li');
    item.textContent = value;
    list.appendChild(item);
  });

  section.appendChild(list);
  container.appendChild(section);
}

export function renderPlanningContextDetail(
  documentRef: Document,
  result: PlanningContextDetailResult
): void {
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

  appendListSection(documentRef, container, 'Confidence rationale', detail.confidence.rationale);
  appendListSection(documentRef, container, 'Limitations', detail.limitations);
  appendListSection(documentRef, container, 'Unresolved questions', detail.unresolvedQuestions);
}

export function renderPlanningContext(documentRef: Document, result: PlanningContextResult): void {
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

  result.summaries.forEach(function(summary: PlanningContextSummary): void {
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

export function init(windowRef: RequestWindow, documentRef: Document): void {
  const status = findUi(documentRef, 'planning-context-status');
  const detailStatus = findUi(documentRef, 'planning-context-detail-status');
  const list = findUi(documentRef, 'planning-context-list');

  if (status) {
    status.textContent = 'Loading planning context...';
  }
  if (detailStatus) {
    detailStatus.textContent = 'Select a planning-context option to view descriptive detail.';
  }

  function selectDetail(id: string): void {
    selectedDetailId = id;
    renderPlanningContext(documentRef, currentResult);

    if (detailStatus) {
      detailStatus.textContent = 'Loading planning-context detail...';
    }

    loadPlanningContextDetail(windowRef, id, function(detailResult: PlanningContextDetailResult): void {
      renderPlanningContextDetail(documentRef, detailResult);
    });
  }

  let currentResult: PlanningContextResult = {
    available: false,
    summaries: []
  };

  if (list) {
    list.addEventListener('click', function(event: Event): void {
      const target = event.target as HTMLElement | null;
      const button = target ? target.closest('[data-planning-context-id]') as HTMLElement | null : null;

      if (!button) {
        return;
      }

      const id = button.getAttribute('data-planning-context-id');

      if (id) {
        selectDetail(id);
      }
    });
  }

  loadPlanningContext(windowRef, function(result: PlanningContextResult): void {
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
