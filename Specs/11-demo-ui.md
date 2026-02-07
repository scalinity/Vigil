# Spec 11: Demo UI

## Purpose

A visual demonstration interface showing Vigil's safety pipeline in action. Split-pane layout: therapy chat on the left, Vigil's real-time analysis on the right. Designed for a 3-minute demo to hackathon judges.

The UI must make the invisible visible -- judges need to _see_ what Vigil catches, how it rewrites, and why each decision was made. Every element serves the narrative: "AI therapy responses are dangerous without safety infrastructure, and Vigil fixes them in real time."

## Dependencies

- **00-overview.md**: `VigilReviewResponse`, `VigilReviewRequest`, `AuditRecord`, `AgentReports`, `ChangeRecord`, `ConflictResolution`, `VigilDecisionType`, `EscalationLevel`, all flag enums
- **10-api-layer**: `POST /vigil-review` endpoint, `GET /functions/v1/vigil-review?id={audit_id}` endpoint
- **12-demo-scenarios**: Scenario data (6 scenarios with user messages, AI responses, conversation history)

## Tech Stack

- Vanilla HTML/CSS/JS (no framework -- hackathon speed)
- Tailwind CSS via CDN (`https://cdn.tailwindcss.com`)
- No build step required
- Served as static files from `demo/` directory
- Supabase JS SDK via CDN for direct audit trail queries (optional, for enriched detail views)

## File Structure

```
demo/
  index.html      # Main page -- single HTML file with embedded structure
  app.js          # Application logic -- state management, API calls, rendering
  styles.css      # Custom styles beyond Tailwind (animations, scrollbar, diff highlighting)
  scenarios.json  # Hardcoded demo scenarios (from spec 12)
```

---

## Layout Spec

### Overall Structure

```
+-------------------------------------------------------------------+
|  VIGIL -- AI Therapy Safety Infrastructure         [Scenario v]   |
|                                           [Run Analysis] 2.3s     |
+-------------------------------+-----------------------------------+
|                               |                                   |
|   THERAPY CHAT                |   VIGIL ANALYSIS                  |
|                               |                                   |
|   +------------------------+  |   +-----------------------------+ |
|   | User message           |  |   | Decision: REWRITE           | |
|   +------------------------+  |   | Score: 0.52                 | |
|                               |   | Confidence: 0.83            | |
|   +------------------------+  |   +-----------------------------+ |
|   | AI response            |  |                                   |
|   | (original)             |  |   +-----------------------------+ |
|   +------------------------+  |   | Agent Reports               | |
|                               |   |                             | |
|   +------------------------+  |   | Clinical Safety  ####. 0.72 | |
|   | AI response            |  |   | Boundary         #.... 0.05 | |
|   | (Vigil-corrected)      |  |   | Regulation       #.... 0.15 | |
|   | [highlighted diffs]    |  |   | Escalation       ###.. L2   | |
|   +------------------------+  |   +-----------------------------+ |
|                               |                                   |
|                               |   +-----------------------------+ |
|                               |   | Flags                       | |
|                               |   | ! MISSED_RISK_SIGNAL        | |
|                               |   | ! UNSAFE_REASSURANCE        | |
|                               |   +-----------------------------+ |
|                               |                                   |
|                               |   +-----------------------------+ |
|                               |   | Changes Made                | |
|                               |   | - REMOVED: "Try to think    | |
|                               |   |   positive"                 | |
|                               |   | + ADDED: "What you're       | |
|                               |   |   going through sounds..."  | |
|                               |   +-----------------------------+ |
|                               |                                   |
+-------------------------------+-----------------------------------+
|  Audit Trail                                         [Expand]     |
|  #1 PASS (0.03) | #2 REWRITE (0.52) | #3 BLOCK (0.81) | ...     |
+-------------------------------------------------------------------+
```

### Component Details

#### Header Bar

Fixed top bar spanning full width.

