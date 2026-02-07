// Vigil Demo UI — App Logic

// ============================================================
// Flag Taxonomy (for classification)
// ============================================================

const CLINICAL_FLAGS = [
  "MISSED_RISK_SIGNAL",
  "UNSAFE_REASSURANCE",
  "HARMFUL_ADVICE",
  "NORMALIZATION_OF_HARM",
  "FALSE_EQUIVALENCE",
];
const BOUNDARY_FLAGS = [
  "DIAGNOSTIC_CLAIM",
  "MEDICAL_ADVICE",
  "LEGAL_ADVICE",
  "SCOPE_CREEP",
  "DEPENDENCY_PATTERN",
  "INAPPROPRIATE_DISCLOSURE",
];
const REGULATION_FLAGS = [
  "STATE_MISMATCH",
  "PREMATURE_REFRAME",
  "MISSED_GROUNDING_NEED",
  "ESCALATION_RISK",
  "DISSOCIATION_UNADDRESSED",
];

// ============================================================
// State
// ============================================================

let scenarios = [];
let currentScenario = null;
let supabaseUrl = sessionStorage.getItem("vigil_supabase_url") || "";
let supabaseKey = sessionStorage.getItem("vigil_supabase_key") || "";
let auditTrail = []; // Accumulated audit entries across scenarios
let lastFullResult = null; // Last full audit record for modal
let isAuditExpanded = false;

// ============================================================
// DOM Elements
// ============================================================

const els = {
  supabaseUrl: document.getElementById("supabase-url"),
  supabaseKey: document.getElementById("supabase-key"),
  btnSaveConfig: document.getElementById("btn-save-config"),
  scenarioSelect: document.getElementById("scenario-select"),
  scenarioDesc: document.getElementById("scenario-desc"),
  conversationPane: document.getElementById("conversation-pane"),
  userMessage: document.getElementById("user-message"),
  aiResponse: document.getElementById("ai-response"),
  originalLabelBadge: document.getElementById("original-label-badge"),
  correctedContainer: document.getElementById("corrected-response-container"),
  correctedLabel: document.getElementById("corrected-label"),
  correctedBadge: document.getElementById("corrected-badge"),
  correctedResponse: document.getElementById("corrected-response"),
  passBadge: document.getElementById("pass-badge-container"),
  btnReview: document.getElementById("btn-review"),
  statusBar: document.getElementById("status-bar"),
  decisionBadge: document.getElementById("decision-badge"),
  latencyDisplay: document.getElementById("latency-display"),
  scorePills: document.getElementById("score-pills"),
  loadingState: document.getElementById("loading-state"),
  loadingDetail: document.getElementById("loading-detail"),
  emptyState: document.getElementById("empty-state"),
  resultsContainer: document.getElementById("results-container"),
  decisionSummaryCard: document.getElementById("decision-summary-card"),
  decisionBadgeLarge: document.getElementById("decision-badge-large"),
  statusMessage: document.getElementById("status-message"),
  summaryScore: document.getElementById("summary-score"),
  summaryConfidence: document.getElementById("summary-confidence"),
  summaryPeak: document.getElementById("summary-peak"),
  summaryBreadth: document.getElementById("summary-breadth"),
  agentScores: document.getElementById("agent-scores"),
  flagsSection: document.getElementById("flags-section"),
  flagsList: document.getElementById("flags-list"),
  changesSection: document.getElementById("changes-section"),
  changesList: document.getElementById("changes-list"),
  conflictsSection: document.getElementById("conflicts-section"),
  conflictsList: document.getElementById("conflicts-list"),
  decisionMath: document.getElementById("decision-math"),
  comparisonTable: document.getElementById("comparison-table"),
  auditId: document.getElementById("audit-id"),
  btnViewAudit: document.getElementById("btn-view-audit"),
  auditModal: document.getElementById("audit-modal"),
  btnCloseModal: document.getElementById("btn-close-modal"),
  auditJson: document.getElementById("audit-json"),
  auditTrailHeader: document.getElementById("audit-trail-header"),
  auditCountBadge: document.getElementById("audit-count-badge"),
  auditInlinePreview: document.getElementById("audit-inline-preview"),
  btnToggleAudit: document.getElementById("btn-toggle-audit"),
  auditChevron: document.getElementById("audit-chevron"),
  auditTrailBody: document.getElementById("audit-trail-body"),
  auditTrailRows: document.getElementById("audit-trail-rows"),
};

// ============================================================
// Initialization
// ============================================================

