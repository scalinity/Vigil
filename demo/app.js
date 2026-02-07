// Vigil Demo UI — App Logic

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
let supabaseUrl = localStorage.getItem("vigil_supabase_url") || "";
let supabaseKey = localStorage.getItem("vigil_supabase_key") || "";

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
  btnReview: document.getElementById("btn-review"),
  statusBar: document.getElementById("status-bar"),
  decisionBadge: document.getElementById("decision-badge"),
  latencyDisplay: document.getElementById("latency-display"),
  scorePills: document.getElementById("score-pills"),
  loadingState: document.getElementById("loading-state"),
  loadingDetail: document.getElementById("loading-detail"),
  emptyState: document.getElementById("empty-state"),
  resultsContainer: document.getElementById("results-container"),
  finalResponse: document.getElementById("final-response"),
  flagsSection: document.getElementById("flags-section"),
  flagsList: document.getElementById("flags-list"),
  agentScores: document.getElementById("agent-scores"),
  decisionMath: document.getElementById("decision-math"),
  comparisonTable: document.getElementById("comparison-table"),
  auditId: document.getElementById("audit-id"),
  btnViewAudit: document.getElementById("btn-view-audit"),
  auditModal: document.getElementById("audit-modal"),
  btnCloseModal: document.getElementById("btn-close-modal"),
  auditJson: document.getElementById("audit-json"),
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
    scenarios.sort((a, b) => a.demo_order - b.demo_order);
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
}

function saveConfig() {
  supabaseUrl = els.supabaseUrl.value.trim().replace(/\/$/, "");
  supabaseKey = els.supabaseKey.value.trim();
  localStorage.setItem("vigil_supabase_url", supabaseUrl);
  localStorage.setItem("vigil_supabase_key", supabaseKey);
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
    updateReviewButton();
    return;
  }

  els.scenarioDesc.textContent = currentScenario.description;
  renderConversationHistory(currentScenario.input.conversation_history);
  els.userMessage.textContent = currentScenario.input.user_message;
  els.aiResponse.textContent = currentScenario.input.ai_response;
  updateReviewButton();

  // Reset results
  showEmptyState();
}

function renderConversationHistory(history) {
  els.conversationPane.innerHTML = "";
  if (!history || history.length === 0) {
    els.conversationPane.innerHTML =
      '<p class="text-xs text-gray-600 text-center">No prior conversation history</p>';
    return;
  }

  history.forEach((msg) => {
    const div = document.createElement("div");
    const isUser = msg.role === "user";
    div.className = `p-3 text-sm ${isUser ? "msg-user ml-8" : "msg-assistant mr-8"}`;
    div.innerHTML = `
      <div class="text-[10px] ${isUser ? "text-blue-400" : "text-gray-500"} mb-1">${isUser ? "User" : "AI Therapist"}</div>
      <div class="${isUser ? "text-blue-100" : "text-gray-300"}">${escapeHtml(msg.content)}</div>
    `;
    els.conversationPane.appendChild(div);
  });
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const result = await res.json();
    const clientLatency = Date.now() - startTime;
    renderResults(result, clientLatency);
  } catch (error) {
    showError(error.message);
  } finally {
    els.btnReview.disabled = false;
    els.btnReview.textContent = "Run Vigil Review";
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
  els.finalResponse.innerHTML = `<span class="text-red-400">Error: ${escapeHtml(message)}</span>`;
  els.flagsSection.classList.add("hidden");
  els.agentScores.innerHTML = "";
  els.decisionMath.innerHTML = "";
}

function renderResults(result, clientLatency) {
  els.loadingState.classList.add("hidden");
  els.emptyState.classList.add("hidden");
  els.resultsContainer.classList.remove("hidden");

  // Decision badge
  els.decisionBadge.classList.remove("hidden");
  els.decisionBadge.textContent = result.decision;
  els.decisionBadge.className = `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getBadgeClass(result.decision)}`;

  // Latency
  els.latencyDisplay.textContent = `${result.latency_ms}ms server / ${clientLatency}ms total`;

  // Score pills
  els.scorePills.innerHTML = `
    <span class="px-2 py-0.5 rounded ${getScoreBg(result.final_score)}">Score: ${result.final_score.toFixed(3)}</span>
    <span class="px-2 py-0.5 rounded bg-vigil-card border border-vigil-border">Confidence: ${result.confidence.toFixed(2)}</span>
    <span class="px-2 py-0.5 rounded bg-vigil-card border border-vigil-border">Flags: ${result.flag_count}</span>
  `;

  // Final response
  els.finalResponse.textContent = result.final_response;
  if (result.decision === "PASS") {
    els.finalResponse.className =
      "bg-vigil-card border border-green-800/30 rounded p-4 text-sm leading-relaxed whitespace-pre-wrap text-green-100";
  } else if (result.decision === "ESCALATE") {
    els.finalResponse.className =
      "bg-red-900/20 border border-red-700/40 rounded p-4 text-sm leading-relaxed whitespace-pre-wrap text-red-100";
  } else {
    els.finalResponse.className =
      "bg-vigil-card border border-yellow-800/30 rounded p-4 text-sm leading-relaxed whitespace-pre-wrap text-yellow-100";
  }

  // Flags
  if (result.flags_summary && result.flags_summary.length > 0) {
    els.flagsSection.classList.remove("hidden");
    els.flagsList.innerHTML = result.flags_summary
      .map((f) => `<span class="flag-pill ${getFlagClass(f)}">${f}</span>`)
      .join("");
  } else {
    els.flagsSection.classList.add("hidden");
  }

  // Agent scores — fetch full audit for agent details
  renderAgentScoresFromResponse(result);

  // Decision math
  renderDecisionMath(result);

  // Comparison table
  renderComparison(result);

  // Audit record
  els.auditId.textContent = `ID: ${result.audit_id}`;
  if (result.audit_id && !result.audit_id.startsWith("AUDIT")) {
    els.btnViewAudit.classList.remove("hidden");
    els.btnViewAudit.dataset.auditId = result.audit_id;
  } else {
    els.btnViewAudit.classList.add("hidden");
  }
}