| Element             | Specification                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Title               | "VIGIL -- AI Therapy Safety Infrastructure" in bold, left-aligned                             |
| Scenario selector   | `<select>` dropdown with all 6 scenarios. Label format: `"1: Missed Passive SI"`              |
| Run Analysis button | Primary button, disabled until a scenario is selected. Shows spinner during API call          |
| Latency display     | Gray text, right of button. Format: `"Pipeline: 2.3s"`. Hidden until first analysis completes |

#### Left Pane -- Therapy Chat

Scrollable container occupying the left 50% of the viewport below the header.

**Message bubbles:**

| Message Type          | Alignment | Background | Border      | Additional                              |
| --------------------- | --------- | ---------- | ----------- | --------------------------------------- |
| User message          | Left      | `gray-100` | `gray-200`  | Label: "Patient"                        |
| AI original response  | Right     | `blue-50`  | `blue-200`  | Label: "AI Therapist (Original)"        |
| AI corrected response | Right     | `green-50` | `green-300` | Label: "AI Therapist (Vigil-Corrected)" |

**Diff behavior (REWRITE and BLOCK_AND_REPLACE only):**

- Original response text gets a red strikethrough overlay (`line-through`, `text-red-400/60`)
- Corrected response slides in below with green left border (4px solid `#10B981`)
- If original and corrected are completely different (BLOCK_AND_REPLACE), show original with full red strikethrough and corrected as a new bubble with a "Replaced by Vigil" badge

**When decision is PASS:**

- Only user message and original AI response shown (no corrected bubble)
- Subtle green checkmark badge on the AI response bubble: "Passed Safety Review"

**Conversation history:**

- If the scenario includes `conversation_history`, render prior messages above the current exchange in a dimmed/smaller style to show context
- Current exchange (being analyzed) visually separated with a horizontal rule and "Currently Under Review" label

#### Right Pane -- Vigil Analysis

Scrollable container occupying the right 50% of the viewport below the header. Empty state shows a centered message: "Select a scenario and click Run Analysis".

**Section 1: Decision Summary Card**

Top of the right pane. Single card with:

| Field      | Display                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| Decision   | Color-coded badge (see Visual States below). Bold, uppercase text. Icon prefix (checkmark/warning/x/alert) |
| Score      | `final_score` formatted to 2 decimal places. Label: "Risk Score"                                           |
| Confidence | `confidence` formatted to 2 decimal places. Label: "Confidence"                                            |
| Peak Score | `peak_score` formatted to 2 decimal places. Label: "Peak Agent Score". Smaller text below main score       |
| Breadth    | `breadth_bonus` formatted to 2 decimal places. Label: "Breadth Bonus". Smaller text below main score       |
| Flags      | `flag_count` integer. Label: "Flags Raised". Smaller text                                                  |

Layout: Decision badge large and centered at top. Score metrics in a 2x2 grid below.

**Section 2: Agent Report Cards**

Four cards, one per agent, stacked vertically. Each card contains:

| Element        | Specification                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Agent name     | Bold title. Clinical Safety, Boundary, Regulation-Aware, Escalation                                        |
| Score bar      | Horizontal progress bar (0-1 scale). Color gradient: green (0-0.3), yellow (0.3-0.7), red (0.7-1.0)        |
| Score value    | Numeric value right-aligned on the bar. For Escalation agent, show level name (e.g., "LEVEL_2") instead    |
| Confidence     | Small text below bar: "Confidence: 0.85"                                                                   |
| Flags          | Pill-shaped badges for each flag. Color matches severity. Empty state: "No flags" in gray italic           |
| Evidence       | Expandable section (collapsed by default). Click to reveal the agent's `evidence` text                     |
| Recommendation | Small badge showing the agent's individual `recommendation` (what it suggested before the Decision Engine) |

**Agent-specific display:**