async function init() {
  // Restore config
  els.supabaseUrl.value = supabaseUrl;
  els.supabaseKey.value = supabaseKey;

  // Load scenarios
  try {
    const res = await fetch("scenarios.json");
    scenarios = await res.json();
    scenarios.sort((a, b) => (a.demo_order ?? 0) - (b.demo_order ?? 0));
    populateScenarioSelect();
  } catch (e) {
    console.error("Failed to load scenarios:", e);
  }

  // Event listeners
  els.btnSaveConfig.addEventListener("click", saveConfig);
  els.scenarioSelect.addEventListener("change", onScenarioChange);
  els.btnReview.addEventListener("click", runReview);
  els.btnViewAudit.addEventListener("click", viewAuditRecord);
  els.btnCloseModal.addEventListener("click", () =>
    els.auditModal.classList.add("hidden"),
  );
  els.auditModal.addEventListener("click", (e) => {
    if (e.target === els.auditModal) els.auditModal.classList.add("hidden");
  });

  // Audit trail toggle
  els.auditTrailHeader.addEventListener("click", toggleAuditTrail);

  // Event delegation: evidence toggles inside agent scores
  els.agentScores.addEventListener("click", (e) => {
    const toggle = e.target.closest(".evidence-toggle");
    if (!toggle) return;
    const content = toggle.nextElementSibling;
    if (!content) return;
    const arrow = toggle.querySelector(".evidence-arrow");
    const isExpanded = content.classList.toggle("expanded");
    toggle.setAttribute("aria-expanded", String(isExpanded));
    if (arrow) {
      arrow.style.transform = isExpanded ? "rotate(90deg)" : "rotate(0deg)";
    }
  });

  // Event delegation: evidence toggle keyboard accessibility
  els.agentScores.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const toggle = e.target.closest(".evidence-toggle");
    if (!toggle) return;
    e.preventDefault();
    toggle.click();
  });

  // Event delegation: audit trail row clicks
  els.auditTrailRows.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-index]");
    if (!row) return;
    loadAuditEntry(parseInt(row.dataset.index));
  });

  // Audit trail row keyboard accessibility
  els.auditTrailRows.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const row = e.target.closest("tr[data-index]");
    if (!row) return;
    e.preventDefault();
    loadAuditEntry(parseInt(row.dataset.index));
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboard);
}

function saveConfig() {
  supabaseUrl = els.supabaseUrl.value.trim().replace(/\/$/, "");
  supabaseKey = els.supabaseKey.value.trim();
  sessionStorage.setItem("vigil_supabase_url", supabaseUrl);
  sessionStorage.setItem("vigil_supabase_key", supabaseKey);
  els.btnSaveConfig.textContent = "Saved";
  setTimeout(() => (els.btnSaveConfig.textContent = "Save"), 1500);
  updateReviewButton();
}