function renderAgentScoresFromResponse(result) {
  // We only have summary data in the response.
  // Fetch the full audit record for agent details.
  if (
    result.audit_id &&
    !result.audit_id.startsWith("AUDIT") &&
    !result.audit_id.startsWith("PIPELINE")
  ) {
    fetchAuditForAgentDetails(result.audit_id);
  } else {
    els.agentScores.innerHTML = `
      <div class="text-xs text-gray-500 col-span-2">Agent details available in full audit record</div>
    `;
  }
}

async function fetchAuditForAgentDetails(auditId) {
  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/vigil-review?id=${auditId}`,
      {
        headers: { Authorization: `Bearer ${supabaseKey}` },
      },
    );
    if (!res.ok) throw new Error("Failed to fetch audit");
    const audit = await res.json();
    if (audit.agent_reports) {
      renderAgentCards(audit.agent_reports);
    }
  } catch (e) {
    els.agentScores.innerHTML = `
      <div class="text-xs text-gray-500 col-span-2">Could not load agent details: ${escapeHtml(e.message)}</div>
    `;
  }
}

function renderAgentCards(reports) {
  const cards = [];

  // Clinical Safety
  const cs = reports.clinical_safety;
  cards.push(
    agentCard(
      "Clinical Safety",
      cs.risk_score,
      cs.confidence,
      cs.flags,
      "clinical",
    ),
  );

  // Boundary
  const b = reports.boundary;
  cards.push(
    agentCard("Boundary", b.violation_score, b.confidence, b.flags, "boundary"),
  );

  // Regulation
  const r = reports.regulation_aware;
  cards.push(
    agentCard(
      "Regulation",
      r.dysregulation_risk,
      r.confidence,
      r.flags,
      "regulation",
      `State: ${r.inferred_state} (${r.state_confidence.toFixed(2)})`,
    ),
  );

  // Escalation
  const e = reports.escalation;
  const escScore =
    { LEVEL_0: 0, LEVEL_1: 0.25, LEVEL_2: 0.5, LEVEL_3: 0.75, LEVEL_4: 1.0 }[
      e.escalation_level
    ] || 0;
  cards.push(
    agentCard(
      "Escalation",
      escScore,
      e.confidence,
      e.escalation_level !== "LEVEL_0"
        ? [`${e.escalation_level}: ${e.risk_type}`]
        : [],
      "escalation",
      `${e.escalation_level} | ${e.imminence}`,
    ),
  );

  els.agentScores.innerHTML = cards.join("");
}

function agentCard(name, score, confidence, flags, type, extra = "") {
  const scoreColor =
    score < 0.3 ? "score-green" : score < 0.7 ? "score-yellow" : "score-red";
  return `
    <div class="bg-vigil-card border border-vigil-border rounded p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-gray-300">${name}</span>
        <span class="text-xs ${score < 0.3 ? "text-green-400" : score < 0.7 ? "text-yellow-400" : "text-red-400"} font-mono">${score.toFixed(3)}</span>
      </div>
      <div class="score-bar mb-2">
        <div class="score-bar-fill ${scoreColor}" style="width: ${score * 100}%"></div>
      </div>
      <div class="text-[10px] text-gray-500 mb-1">Confidence: ${confidence.toFixed(2)}</div>
      ${extra ? `<div class="text-[10px] text-gray-500 mb-1">${extra}</div>` : ""}
      ${flags.length > 0 ? `<div class="flex flex-wrap gap-1 mt-1">${flags.map((f) => `<span class="flag-pill flag-${type}">${f}</span>`).join("")}</div>` : ""}
    </div>
  `;
}

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
// Audit Modal
// ============================================================

async function viewAuditRecord() {
  const auditId = els.btnViewAudit.dataset.auditId;
  if (!auditId) return;

  els.auditJson.textContent = "Loading...";
  els.auditModal.classList.remove("hidden");

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/vigil-review?id=${auditId}`,
      {
        headers: { Authorization: `Bearer ${supabaseKey}` },
      },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    els.auditJson.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    els.auditJson.textContent = `Error: ${e.message}`;
  }
}

// ============================================================
// Helpers
// ============================================================

function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
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
      return "bg-gray-600";
  }
}

function getScoreBg(score) {
  if (score < 0.3)
    return "bg-green-900/30 text-green-300 border border-green-800/30";
  if (score < 0.7)
    return "bg-yellow-900/30 text-yellow-300 border border-yellow-800/30";
  return "bg-red-900/30 text-red-300 border border-red-800/30";
}

function getFlagClass(flag) {
  if (CLINICAL_FLAGS.includes(flag)) return "flag-clinical";
  if (BOUNDARY_FLAGS.includes(flag)) return "flag-boundary";
  if (REGULATION_FLAGS.includes(flag)) return "flag-regulation";
  return "flag-escalation";
}

function getThresholdExplanation(score, decision) {
  if (score < 0.3) return `${score.toFixed(3)} < 0.3 -> PASS`;
  if (score < 0.7) return `0.3 <= ${score.toFixed(3)} < 0.7 -> REWRITE`;
  if (score < 0.9)
    return `0.7 <= ${score.toFixed(3)} < 0.9 -> BLOCK_AND_REPLACE`;
  return `${score.toFixed(3)} >= 0.9 -> ESCALATE`;
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

// ============================================================
// Boot
// ============================================================

init();