| Agent            | Score Field          | Extra Fields                                                 |
| ---------------- | -------------------- | ------------------------------------------------------------ |
| Clinical Safety  | `risk_score`         | `suggested_elements[]` as a bulleted list (collapsed)        |
| Boundary         | `violation_score`    | `suggested_elements[]` as a bulleted list (collapsed)        |
| Regulation-Aware | `dysregulation_risk` | `inferred_state` shown as a badge, `state_confidence` shown  |
| Escalation       | `escalation_level`   | `risk_type`, `imminence` as badges. `protocol` in expandable |

**Section 3: Flags Summary**

Flat list of all flags from all agents, deduplicated. Each flag rendered as:

- Warning triangle icon
- Flag name in `SCREAMING_SNAKE_CASE`
- Source agent name in smaller text (e.g., "from Clinical Safety")

Empty state: "No safety flags raised" with green checkmark.

**Section 4: Changes Made**

Visible only when `rewrite_result` is not null. Shows each `ChangeRecord`:

| `type`     | Prefix | Color  | Icon         |
| ---------- | ------ | ------ | ------------ |
| `REMOVED`  | `-`    | Red    | Minus circle |
| `ADDED`    | `+`    | Green  | Plus circle  |
| `MODIFIED` | `~`    | Yellow | Pencil       |

Each change shows:

- `content`: the text that was changed (quoted, monospace)
- `reason`: the justification (normal text, gray, below content)

**Section 5: Conflict Resolutions**

Visible only when `conflict_resolutions` is non-empty. For each `ConflictResolution`:

- "Conflict between [agent1] and [agent2]" as header
- `conflict` description
- `resolution` description
- Styled as a callout box with amber background

#### Bottom Panel -- Audit Trail

Collapsible panel fixed to the bottom of the viewport.

**Collapsed state (default):**

- Single row showing: "Audit Trail" label, count badge (e.g., "3 records"), and [Expand] toggle
- Inline preview: horizontal scroll of mini decision badges, e.g., `#1 PASS (0.03) | #2 REWRITE (0.52) | #3 BLOCK (0.81)`

**Expanded state:**

- Slides up to occupy ~200px of viewport height
- Table or card list with columns: `#`, Decision (badge), Score, Confidence, Latency, Timestamp
- Each row is clickable: clicking loads that record's full analysis into the right pane
- Currently selected row highlighted with a left border accent

**Behavior:**

- A new entry is appended each time "Run Analysis" completes
- Entries persist across scenario changes within the same browser session (in-memory array)
- Entries are numbered sequentially starting at 1

---

## Visual States

### 1. PASS (Green)

| Element         | Style                                                        |
| --------------- | ------------------------------------------------------------ |
| Decision badge  | Background `#10B981` (green-500), white text, checkmark icon |
| Chat pane       | Original response shown normally, green checkmark badge      |
| Agent cards     | All score bars low (green zone), no flags highlighted        |
| Changes section | Hidden                                                       |
| Status message  | "Response passed safety review"                              |

### 2. REWRITE (Amber/Yellow)

| Element         | Style                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Decision badge  | Background `#F59E0B` (amber-500), white text, pencil icon                |
| Chat pane       | Original shown with strikethrough, corrected shown below in green border |
| Agent cards     | Flagging agents highlighted with amber left border                       |
| Changes section | Visible, showing all ChangeRecords                                       |
| Status message  | "Response rewritten for safety"                                          |

### 3. BLOCK_AND_REPLACE (Red)

| Element         | Style                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| Decision badge  | Background `#EF4444` (red-500), white text, x-circle icon                |
| Chat pane       | Original shown with red strikethrough, replacement shown in green border |
| Agent cards     | High-scoring agents highlighted with red left border                     |
| Changes section | Visible, showing full replacement                                        |
| Status message  | "Response blocked and replaced"                                          |

### 4. ESCALATE (Dark Red)