function populateScenarioSelect() {
  scenarios.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.demo_order}. ${s.name}`;
    els.scenarioSelect.appendChild(opt);
  });
}

// ============================================================
// Keyboard Shortcuts
// ============================================================

function handleKeyboard(e) {
  // Don't trigger when typing in inputs or interacting with form controls
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.tagName === "SELECT"
  )
    return;

  // Don't trigger review shortcuts when modal is open
  if (!els.auditModal.classList.contains("hidden") && e.key !== "Escape")
    return;

  // 1-6: Select scenario by demo_order
  const num = parseInt(e.key);
  if (num >= 1 && num <= 6) {
    const scenario = scenarios.find((s) => s.demo_order === num);
    if (scenario) {
      els.scenarioSelect.value = scenario.id;
      onScenarioChange();
    }
    return;
  }

  // Enter or Space: Run analysis
  if (e.key === "Enter" || e.key === " ") {
    if (!els.btnReview.disabled) {
      e.preventDefault();
      runReview();
    }
    return;
  }

  // A: Toggle audit trail
  if (e.key === "a" || e.key === "A") {
    toggleAuditTrail();
    return;
  }

  // Escape: Close modal
  if (e.key === "Escape") {
    els.auditModal.classList.add("hidden");
  }
}

// ============================================================
// Scenario Selection
// ============================================================

function onScenarioChange() {
  const id = parseInt(els.scenarioSelect.value);
  currentScenario = scenarios.find((s) => s.id === id) || null;

  if (!currentScenario) {
    els.scenarioDesc.textContent = "";
    els.conversationPane.innerHTML = "";
    els.userMessage.textContent = "";
    els.aiResponse.textContent = "";
    els.aiResponse.classList.remove("response-struck");
    resetCorrectedResponse();
    updateReviewButton();
    return;
  }

  els.scenarioDesc.textContent = currentScenario.description;
  renderConversationHistory(currentScenario.input.conversation_history);
  els.userMessage.textContent = currentScenario.input.user_message;
  els.aiResponse.textContent = currentScenario.input.ai_response;
  els.aiResponse.classList.remove("response-struck");
  resetCorrectedResponse();
  updateReviewButton();

  // Reset results
  showEmptyState();
}

function renderConversationHistory(history) {
  els.conversationPane.innerHTML = "";
  if (!history || history.length === 0) {
    els.conversationPane.innerHTML =
      '<p class="text-xs text-gray-600 text-center py-4">No prior conversation history</p>';
    return;
  }

  history.forEach((msg) => {
    const div = document.createElement("div");
    const isUser = msg.role === "user";
    div.className = `p-3 text-sm opacity-70 ${isUser ? "msg-user ml-8" : "msg-assistant mr-8"}`;
    div.innerHTML = `
      <div class="text-[10px] ${isUser ? "text-blue-400" : "text-gray-500"} mb-1">${isUser ? "Patient" : "AI Therapist"}</div>
      <div class="${isUser ? "text-blue-100" : "text-gray-300"} text-xs">${escapeHtml(msg.content)}</div>
    `;
    els.conversationPane.appendChild(div);
  });

  // Add separator
  if (history.length > 0) {
    const sep = document.createElement("div");
    sep.className =
      "flex items-center gap-2 py-2 text-[10px] text-gray-600 uppercase tracking-wider";
    sep.innerHTML =
      '<div class="flex-1 border-t border-vigil-border/50"></div><span>Currently Under Review</span><div class="flex-1 border-t border-vigil-border/50"></div>';
    els.conversationPane.appendChild(sep);
  }

  // Scroll to bottom
  els.conversationPane.scrollTop = els.conversationPane.scrollHeight;
}

function resetCorrectedResponse() {
  els.correctedContainer.classList.add("hidden");
  els.passBadge.classList.add("hidden");
  els.originalLabelBadge.classList.add("hidden");
}

function updateReviewButton() {
  const hasConfig = supabaseUrl && supabaseKey;
  const hasScenario = !!currentScenario;
  els.btnReview.disabled = !(hasConfig && hasScenario);
}

// ============================================================
// Review Execution
// ============================================================

async function runReview() {
  if (!currentScenario || !supabaseUrl || !supabaseKey) return;

  showLoadingState();
  els.btnReview.disabled = true;
  els.btnReview.textContent = "Reviewing...";
  resetCorrectedResponse();
  els.aiResponse.classList.remove("response-struck");

  const startTime = Date.now();
  const sessionIdOverride = `demo-${Date.now()}`;

  const payload = {
    ...currentScenario.input,
    session_id: sessionIdOverride,
  };

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/vigil-review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const result = await res.json();
    const clientLatency = Date.now() - startTime;

    // Add to audit trail
    addAuditEntry(result, currentScenario);

    // Render results with animations
    renderResults(result, clientLatency);

    // Try to fetch full audit record for enriched details
    fetchAuditForDetails(result.audit_id, result);
  } catch (error) {
    showError(error.message);
  } finally {
    els.btnReview.disabled = false;
    els.btnReview.textContent = "Run Analysis";
    updateReviewButton();
  }
}

// ============================================================
// Results Rendering
// ============================================================

function showEmptyState() {
  els.emptyState.classList.remove("hidden");
  els.loadingState.classList.add("hidden");
  els.resultsContainer.classList.add("hidden");
  els.decisionBadge.classList.add("hidden");
  els.latencyDisplay.textContent = "";
  els.scorePills.innerHTML = "";
}

function showLoadingState() {
  els.emptyState.classList.add("hidden");
  els.loadingState.classList.remove("hidden");
  els.resultsContainer.classList.add("hidden");
  els.decisionBadge.classList.add("hidden");
  els.latencyDisplay.textContent = "";
  els.scorePills.innerHTML = "";
}

function showError(message) {
  els.loadingState.classList.add("hidden");
  els.resultsContainer.classList.remove("hidden");
  els.emptyState.classList.add("hidden");

  // Clear all sections
  els.agentScores.innerHTML = "";
  els.decisionMath.innerHTML = "";
  els.flagsSection.classList.add("hidden");
  els.changesSection.classList.add("hidden");
  els.conflictsSection.classList.add("hidden");

  // Show error in summary card
  els.decisionSummaryCard.className =
    "bg-vigil-card border border-red-800/40 rounded-lg p-4";
  els.decisionBadgeLarge.textContent = "ERROR";
  els.decisionBadgeLarge.className =
    "px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider bg-red-900 text-red-200";
  els.statusMessage.textContent = escapeHtml(message);
  els.statusMessage.className = "text-xs text-red-400";
  els.summaryScore.textContent = "--";
  els.summaryConfidence.textContent = "--";
  els.summaryPeak.textContent = "--";
  els.summaryBreadth.textContent = "--";
}

function renderResults(result, clientLatency) {
  els.loadingState.classList.add("hidden");
  els.emptyState.classList.add("hidden");
  els.resultsContainer.classList.remove("hidden");

  // Scroll right pane to top
  els.resultsContainer.scrollTop = 0;

  // --- Status Bar ---
  // Decision badge (small, in status bar)
  els.decisionBadge.classList.remove("hidden");
  els.decisionBadge.textContent = result.decision;
  els.decisionBadge.className = `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider decision-badge-enter ${getBadgeClass(result.decision)}`;

  // Latency
  const serverSec = (result.latency_ms / 1000).toFixed(1);
  const clientSec = (clientLatency / 1000).toFixed(1);
  els.latencyDisplay.textContent = `Pipeline: ${serverSec}s / Total: ${clientSec}s`;

  // Score pills
  els.scorePills.innerHTML = `
    <span class="px-2 py-0.5 rounded ${getScoreBg(result.final_score)}">Score: ${result.final_score.toFixed(3)}</span>
    <span class="px-2 py-0.5 rounded bg-vigil-card border border-vigil-border">Flags: ${result.flag_count}</span>
  `;

  // --- Decision Summary Card ---
  const cardClass =
    result.decision === "ESCALATE" ? "decision-card-escalate" : "";
  els.decisionSummaryCard.className = `bg-vigil-card border border-vigil-border rounded-lg p-4 ${cardClass}`;

  els.decisionBadgeLarge.textContent = formatDecision(result.decision);
  els.decisionBadgeLarge.className = `px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider decision-badge-enter ${getBadgeClass(result.decision)}`;

  els.statusMessage.textContent = getStatusMessage(result.decision);
  els.statusMessage.className = "text-xs text-gray-400";

  els.summaryScore.textContent = result.final_score.toFixed(3);
  els.summaryScore.className = `text-lg font-bold font-mono ${getScoreColor(result.final_score)}`;
  els.summaryConfidence.textContent = result.confidence.toFixed(2);
  els.summaryPeak.textContent = result.peak_score.toFixed(3);
  els.summaryBreadth.textContent =
    result.breadth_bonus > 0
      ? `+${result.breadth_bonus.toFixed(2)} (${result.flag_count} agents)`
      : "0.00";

  // --- Left Pane: Corrected Response ---
  renderLeftPaneResult(result);

  // --- Agent Scores (placeholder until full audit loads) ---
  renderAgentScoresPlaceholder(result);

  // --- Flags ---
  renderFlags(result);

  // --- Decision Math ---
  renderDecisionMath(result);

  // --- Comparison Table ---
  renderComparison(result);

  // --- Audit Record ---
  els.auditId.textContent = result.audit_id
    ? `ID: ${result.audit_id}`
    : "No audit ID";
  if (result.audit_id && !result.audit_id.startsWith("error-")) {
    els.btnViewAudit.classList.remove("hidden");
    els.btnViewAudit.dataset.auditId = result.audit_id;
  } else {
    els.btnViewAudit.classList.add("hidden");
  }
}

// ============================================================
// Left Pane Result Rendering
// ============================================================

function renderLeftPaneResult(result) {
  if (result.decision === "PASS") {
    // Show pass badge, no corrected response
    els.passBadge.classList.remove("hidden");
    els.correctedContainer.classList.add("hidden");
    els.originalLabelBadge.classList.add("hidden");
    els.aiResponse.classList.remove("response-struck");
    els.aiResponse.className =
      "bg-green-900/10 border border-green-800/20 rounded-xl rounded-bl p-3 text-sm text-green-100 min-h-[50px] relative transition-all duration-300";
  } else {
    // Show strikethrough on original + corrected response
    els.passBadge.classList.add("hidden");
    els.originalLabelBadge.classList.remove("hidden");
    els.originalLabelBadge.textContent = "(Original)";
    els.originalLabelBadge.className =
      "text-[10px] px-1.5 py-0.5 rounded ml-1 bg-red-900/30 text-red-300";
    els.aiResponse.classList.add("response-struck");
    els.aiResponse.className =
      "bg-red-900/10 border border-red-800/20 rounded-xl rounded-bl p-3 text-sm min-h-[50px] relative transition-all duration-300 response-struck";

    // Show corrected response
    els.correctedContainer.classList.remove("hidden");
    els.correctedResponse.textContent = result.final_response;

    // Badge label depends on decision
    if (result.decision === "BLOCK_AND_REPLACE") {
      els.correctedBadge.textContent = "Replaced by Vigil";
      els.correctedBadge.className =
        "text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-900/30 text-red-300";
    } else if (result.decision === "ESCALATE") {
      els.correctedBadge.textContent = "Crisis Protocol";
      els.correctedBadge.className =
        "text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-800/40 text-red-200 animate-pulse";
    } else {
      els.correctedBadge.textContent = "Rewritten for Safety";
      els.correctedBadge.className =
        "text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-900/30 text-amber-300";
    }

    // Pulse animation on corrected response
    els.correctedResponse.classList.add("corrected-pulse");
    setTimeout(
      () => els.correctedResponse.classList.remove("corrected-pulse"),
      600,
    );
  }
}

// ============================================================
// Agent Score Rendering
// ============================================================

function renderAgentScoresPlaceholder(result) {
  // Show placeholder cards that will be enriched when audit data loads
  const agents = [
    { name: "Clinical Safety", type: "clinical" },
    { name: "Boundary", type: "boundary" },
    { name: "Regulation-Aware", type: "regulation" },
    { name: "Escalation", type: "escalation" },
  ];

  els.agentScores.innerHTML = agents
    .map(
      (a, i) => `
    <div class="bg-vigil-card border border-vigil-border rounded p-3 agent-card-enter" style="animation-delay: ${i * 100}ms">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-gray-300">${a.name}</span>
        <span class="text-xs text-gray-500 font-mono loading-shimmer px-3 rounded">&nbsp;&nbsp;&nbsp;</span>
      </div>
      <div class="score-bar mb-2">
        <div class="score-bar-fill score-yellow" style="width: 0%"></div>
      </div>
      <div class="text-[10px] text-gray-600">Loading agent details...</div>
    </div>
  `,
    )
    .join("");
}

function renderAgentCards(reports, decision) {
  const cards = [];

  // Clinical Safety
  if (reports.clinical_safety) {
    const cs = reports.clinical_safety;
    cards.push(
      agentCard(
        "Clinical Safety",
        cs.risk_score,
        cs.confidence,
        cs.flags,
        "clinical",
        cs.evidence,
        cs.recommendation,
        cs.suggested_elements,
        decision,
        0,
      ),
    );
  }

  // Boundary
  if (reports.boundary) {
    const b = reports.boundary;
    cards.push(
      agentCard(
        "Boundary",
        b.violation_score,
        b.confidence,
        b.flags,
        "boundary",
        b.evidence,
        b.recommendation,
        b.suggested_elements,
        decision,
        1,
      ),
    );
  }

  // Regulation
  if (reports.regulation_aware) {
    const r = reports.regulation_aware;
    const extra = `State: ${formatState(r.inferred_state)} (${r.state_confidence.toFixed(2)})`;
    cards.push(
      agentCard(
        "Regulation-Aware",
        r.dysregulation_risk,
        r.confidence,
        r.flags,
        "regulation",
        r.evidence,
        r.recommendation,
        r.suggested_elements,
        decision,
        2,
        extra,
      ),
    );
  }

  // Escalation
  if (reports.escalation) {
    const e = reports.escalation;
    const escScore =
      {
        LEVEL_0: 0,
        LEVEL_1: 0.25,
        LEVEL_2: 0.5,
        LEVEL_3: 0.75,
        LEVEL_4: 1.0,
      }[e.escalation_level] || 0;
    const extra = `${e.escalation_level} | ${formatImminence(e.imminence)} | ${formatRiskType(e.risk_type)}`;
    cards.push(
      agentCard(
        "Escalation",
        escScore,
        e.confidence,
        e.escalation_level !== "LEVEL_0"
          ? [`${e.escalation_level}: ${formatRiskType(e.risk_type)}`]
          : [],
        "escalation",
        e.evidence,
        null,
        e.protocol ? [e.protocol] : [],
        decision,
        3,
        extra,
      ),
    );
  }

  els.agentScores.innerHTML = cards.join("");

  // Animate score bars after cards are in DOM (single rAF, no nested setTimeout)
  requestAnimationFrame(() => {
    const bars = els.agentScores.querySelectorAll(".score-bar-fill");
    bars.forEach((bar) => {
      const target = bar.dataset.targetWidth;
      if (target) bar.style.width = target;
    });
  });

  // Evidence toggles are handled via event delegation in init()
}

function agentCard(
  name,
  score,
  confidence,
  flags,
  type,
  evidence,
  recommendation,
  suggestedElements,
  decision,
  index,
  extra = "",
) {
  const scoreColor =
    score < 0.3 ? "score-green" : score < 0.7 ? "score-yellow" : "score-red";
  const scoreTextColor =
    score < 0.3
      ? "text-green-400"
      : score < 0.7
        ? "text-yellow-400"
        : "text-red-400";

  // Determine highlight based on whether this agent flagged and overall decision
  let highlightClass = "";
  if (flags.length > 0) {
    if (decision === "ESCALATE") highlightClass = "agent-highlight-darkred";
    else if (
      decision === "BLOCK_AND_REPLACE" ||
      (score >= 0.7 && flags.length > 0)
    )
      highlightClass = "agent-highlight-red";
    else if (decision === "REWRITE") highlightClass = "agent-highlight-amber";
  }

  const recBadge = recommendation
    ? `<span class="text-[10px] px-1.5 py-0.5 rounded ${getRecBadgeClass(recommendation)}">${recommendation}</span>`
    : "";

  const evidenceId = `evidence-${type}`;

  return `
    <div class="bg-vigil-card border border-vigil-border rounded p-3 agent-card-enter ${highlightClass}" style="animation-delay: ${index * 100}ms">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-gray-300">${name}</span>
          ${recBadge}
        </div>
        <span class="text-xs ${scoreTextColor} font-mono font-bold">${score.toFixed(3)}</span>
      </div>
      <div class="score-bar mb-2">
        <div class="score-bar-fill ${scoreColor}" data-target-width="${score * 100}%"></div>
      </div>
      <div class="text-[10px] text-gray-500 mb-1">Confidence: ${confidence.toFixed(2)}</div>
      ${extra ? `<div class="text-[10px] text-gray-500 mb-1">${escapeHtml(extra)}</div>` : ""}
      ${
        flags.length > 0
          ? `<div class="flex flex-wrap gap-1 mt-1 mb-2">${flags.map((f) => `<span class="flag-pill flag-${type}">${escapeHtml(String(f))}</span>`).join("")}</div>`
          : '<div class="text-[10px] text-gray-600 italic mb-2">No flags</div>'
      }
      ${
        evidence
          ? `
        <div class="evidence-toggle text-[10px] text-gray-600 flex items-center gap-1 mt-1" tabindex="0" role="button" aria-expanded="false" aria-label="Toggle evidence for ${escapeHtml(name)}">
          <span class="evidence-arrow inline-block transition-transform" style="font-size: 8px;">&#9654;</span>
          <span>Show evidence</span>
        </div>
        <div class="evidence-content mt-1">
          <div class="text-[10px] text-gray-400 leading-relaxed p-2 bg-vigil-dark/30 rounded">${escapeHtml(evidence)}</div>
          ${
            suggestedElements && suggestedElements.length > 0
              ? `<div class="mt-1 p-2 bg-vigil-dark/30 rounded">
              <div class="text-[10px] text-gray-500 mb-1">Suggested elements:</div>
              <ul class="text-[10px] text-gray-400 list-disc pl-4 space-y-0.5">
                ${suggestedElements.map((el) => `<li>${escapeHtml(el)}</li>`).join("")}
              </ul>
            </div>`
              : ""
          }
        </div>
      `
          : ""
      }
    </div>
  `;
}

// ============================================================
// Fetch Full Audit for Agent Details
// ============================================================

async function fetchAuditForDetails(auditId, summaryResult) {
  if (!auditId || auditId.startsWith("error-")) {
    return;
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/vigil-review?id=${encodeURIComponent(auditId)}`,
      {
        headers: { Authorization: `Bearer ${supabaseKey}` },
      },
    );
    if (!res.ok) return;
    const audit = await res.json();
    lastFullResult = audit;

    if (audit.agent_reports) {
      renderAgentCards(audit.agent_reports, summaryResult.decision);
    }

    // Render changes and conflicts from rewrite_result
    if (audit.rewrite_result) {
      renderChanges(audit.rewrite_result.changes_made);
      renderConflicts(audit.rewrite_result.conflict_resolutions);
    } else if (audit.changes_made && audit.changes_made.length > 0) {
      renderChanges(audit.changes_made);
    }
  } catch (e) {
    console.warn("Could not fetch audit details:", e.message);
  }
}