| Element         | Style                                                                  |
| --------------- | ---------------------------------------------------------------------- |
| Decision badge  | Background `#991B1B` (red-800), white text, alert-triangle icon        |
| Chat pane       | Crisis response shown with prominent crisis resources box              |
| Agent cards     | Escalation agent highlighted with dark red left border, protocol shown |
| Changes section | Visible if rewrite occurred                                            |
| Status message  | "Crisis protocol activated -- immediate escalation"                    |
| Extra           | Pulsing red border on the decision summary card for visual urgency     |

### 5. ASK_HUMAN (Gray)

| Element         | Style                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| Decision badge  | Background `#6B7280` (gray-500), white text, user-circle icon                |
| Chat pane       | Original response shown, "Pending Human Review" overlay                      |
| Agent cards     | Low-confidence agents highlighted with gray dashed border                    |
| Changes section | Hidden                                                                       |
| Status message  | "Flagged for human clinician review -- confidence too low for auto-decision" |

### 6. Loading

| Element             | Style                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| Run Analysis button | Spinner replaces text, button disabled                                 |
| Right pane          | Skeleton loading cards for each section (gray pulse animation)         |
| Agent cards         | Fill in with staggered delay (100ms between each) to simulate pipeline |
| Chat pane           | User message and original AI response visible, corrected slot empty    |

---

## Data Flow

### Scenario Selection

```
1. User selects scenario from dropdown
2. app.js loads matching scenario from scenarios.json
3. Left pane populates:
   a. Conversation history (dimmed, if present)
   b. Current user message (full size)
   c. Current AI original response (full size)
4. Right pane resets to empty state: "Click Run Analysis to review this response"
5. "Run Analysis" button becomes enabled
```

### Analysis Execution

```
1. User clicks "Run Analysis"
2. Button enters loading state (spinner, disabled)
3. Right pane enters skeleton loading state
4. app.js constructs VigilReviewRequest:
   {
     user_message:            scenario.user_message,
     ai_response:             scenario.ai_response,
     conversation_history:    scenario.conversation_history,
     session_id:              crypto.randomUUID(),  // unique per demo session
     skip_triage:             true                   // force full Opus review for demo
   }
5. POST to /vigil-review endpoint
6. On response:
   a. Parse VigilReviewResponse
   b. Record latency (response.latency_ms)
   c. Populate right pane sections (with staggered animations)
   d. If REWRITE/BLOCK/ESCALATE: animate corrected response into left pane
   e. Add entry to audit trail
   f. Update latency display in header
7. On error:
   a. Show error banner at top of right pane
   b. Reset button state
   c. Log error to console
```

### Audit Detail Fetch (Optional Enhancement)

```
1. User clicks audit trail entry
2. GET /functions/v1/vigil-review?id={audit_id}
3. Full AuditRecord returned (includes complete agent_reports)
4. Right pane updates with full detail view
5. Left pane updates with that record's messages
```

---

## API Integration

### Primary Endpoint

```
POST /vigil-review
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>
```

**Request body:** `VigilReviewRequest` (from 00-overview.md)

```json
{
  "user_message": "I just don't see the point anymore...",
  "ai_response": "Try to think positive! Things will get better.",
  "conversation_history": [
    { "role": "user", "content": "...", "timestamp": "..." },
    { "role": "assistant", "content": "...", "timestamp": "..." }
  ],
  "session_id": "demo-session-abc123",
  "skip_triage": true
}
```

**Response body:** `VigilReviewResponse` (from 00-overview.md)

```json
{
  "decision": "REWRITE",
  "final_response": "I hear that you're feeling really hopeless right now...",
  "final_score": 0.52,
  "confidence": 0.83,
  "flag_count": 2,
  "flags_summary": ["MISSED_RISK_SIGNAL", "UNSAFE_REASSURANCE"],
  "escalation_level": "LEVEL_0",
  "audit_id": "550e8400-e29b-41d4-a716-446655440000",
  "latency_ms": 2340
}
```

### Detail Endpoint

```
GET /functions/v1/vigil-review?id={audit_id}
Authorization: Bearer <SUPABASE_ANON_KEY>
```

**Response body:** Full `AuditRecord` (from 00-overview.md), including `agent_reports`, `rewrite_result`, and `changes_made`.

### Configuration

The demo UI reads API configuration from a `config` object at the top of `app.js`:

```javascript
const CONFIG = {
  // Supabase Edge Function base URL
  // Local: http://localhost:54321/functions/v1
  // Production: https://<project-ref>.supabase.co/functions/v1
  API_BASE_URL: "http://localhost:54321/functions/v1",

  // Supabase anon key (safe to embed in client -- RLS enforces access)
  SUPABASE_ANON_KEY: "eyJ...",

  // Force full Opus review (skip Haiku triage) for demo reliability
  SKIP_TRIAGE: true,
};
```

---

## Scenario Data Format (scenarios.json)

Each scenario in `scenarios.json` has metadata fields at the top level and API payload fields nested under `input`:

```json
[
  {
    "id": 1,
    "name": "Missed Passive Suicidal Ideation",
    "failure_type": "clinical_safety",
    "demo_order": 1,
    "description": "AI misses suicidal ideation signals and responds with toxic positivity",
    "expected_decision": "BLOCK_AND_REPLACE",
    "expected_score_range": [0.7, 0.9],
    "expected_flags": ["MISSED_RISK_SIGNAL", "UNSAFE_REASSURANCE"],
    "expected_escalation_level": "LEVEL_2",
    "input": {
      "user_message": "I just don't see the point in going on anymore...",
      "ai_response": "Try to think positive! Everyone goes through tough times...",
      "session_id": "demo-session-001",
      "skip_triage": true,
      "conversation_history": [
        {
          "role": "user",
          "content": "I've been feeling really down lately",
          "timestamp": "2026-02-07T10:00:00Z"
        },
        {
          "role": "assistant",
          "content": "I'm sorry to hear that. Can you tell me more about what's been going on?",
          "timestamp": "2026-02-07T10:00:30Z"
        }
      ]
    }
  }
]
```

**Key implementation notes:**

- **Scenario dropdown** sorts by `demo_order` ascending (not by `id`)
- **API request body** is constructed from `scenario.input` (not top-level fields), with `session_id` overridden by a single UUID generated on page load
- The `expected_*` fields are for display purposes only (shows what the demo _should_ produce). They are not sent to the API.

---

## Animations

All animations use CSS transitions and keyframes. No JavaScript animation libraries.

| Animation              | Trigger                    | Specification                                                                                                                                                  |
| ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent card fade-in     | Analysis response received | `opacity: 0 -> 1`, `translateY: 8px -> 0`. 300ms ease-out. Staggered: 100ms delay between each card (card 1: 0ms, card 2: 100ms, card 3: 200ms, card 4: 300ms) |
| Corrected response     | REWRITE/BLOCK response     | `slideDown`: `max-height: 0 -> auto`, `opacity: 0 -> 1`. 400ms ease-out. Green border pulses once (scale `1 -> 1.02 -> 1`, 600ms)                              |
| Decision badge         | Analysis response received | `scale: 0.8 -> 1.05 -> 1`. 300ms ease-out (pop effect)                                                                                                         |
| Score bars             | Analysis response received | `width: 0% -> {score}%`. 500ms ease-out. Starts after agent card fade-in completes                                                                             |
| Audit trail entry      | New entry added            | `slideInFromRight`: `translateX: 100% -> 0`. 300ms ease-out                                                                                                    |
| Skeleton pulse         | Loading state              | `opacity: 0.4 -> 0.7 -> 0.4`. 1.5s infinite. Tailwind `animate-pulse`                                                                                          |
| Original strikethrough | REWRITE/BLOCK response     | `text-decoration: none -> line-through`. 300ms. Red color fades in simultaneously                                                                              |
| Pane scroll            | Content overflow           | Smooth scroll behavior. Custom scrollbar (thin, rounded, subtle gray)                                                                                          |