// ============================================================
// Changes & Conflicts Rendering
// ============================================================

function renderChanges(changes) {
  if (!changes || changes.length === 0) {
    els.changesSection.classList.add("hidden");
    return;
  }

  els.changesSection.classList.remove("hidden");
  els.changesList.innerHTML = changes
    .map((c) => {
      const typeClass =
        c.type === "REMOVED"
          ? "change-removed"
          : c.type === "ADDED"
            ? "change-added"
            : "change-modified";
      const icon = c.type === "REMOVED" ? "-" : c.type === "ADDED" ? "+" : "~";
      const iconColor =
        c.type === "REMOVED"
          ? "text-red-400"
          : c.type === "ADDED"
            ? "text-green-400"
            : "text-yellow-400";

      return `
      <div class="rounded p-2 ${typeClass}">
        <div class="flex items-start gap-2">
          <span class="text-sm font-bold ${iconColor} mt-0.5">${icon}</span>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-mono text-gray-200">${escapeHtml(c.content)}</div>
            <div class="text-[10px] text-gray-500 mt-1">${escapeHtml(c.reason)}</div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderConflicts(conflicts) {
  if (!conflicts || conflicts.length === 0) {
    els.conflictsSection.classList.add("hidden");
    return;
  }

  els.conflictsSection.classList.remove("hidden");
  els.conflictsList.innerHTML = conflicts
    .map(
      (c) => `
    <div class="conflict-callout p-3">
      <div class="text-xs font-semibold text-amber-300 mb-1">Conflict between ${c.agents.map((a) => escapeHtml(a)).join(" and ")}</div>
      <div class="text-[10px] text-gray-400 mb-1"><span class="text-gray-500">Issue:</span> ${escapeHtml(c.conflict)}</div>
      <div class="text-[10px] text-gray-300"><span class="text-gray-500">Resolution:</span> ${escapeHtml(c.resolution)}</div>
    </div>
  `,
    )
    .join("");
}

// ============================================================
// Flags Rendering
// ============================================================

function renderFlags(result) {
  if (result.flags_summary && result.flags_summary.length > 0) {
    els.flagsSection.classList.remove("hidden");
    els.flagsList.innerHTML = result.flags_summary
      .map((f) => {
        const source = getFlagSource(f);
        const flagClass = getFlagClass(f);
        return `
        <div class="flex items-center gap-2">
          <span class="text-yellow-500 text-xs">&#9888;</span>
          <span class="flag-pill ${flagClass}">${escapeHtml(f)}</span>
          <span class="text-[10px] text-gray-600">from ${source}</span>
        </div>
      `;
      })
      .join("");
  } else {
    els.flagsSection.classList.remove("hidden");
    els.flagsList.innerHTML =
      '<div class="flex items-center gap-2 text-green-500 text-xs"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span>No safety flags raised</span></div>';
  }
}

function getFlagSource(flag) {
  if (CLINICAL_FLAGS.includes(flag)) return "Clinical Safety";
  if (BOUNDARY_FLAGS.includes(flag)) return "Boundary";
  if (REGULATION_FLAGS.includes(flag)) return "Regulation-Aware";
  return "Escalation";
}

// ============================================================
// Decision Math Rendering
// ============================================================

function renderDecisionMath(result) {
  els.decisionMath.innerHTML = `
    <div class="text-gray-400">peak_score    = <span class="text-white">${result.peak_score.toFixed(3)}</span></div>
    <div class="text-gray-400">breadth_bonus = <span class="text-white">${result.breadth_bonus.toFixed(3)}</span> <span class="text-gray-600">(${result.flag_count} flagging agents, bonus = min(0.25, 0.10 * max(0, ${result.flag_count} - 1)))</span></div>
    <div class="text-gray-400">final_score   = <span class="text-white">${result.final_score.toFixed(3)}</span> <span class="text-gray-600">= min(1.0, ${result.peak_score.toFixed(3)} + ${result.breadth_bonus.toFixed(3)})</span></div>
    <div class="text-gray-400">confidence    = <span class="text-white">${result.confidence.toFixed(3)}</span></div>
    <div class="text-gray-400 mt-1">threshold     = <span class="text-white">${getThresholdExplanation(result.final_score, result.decision)}</span></div>
    ${result.escalation_level !== "LEVEL_0" ? `<div class="text-gray-400">escalation    = <span class="text-white">${result.escalation_level}</span> <span class="text-gray-600">(override applied)</span></div>` : ""}
    <div class="text-gray-400 mt-1 pt-1 border-t border-vigil-border">decision      = <span class="font-bold ${getDecisionColor(result.decision)}">${result.decision}</span></div>
  `;
}

// ============================================================
// Comparison Table Rendering
// ============================================================

function renderComparison(result) {
  if (!currentScenario) return;

  const expected = currentScenario;
  const rows = [];

  // Decision
  const decMatch = result.decision === expected.expected_decision;
  rows.push(
    cmpRow(
      "Decision",
      expected.expected_decision,
      result.decision,
      decMatch ? "match" : "mismatch",
    ),
  );

  // Score range
  const [lo, hi] = expected.expected_score_range;
  const inRange = result.final_score >= lo && result.final_score <= hi;
  rows.push(
    cmpRow(
      "Final Score",
      `${lo.toFixed(2)} - ${hi.toFixed(2)}`,
      result.final_score.toFixed(3),
      inRange ? "match" : "range",
    ),
  );

  // Escalation level
  const escMatch =
    result.escalation_level === expected.expected_escalation_level;
  rows.push(
    cmpRow(
      "Escalation",
      expected.expected_escalation_level,
      result.escalation_level,
      escMatch ? "match" : "mismatch",
    ),
  );

  // Flags
  const expectedFlags = new Set(expected.expected_flags);
  const actualFlags = new Set(result.flags_summary || []);
  const allExpectedPresent = [...expectedFlags].every((f) =>
    actualFlags.has(f),
  );
  rows.push(
    cmpRow(
      "Flags",
      expected.expected_flags.join(", ") || "(none)",
      (result.flags_summary || []).join(", ") || "(none)",
      allExpectedPresent ? "match" : "mismatch",
    ),
  );

  els.comparisonTable.innerHTML = `
    <table class="w-full text-xs">
      <thead>
        <tr class="border-b border-vigil-border">
          <th class="text-left p-2 text-gray-500 font-normal">Metric</th>
          <th class="text-left p-2 text-gray-500 font-normal">Expected</th>
          <th class="text-left p-2 text-gray-500 font-normal">Actual</th>
          <th class="text-center p-2 text-gray-500 font-normal w-8"></th>
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function cmpRow(metric, expected, actual, status) {
  const icon =
    status === "match"
      ? '<span class="cmp-match">&#10003;</span>'
      : status === "range"
        ? '<span class="cmp-range">&#9888;</span>'
        : '<span class="cmp-mismatch">&#10007;</span>';
  return `
    <tr class="border-b border-vigil-border/50">
      <td class="p-2 text-gray-400">${metric}</td>
      <td class="p-2 text-gray-300 font-mono">${escapeHtml(String(expected))}</td>
      <td class="p-2 text-white font-mono">${escapeHtml(String(actual))}</td>
      <td class="p-2 text-center">${icon}</td>
    </tr>
  `;
}

// ============================================================
// Audit Trail
// ============================================================

function addAuditEntry(result, scenario) {
  const entry = {
    index: auditTrail.length + 1,
    decision: result.decision,
    score: result.final_score,
    confidence: result.confidence,
    flagCount: result.flag_count,
    latency: result.latency_ms,
    scenarioName: scenario.name,
    auditId: result.audit_id,
    result: result,
    scenario: scenario,
  };
  auditTrail.push(entry);
  updateAuditTrailDisplay();
}

function updateAuditTrailDisplay() {
  // Count badge
  const count = auditTrail.length;
  els.auditCountBadge.textContent = `${count} record${count !== 1 ? "s" : ""}`;

  // Inline preview (mini badges)
  els.auditInlinePreview.innerHTML = auditTrail
    .map(
      (e) => `
    <span class="audit-mini-badge ${getBadgeClass(e.decision)}">#${e.index} ${e.decision} (${e.score.toFixed(2)})</span>
  `,
    )
    .join("");

  // Scroll inline preview to end
  els.auditInlinePreview.scrollLeft = els.auditInlinePreview.scrollWidth;

  // Table rows
  const newRow = auditTrail[auditTrail.length - 1];
  const row = document.createElement("tr");
  row.className =
    "border-b border-vigil-border/30 hover:bg-vigil-card/30 cursor-pointer audit-row-enter";
  row.dataset.index = newRow.index - 1;
  row.setAttribute("tabindex", "0");
  row.setAttribute("role", "button");
  row.setAttribute(
    "aria-label",
    `Audit entry ${newRow.index}: ${newRow.scenarioName}, decision ${newRow.decision}`,
  );
  row.innerHTML = `
    <td class="p-2 pl-4 text-gray-500">${newRow.index}</td>
    <td class="p-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${getBadgeClass(newRow.decision)}">${newRow.decision}</span></td>
    <td class="p-2 font-mono ${getScoreColor(newRow.score)}">${newRow.score.toFixed(3)}</td>
    <td class="p-2 font-mono text-gray-400">${newRow.confidence.toFixed(2)}</td>
    <td class="p-2 text-gray-400">${newRow.flagCount}</td>
    <td class="p-2 text-gray-500">${(newRow.latency / 1000).toFixed(1)}s</td>
    <td class="p-2 text-gray-500 truncate max-w-[150px]">${escapeHtml(newRow.scenarioName)}</td>
  `;
  // Click handled via event delegation in init()
  els.auditTrailRows.appendChild(row);
}

function loadAuditEntry(index) {
  const entry = auditTrail[index];
  if (!entry) return;

  // Update scenario selection
  currentScenario = entry.scenario;
  els.scenarioSelect.value = entry.scenario.id;
  els.scenarioDesc.textContent = entry.scenario.description;
  renderConversationHistory(entry.scenario.input.conversation_history);
  els.userMessage.textContent = entry.scenario.input.user_message;
  els.aiResponse.textContent = entry.scenario.input.ai_response;

  // Render the result
  renderResults(entry.result, entry.latency);

  // Try to fetch full audit
  fetchAuditForDetails(entry.auditId, entry.result);

  // Highlight selected row
  els.auditTrailRows
    .querySelectorAll("tr")
    .forEach((r) => r.classList.remove("audit-row-selected"));
  const rows = els.auditTrailRows.querySelectorAll("tr");
  if (rows[index]) rows[index].classList.add("audit-row-selected");
}

function toggleAuditTrail() {
  isAuditExpanded = !isAuditExpanded;
  if (isAuditExpanded) {
    els.auditTrailBody.classList.remove("hidden");
    els.auditChevron.style.transform = "rotate(180deg)";
  } else {
    els.auditTrailBody.classList.add("hidden");
    els.auditChevron.style.transform = "rotate(0deg)";
  }
}

// ============================================================
// Audit Modal
// ============================================================

async function viewAuditRecord() {
  const auditId = els.btnViewAudit.dataset.auditId;
  if (!auditId) return;

  els.auditJson.textContent = "Loading...";
  els.auditModal.classList.remove("hidden");

  // Focus the close button for keyboard accessibility
  els.btnCloseModal.focus();

  // Use cached data if available
  if (lastFullResult && String(lastFullResult.id) === String(auditId)) {
    els.auditJson.textContent = JSON.stringify(lastFullResult, null, 2);
    return;
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/vigil-review?id=${encodeURIComponent(auditId)}`,
      {
        headers: { Authorization: `Bearer ${supabaseKey}` },
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    lastFullResult = data;
    els.auditJson.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    els.auditJson.textContent = `Error: ${e.message}`;
  }
}

// ============================================================
// Helpers
// ============================================================

function escapeHtml(str) {
  if (str == null) return "";
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function getBadgeClass(decision) {
  switch (decision) {
    case "PASS":
      return "badge-pass";
    case "REWRITE":
      return "badge-rewrite";
    case "BLOCK_AND_REPLACE":
      return "badge-block";
    case "ESCALATE":
      return "badge-escalate";
    case "ASK_HUMAN":
      return "badge-ask-human";
    default:
      return "bg-gray-600 text-white";
  }
}

function getScoreBg(score) {
  if (score < 0.3)
    return "bg-green-900/30 text-green-300 border border-green-800/30";
  if (score < 0.7)
    return "bg-yellow-900/30 text-yellow-300 border border-yellow-800/30";
  return "bg-red-900/30 text-red-300 border border-red-800/30";
}

function getScoreColor(score) {
  if (score < 0.3) return "text-green-400";
  if (score < 0.7) return "text-yellow-400";
  return "text-red-400";
}

function getFlagClass(flag) {
  if (CLINICAL_FLAGS.includes(flag)) return "flag-clinical";
  if (BOUNDARY_FLAGS.includes(flag)) return "flag-boundary";
  if (REGULATION_FLAGS.includes(flag)) return "flag-regulation";
  return "flag-escalation";
}

function getThresholdExplanation(score, decision) {
  if (score < 0.3) return `${score.toFixed(3)} < 0.30 -> PASS`;
  if (score < 0.7) return `0.30 <= ${score.toFixed(3)} < 0.70 -> REWRITE`;
  if (score < 0.9)
    return `0.70 <= ${score.toFixed(3)} < 0.90 -> BLOCK_AND_REPLACE`;
  return `${score.toFixed(3)} >= 0.90 -> ESCALATE`;
}

function getDecisionColor(decision) {
  switch (decision) {
    case "PASS":
      return "text-green-400";
    case "REWRITE":
      return "text-yellow-400";
    case "BLOCK_AND_REPLACE":
      return "text-red-400";
    case "ESCALATE":
      return "text-red-500";
    case "ASK_HUMAN":
      return "text-purple-400";
    default:
      return "text-gray-400";
  }
}

function getRecBadgeClass(recommendation) {
  switch (recommendation) {
    case "PASS":
      return "bg-green-900/30 text-green-400 border border-green-800/30";
    case "REWRITE":
      return "bg-yellow-900/30 text-yellow-400 border border-yellow-800/30";
    case "BLOCK_AND_REPLACE":
      return "bg-red-900/30 text-red-400 border border-red-800/30";
    case "ESCALATE":
      return "bg-red-800/40 text-red-300 border border-red-700/30";
    default:
      return "bg-gray-800/30 text-gray-400 border border-gray-700/30";
  }
}

function formatDecision(decision) {
  switch (decision) {
    case "BLOCK_AND_REPLACE":
      return "BLOCKED";
    case "ASK_HUMAN":
      return "HUMAN REVIEW";
    default:
      return decision;
  }
}

function getStatusMessage(decision) {
  switch (decision) {
    case "PASS":
      return "Response passed safety review";
    case "REWRITE":
      return "Response rewritten for safety";
    case "BLOCK_AND_REPLACE":
      return "Response blocked and replaced";
    case "ESCALATE":
      return "Crisis protocol activated -- immediate escalation";
    case "ASK_HUMAN":
      return "Flagged for human clinician review";
    default:
      return "";
  }
}

function formatState(state) {
  switch (state) {
    case "ventral_vagal_regulated":
      return "Regulated";
    case "sympathetic_activation":
      return "Fight/Flight";
    case "dorsal_vagal_shutdown":
      return "Shutdown";
    case "mixed_state":
      return "Mixed";
    default:
      return state || "Unknown";
  }
}

function formatImminence(imminence) {
  switch (imminence) {
    case "imminent":
      return "Imminent";
    case "non_imminent_but_elevated":
      return "Elevated";
    case "chronic":
      return "Chronic";
    default:
      return imminence || "Uncertain";
  }
}

function formatRiskType(type) {
  if (!type || type === "other") return "Other";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================
// Boot
// ============================================================

init();