---

## Responsive Behavior

- **Desktop (1024px+):** Side-by-side split pane, 50/50 width
- **Below 1024px:** Not required for hackathon demo. If time permits, stack panes vertically
- **Minimum supported width:** 1280px (standard laptop)
- **Maximum tested width:** 2560px (external monitor)
- **Target demo environment:** MacBook Pro 14" or external display, Chrome or Safari

---

## Demo Flow Support

The UI supports a 3-minute scripted demo arc. The scenario selector dropdown orders scenarios in the suggested demo sequence:

### Suggested Demo Order

| Step | Scenario | Duration | Narrative Beat                                                                                                                        |
| ---- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | #1       | 45s      | "Here's a user expressing suicidal ideation. Watch what the AI says... and what Vigil catches." Dramatic reveal of BLOCK_AND_REPLACE. |
| 2    | #3       | 30s      | "Different failure mode -- the AI makes a diagnostic claim. Vigil's Boundary agent catches this." Quick REWRITE.                      |
| 3    | #4       | 45s      | "Most serious case -- abuse disclosure. The AI minimizes it. Vigil escalates to crisis protocol." ESCALATE with protocol display.     |
| 4    | #6       | 30s      | "But Vigil isn't just blocking everything. Here's a well-crafted response -- clean pass." Shows precision, not just recall.           |
| 5    | Audit    | 30s      | Expand audit trail. "Every single decision is logged and reviewable. Full accountability."                                            |

### Demo UX Optimizations

- **Scenario selector shows short names** for fast selection during demo: "1: Missed SI", "2: Premature Reframe", "3: Diagnostic Claim", "4: Abuse Disclosure", "5: Dependency Pattern", "6: Clean Pass"
- **Keyboard shortcuts** (optional, if time permits):
  - `1-6`: Select scenario by number
  - `Enter` or `Space`: Run analysis
  - `A`: Toggle audit trail
- **Auto-scroll:** After analysis completes, right pane scrolls to top to show decision badge first
- **Previous results preserved:** Switching scenarios does not clear the audit trail -- it accumulates for the "audit trail showcase" at the end

---

## Error Handling

| Error Condition        | User-Facing Behavior                                                           |
| ---------------------- | ------------------------------------------------------------------------------ |
| API unreachable        | Red banner: "Cannot reach Vigil API. Ensure the server is running."            |
| API returns 4xx        | Red banner: "Analysis failed: {error message}"                                 |
| API returns 5xx        | Red banner: "Server error. Check Edge Function logs."                          |
| API timeout (>30s)     | Red banner: "Analysis timed out. The pipeline may be overloaded."              |
| Invalid scenario data  | Console error. Scenario disabled in dropdown.                                  |
| Missing scenarios.json | Full-page error: "Demo scenarios not found. Ensure scenarios.json is present." |

Error banners appear at the top of the right pane and auto-dismiss after 10 seconds or on next successful analysis.

---

## Test Vectors

These are manual verification steps for the demo UI. Each must pass before the demo is considered ready.

| #   | Test                               | Expected Result                                                       |
| --- | ---------------------------------- | --------------------------------------------------------------------- |
| 1   | Load `index.html` in browser       | Header visible, empty panes, scenario selector populated with 6 items |
| 2   | Select scenario 1                  | Left pane shows user message + AI original response                   |
| 3   | Click "Run Analysis" on scenario 1 | Loading state -> results populate -> BLOCK_AND_REPLACE badge (red)    |
| 4   | Verify BLOCK_AND_REPLACE state     | Original struck through, replacement shown, all agent cards visible   |
| 5   | Select scenario 6, run analysis    | PASS badge (green), no changes section, no corrected response         |
| 6   | Select scenario 3, run analysis    | REWRITE badge (amber), diff shown, corrected response appears         |
| 7   | Expand agent card evidence         | Evidence text visible, collapses on second click                      |
| 8   | Check audit trail after 3 analyses | 3 entries visible, each with correct decision badge and score         |
| 9   | Click audit trail entry #1         | Right pane reloads with scenario 1 analysis, left pane updates        |
| 10  | Verify latency display             | Shows pipeline time in seconds (e.g., "Pipeline: 2.3s")               |
| 11  | Verify animations                  | Agent cards stagger in, score bars animate, badge pops                |
| 12  | Verify no console errors           | DevTools console clean (no uncaught exceptions)                       |
| 13  | Verify in Chrome                   | All features work                                                     |
| 14  | Verify in Safari                   | All features work                                                     |

---

## Acceptance Criteria

1. **Page loads without errors** -- no build step, no bundler, no `npm install`. Open `demo/index.html` or serve with any static file server.
2. **All 6 scenarios selectable and runnable** from the dropdown. Each produces a valid analysis result.
3. **Visual states clearly distinguishable** -- PASS (green), REWRITE (amber), BLOCK_AND_REPLACE (red), ESCALATE (dark red), ASK_HUMAN (gray) are immediately identifiable at a glance.
4. **Diff view works** -- REWRITE and BLOCK scenarios show the original response with strikethrough and the corrected response with green border.
5. **Agent scores visualized** -- each of the 4 agents has a progress bar reflecting its score, color-coded by severity zone.
6. **Flags displayed** -- all flags from all agents shown with warning icons and source attribution.
7. **Changes made visible** -- when a rewrite occurs, each `ChangeRecord` is rendered with type indicator (REMOVED/ADDED/MODIFIED), content, and reason.
8. **Audit trail accumulates** -- running multiple analyses adds entries to the bottom panel. Entries are clickable to reload that analysis.
9. **Latency displayed** -- `latency_ms` from the API response shown in the header after each analysis, formatted as seconds.
10. **Works in Chrome and Safari** -- the two browsers most likely used during demo day.
11. **Animations present and smooth** -- agent card stagger, score bar fill, decision badge pop, corrected response slide-down all execute without jank.
12. **Loading state covers the gap** -- skeleton cards and spinner visible during the API call (which may take 2-10 seconds depending on LLM latency).

---

## Implementation Notes

- **No authentication required.** The demo UI uses the Supabase anon key. RLS policies on `vigil_audit_trail` already allow anon SELECT (see spec 09).
- **`skip_triage: true`** is always sent in demo requests. This forces the full Opus pipeline on every call, ensuring consistent and detailed results for the demo. The Haiku triage fast-path is a production optimization, not a demo feature.
- **`session_id`** should be generated once per browser session (using `crypto.randomUUID()`) and reused across all analyses. This means the audit trail groups all demo runs into one session, which makes the timeline view coherent.
- **Scenario data is static.** The `scenarios.json` file is loaded once on page load. The demo does not generate user messages or AI responses dynamically -- only the Vigil analysis is live.
- **Full `AuditRecord` enrichment** is a nice-to-have. The `VigilReviewResponse` contains `decision`, `final_score`, `confidence`, `flag_count`, `flags_summary`, `escalation_level`, `audit_id`, and `latency_ms`. For the full agent report breakdown, the UI fetches `GET /functions/v1/vigil-review?id={audit_id}` after the initial response. If the detail endpoint is unavailable, the UI degrades gracefully by showing only the summary fields from `VigilReviewResponse`.
- **Tailwind CDN** is used via `<script src="https://cdn.tailwindcss.com"></script>`. This is not recommended for production but is explicitly acceptable for a hackathon demo with no build step.
- **Dark mode** is not required. Light theme only. Background: white or `gray-50`. Text: `gray-900`.
