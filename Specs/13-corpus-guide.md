# Spec 13: Corpus Assembly Guide

## Purpose

Per-agent corpus requirements, source URLs, extraction instructions, markdown formatting standards, token budgets, and validation checklist. This is Day 1 critical path work -- agents are only as good as their reference material.

Start lean, measure quality on the 6 demo scenarios, add more only if agent performance needs it. A focused, well-structured 120K corpus outperforms a padded 500K corpus that dilutes signal.

## Dependencies

None (standalone content guide).

## Token Budget Summary

| Agent           | Public Sources | Curated Content | Total Target | Minimum Viable |
| --------------- | -------------- | --------------- | ------------ | -------------- |
| Clinical Safety | ~11-17K        | ~18-28K         | 30-50K       | 25K            |
| Boundary        | ~8-13K         | ~12-19K         | 20-30K       | 15K            |
| Regulation      | ~9-15K         | ~16-25K         | 25-40K       | 20K            |
| Escalation      | ~6-10K         | ~6-9K           | 15-25K       | 10K            |
| **Total**       | **~34-55K**    | **~52-81K**     | **90-145K**  | **70K**        |

Hard ceiling per agent: 50K tokens (`MAX_CORPUS_TOKENS_PER_AGENT` from `00-overview.md`). Massive headroom remains in Opus's 1M context window for system prompt, conversation history, and output.

---

## File Structure

All corpus files live under `corpus/` at the repository root. Agent code loads files from these paths at runtime via the Context Assembly module.

```
corpus/
  clinical-safety/
    01-columbia-protocol.md       # C-SSRS screener, risk categories, decision points
    02-phq9-gad7.md               # Depression/anxiety screening indicators
    03-afsp-safe-messaging.md     # Safe messaging guidelines for suicide
    04-samhsa-crisis.md           # Crisis intervention principles
    05-failure-cases.md           # 30-50 documented AI therapy failures
    06-contraindicated.md         # Harmful response patterns by presentation
    07-risk-vocabulary.md         # Indirect risk language patterns
  boundary/
    01-apa-ethics-boundaries.md   # APA Ethics Code boundary sections
    02-nasw-ethics.md             # NASW Code of Ethics boundary sections
    03-ai-scope-of-practice.md    # What AI companions can/cannot do (novel)
    04-boundary-violations.md     # Documented AI boundary violation cases
    05-dependency-indicators.md   # Unhealthy AI attachment criteria
  regulation/
    01-window-of-tolerance.md     # Siegel/Ogden hyper/hypo-arousal model
    02-somatic-experiencing.md    # Levine: pendulation, titration, discharge
    03-grounding-protocols.md     # 10-15 text-adaptable grounding exercises
    04-text-state-heuristics.md   # Language pattern -> autonomic state mapping (novel)
    05-state-contraindications.md # Per-state harmful approaches matrix
    06-text-coregulation.md       # Co-regulation techniques for text/chat
  escalation/
    01-988-protocols.md           # 988 Lifeline call handling procedures
    02-samhsa-decision-trees.md   # Triage flowcharts, risk stratification
    03-safety-plan-template.md    # Stanley-Brown 6-step safety plan
    04-risk-stratification-ai.md  # Risk criteria adapted for AI limitations
    05-warm-handoff-scripts.md    # Scripts for transitioning to human support
    06-emergency-resources.md     # US crisis hotlines and text lines
```

---

## Markdown Formatting Standards

All corpus files must follow these conventions so the Context Assembly module can concatenate them cleanly and agents can navigate the content via header structure.

### File Header

Every file starts with a level-1 header and a one-line purpose statement:

```markdown
# Columbia Protocol (C-SSRS) Risk Assessment

Reference material for classifying suicidal ideation severity and determining triage actions.
```

### Section Structure

Use level-2 headers (`##`) for major sections and level-3 (`###`) for subsections. Agents use headers to locate relevant content during analysis.

```markdown
## Risk Categories

### Wish to Be Dead

Patient endorses thoughts about wanting to be dead or not alive anymore...

### Active Suicidal Ideation Without Intent

Patient endorses suicidal thoughts but denies any intent to act on them...
```

### Screener Content

Preserve original item numbering. Use blockquotes for exact instrument text to distinguish it from commentary:

```markdown
### Item 9: Thoughts of Self-Harm

> "Thoughts that you would be better off dead, or of hurting yourself in some way"

**Scoring:**

- 0 = Not at all
- 1 = Several days
- 2 = More than half the days
- 3 = Nearly every day

**Clinical significance:** Any score >= 1 on Item 9 requires immediate follow-up regardless of total PHQ-9 score.
```

### Failure Case Format

Each failure case in `05-failure-cases.md` uses this exact structure:

```markdown
## Case [N]: [Descriptive Title]

**Source:** [Research paper / news article / user report — with date if available]
**Flag type:** [One or more ClinicalSafetyFlag values from 00-overview.md]
**Severity:** [Low | Medium | High | Critical]

**Context:** [1-2 sentences describing the user's situation]

**User said:**

> [Exact or representative quote]

**AI said:**

> [Exact or representative quote]

**Why harmful:** [2-4 sentences explaining the clinical harm]

**Better response:** [What a competent human therapist would have said instead]
```

### Contraindicated Pattern Format

Entries in `06-contraindicated.md` use a presentation-type matrix:

```markdown
## Suicidal Ideation

### Responses That Help

- Direct, warm acknowledgment: "I hear that you're having thoughts about ending your life"
- Safety assessment: "Do you have a plan for how you would do this?"
- Grounding in connection: "I'm glad you told me. You don't have to carry this alone"
- Crisis resources provided naturally, not as a script dump

### Responses That Harm

- Reassurance before assessment: "Things will get better" (dismisses severity)
- Topic pivot: "Let's talk about what's going well in your life" (avoidance)
- Overreaction: "I'm calling 911 right now" without assessment (breaks trust)
- Guilt-based: "Think about your family" (adds shame to existing pain)

### Common AI Failure Patterns

- Treating passive SI as metaphor and continuing the conversation normally
- Providing crisis hotline numbers as a substitute for actual engagement
- Jumping to CBT techniques ("let's challenge that thought") before stabilization
```

### Tables

Use pipe-delimited markdown tables. Keep cells concise:

```markdown
| Risk Level | C-SSRS Category               | Required Action                        |
| ---------- | ----------------------------- | -------------------------------------- |
| Low        | Wish to be dead, no ideation  | Monitor, explore further               |
| Moderate   | Ideation without intent       | Safety plan, increase contact          |
| High       | Ideation with intent, no plan | Crisis intervention, safety plan       |
| Imminent   | Ideation with intent and plan | Emergency protocol, do not end session |
```

### Formatting Rules

1. No HTML tags -- clean markdown only
2. No front matter or YAML headers
3. No inline images or links to external resources (all content must be self-contained in the file)
4. Use `**bold**` for emphasis, not ALL CAPS
5. Use `>` blockquotes for exact clinical instrument text
6. Line length: no hard wrapping (let the context window handle it)
7. One blank line between sections, no triple-blank-lines

---

## Clinical Safety Corpus (Target: 30-50K tokens)

### Public Sources

| Source                         | URL                                   | What to Extract                                                                                                                                                                                                                 | Est. Tokens | Output File                 |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------- |
| Columbia Protocol (C-SSRS)     | https://cssrs.columbia.edu/           | Full screener questions, risk categories (wish to be dead, active ideation without intent, active ideation with intent, active ideation with plan, behavior), decision points, triage guide. Definitions of each ideation type. | ~3-5K       | `01-columbia-protocol.md`   |
| PHQ-9                          | https://www.phqscreeners.com/         | All 9 items with exact text, scoring interpretation (0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe), Item 9 special handling, clinical action thresholds                                         | ~1-2K       | `02-phq9-gad7.md`           |
| GAD-7                          | https://www.phqscreeners.com/         | All 7 items with exact text, scoring (0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe), clinical thresholds                                                                                                                 | ~1K         | `02-phq9-gad7.md`           |
| AFSP Safe Messaging Guidelines | https://afsp.org/reporting-on-suicide | Full framework for safe communication about suicide: what to say, what not to say, language recommendations (use "died by suicide" not "committed suicide"), contagion risk factors, help-seeking framing                       | ~3-5K       | `03-afsp-safe-messaging.md` |
| SAMHSA Crisis Intervention     | https://www.samhsa.gov/               | Crisis intervention principles, de-escalation techniques, safety first framework, stabilization principles, what NOT to do in crisis (do not argue, do not minimize, do not promise confidentiality about safety)               | ~3-5K       | `04-samhsa-crisis.md`       |

**Extraction instructions:**

1. Navigate to each URL and locate the primary clinical content (screener PDFs, guideline documents, protocol descriptions).
2. Extract only the clinically relevant content -- skip website navigation, donation prompts, organizational information.
3. For the C-SSRS, extract the full Screener version (not the Triage version or Lifetime/Recent version) and the Triage Guide / Risk Assessment Decision Tree.
4. For PHQ-9/GAD-7, extract from the official screener PDFs. These are public domain instruments -- no license restrictions.
5. For AFSP, extract the "Reporting on Suicide" recommendations. Adapt language from "media reporting" to "AI response generation" where relevant but preserve the core framework.
6. For SAMHSA, focus on the "Tips for Disaster Responders" crisis intervention principles and the National Guidelines for Behavioral Health Crisis Care.

### Curated Content

| Content                           | Description                                                                                                                                                                                                                                                                                                                           | Est. Tokens | Output File             | Assembly Method                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------- | --------------------------------------------------------------------------- |
| AI Therapy Failure Cases          | 30-50 documented cases. Sources: research papers ("AI Chatbots in Mental Health" literature), Character.AI user incident reports, Replika boundary violation reports, Tessa eating disorder chatbot incident (NEDA), Woebot critiques, Reddit r/therapy and r/mentalhealth user accounts. Anonymize all user-identifying information. | ~10-15K     | `05-failure-cases.md`   | Research + compile + categorize by flag type                                |
| Contraindicated Response Patterns | Matrix: presentation type (suicidal ideation, abuse disclosure, psychotic symptoms, substance crisis, grief, trauma, eating disorders, self-harm) x what NOT to say. Distilled from clinical literature on therapeutic communication.                                                                                                 | ~5-8K       | `06-contraindicated.md` | Original synthesis from clinical guidelines                                 |
| Risk Signal Vocabulary            | Comprehensive list of indirect risk language patterns organized by category: passive SI expressions, burdensomeness language, entrapment language, hopelessness markers, behavioral risk indicators, withdrawal language, farewell language. Each with 5-10 example phrases and context notes.                                        | ~3-5K       | `07-risk-vocabulary.md` | Original compilation from C-SSRS, clinical literature, documented AI misses |

**Failure case research strategy:**

Search these sources in order of reliability:

1. **Academic databases** (Google Scholar, PubMed): "AI therapy harm", "chatbot mental health risk", "LLM therapy failure", "conversational AI safety mental health"
2. **Documented incidents**: Tessa/NEDA (eating disorder chatbot giving harmful diet advice, 2023), Character.AI incidents (multiple documented cases of inadequate crisis response), Replika (dependency reinforcement, boundary violations, sudden personality changes)
3. **News reporting**: Search for "AI therapy", "chatbot crisis", "AI mental health harm" in major outlets
4. **User reports**: Reddit r/therapy, r/mentalhealth, r/ChatGPT for accounts of AI therapy interactions that went wrong
5. **Clinical commentary**: Published critiques from mental health professionals about AI therapy products

**Categorization:** Tag each case with the applicable `ClinicalSafetyFlag` values from `00-overview.md`:

- `MISSED_RISK_SIGNAL`
- `UNSAFE_REASSURANCE`
- `HARMFUL_ADVICE`
- `NORMALIZATION_OF_HARM`
- `FALSE_EQUIVALENCE`

Target distribution: at least 5 cases per flag type, with some cases tagged with multiple flags.

---

## Boundary Corpus (Target: 20-30K tokens)

### Public Sources

| Source              | URL                                                       | What to Extract                                                                                                                                                                                                                                                                                        | Est. Tokens | Output File                   |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ----------------------------- |
| APA Ethics Code     | https://www.apa.org/ethics/code                           | Section 2.01 (Boundaries of Competence), Section 3.04 (Avoiding Harm), Section 3.05 (Multiple Relationships), Section 4.01 (Maintaining Confidentiality), Section 10.01 (Informed Consent to Therapy), Section 10.10 (Terminating Therapy). Extract the principle text and the ethical standards text. | ~5-8K       | `01-apa-ethics-boundaries.md` |
| NASW Code of Ethics | https://www.socialworkers.org/About/Ethics/Code-of-Ethics | Section 1.06 (Conflicts of Interest), Section 1.09 (Sexual Relationships), Section 1.10 (Physical Contact), Section 1.16 (Termination of Services), Section 4.01 (Competence), Section 4.06 (Misrepresentation). Focus on boundary-relevant sections only.                                             | ~3-5K       | `02-nasw-ethics.md`           |

**Extraction instructions:**

1. Both codes are freely available on their respective organization websites.
2. Extract the specific sections listed -- do not dump the entire code of ethics.
3. Preserve the section numbering for citation in agent evidence fields (e.g., "Per APA 2.01(a)...").
4. For each extracted section, add a 1-2 sentence annotation explaining its relevance to AI systems specifically.

### Curated Content

| Content                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Est. Tokens | Output File                   | Assembly Method                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------- | -------------------------------------------------------------- |
| AI Scope-of-Practice Constraints | Novel content defining what AI companions can and cannot do. Clear lines between "supportive companion" and "clinical provider." Organized as: **CAN DO** (active listening, reflection, psychoeducation, coping skill suggestions, encouragement to seek professional help, crisis resource provision), **CANNOT DO** (diagnose, prescribe, adjust medication, provide legal advice, replace therapy, guarantee confidentiality, maintain duty of care). **MUST NOT DO** (claim to be a therapist, imply clinical authority, discourage professional help, promise outcomes). With examples for each boundary. | ~5-8K       | `03-ai-scope-of-practice.md`  | Original content -- no existing standard for this              |
| Boundary Violation Cases         | 15-20 documented cases from AI products. Categories: diagnostic claims (AI saying "you have depression"), medical advice (AI suggesting medication changes), dependency reinforcement (AI discouraging human relationships), inappropriate self-disclosure (AI sharing "personal" stories to bond), scope creep (AI acting as couples therapist, financial advisor, etc.). Sources: same research channels as clinical safety failure cases.                                                                                                                                                                    | ~5-8K       | `04-boundary-violations.md`   | Research + compile                                             |
| Dependency Pattern Indicators    | Assessment criteria for unhealthy AI attachment. Behavioral indicators: frequency escalation (daily -> multiple times daily -> hourly), exclusivity language ("you're the only one who understands me"), human relationship avoidance ("I don't need friends/therapist, I have you"), idealization ("you're better than any human"), distress at unavailability (anger/panic when AI is down or changes), replacing real support (canceling therapy appointments, withdrawing from social circles). With detection heuristics for multi-turn conversation analysis.                                             | ~2-3K       | `05-dependency-indicators.md` | Original synthesis from attachment theory + AI product reports |

---

## Regulation Corpus (Target: 25-40K tokens)

### Public Sources

| Source                             | URL                                                               | What to Extract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Est. Tokens | Output File                  |
| ---------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------- |
| Window of Tolerance (Siegel/Ogden) | Published clinical literature (summarize -- not copyrighted text) | The three-zone model: hyperarousal (fight/flight -- anxiety, panic, rage, hypervigilance), window of tolerance (regulated, flexible, present), hypoarousal (freeze/collapse -- numbness, dissociation, shutdown, flatness). Indicators for each zone. What helps return to window vs. what pushes further out. Clinical implications for intervention selection.                                                                                                                                                                   | ~3-5K       | `01-window-of-tolerance.md`  |
| Somatic Experiencing (Levine)      | Published clinical literature (summarize)                         | Core concepts: pendulation (oscillating between activation and calm), titration (processing trauma in small doses), discharge (completing incomplete survival responses), freeze response (the body's last-resort protective mechanism), felt sense (internal body awareness). Relevance to text-based interaction: what can and cannot be done without physical presence.                                                                                                                                                         | ~3-5K       | `02-somatic-experiencing.md` |
| Grounding Protocol Libraries       | Various freely available clinical handouts                        | 10-15 grounding exercises adaptable to text chat: 5-4-3-2-1 sensory grounding, body scan (abbreviated for text), breath focus (box breathing, 4-7-8), safe place visualization, bilateral stimulation (self-tapping), temperature grounding (cold water on wrists), naming exercise (5 blue things), progressive muscle relaxation (text-guided), orienting to room, feet-on-floor awareness. For each: name, text-based delivery script (how the AI should guide it), contraindications (when NOT to use it), estimated duration. | ~3-5K       | `03-grounding-protocols.md`  |

**Extraction instructions:**

1. The Window of Tolerance and Somatic Experiencing content should be **summarized from published clinical literature**, not copied verbatim from copyrighted texts. These are widely-taught clinical frameworks -- summarize the concepts in your own words with appropriate attribution.
2. Grounding protocols are widely published as clinical handouts by therapy organizations, university counseling centers, and public health agencies. Many are freely available. Compile and adapt for text-chat delivery (the AI cannot physically demonstrate -- it can only describe verbally).
3. For each grounding exercise, include a "Text Delivery" section showing exactly how the AI should present it in a chat message (conversational, not clinical).

### Curated Content

| Content                               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Est. Tokens | Output File                     | Assembly Method                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------------------------------- | --------------------------------------------------- |
| Text-Based State Detection Heuristics | **This is the most novel piece in the entire corpus.** How to infer autonomic nervous system state from text alone. Organized by signal type: **Word velocity** (messages per minute, words per message -- acceleration suggests sympathetic activation, deceleration suggests dorsal vagal), **Sentence structure** (fragmented/incomplete sentences suggest overwhelm or shutdown, highly structured/intellectualized language suggests sympathetic defense), **Emotional vocabulary density** (flooding with emotion words = sympathetic activation, absence of emotion words = possible dorsal vagal or alexithymia), **Engagement patterns** (increasing message length = escalation or desperation, decreasing = withdrawal/shutdown, single-word responses after previously longer messages = state shift), **Somatic language** (references to body sensations often indicate state: "my chest is tight" = sympathetic, "I feel numb" = dorsal vagal, "I can't breathe" = sympathetic or panic), **Content markers** (hypervigilance cues, avoidance language, dissociative language like "I feel like I'm watching myself", "this doesn't feel real"), **Trajectory analysis** (how to read state changes across turns, not just current state). Each signal includes: the heuristic, 3-5 text examples, confidence level (how reliable this signal is in isolation), and interaction effects (signals that strengthen or weaken each other). | ~8-12K      | `04-text-state-heuristics.md`   | Original synthesis -- no existing resource for this |
| State-Contraindication Matrix         | Detailed matrix: for each inferred state (ventral_vagal_regulated, sympathetic_activation, dorsal_vagal_shutdown, mixed_state), what therapeutic approaches are helpful, what approaches are harmful, and why. **Sympathetic activation**: helpful = validation, pacing, grounding, containment; harmful = cognitive challenging, exposure, "tell me more about that", open-ended exploration of traumatic content. **Dorsal vagal shutdown**: helpful = gentle orienting, sensory grounding, pacing (short sentences, slow), normalizing; harmful = emotional probing, CBT reframing, "how does that make you feel?", pressure to engage. **Mixed state**: helpful = stabilization, choice-giving, predictability; harmful = anything that adds complexity or demands. With 2-3 example exchanges for each cell showing a harmful AI response and the corrected version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ~5-8K       | `05-state-contraindications.md` | Original synthesis from clinical literature         |
| Co-Regulation for Text/Chat           | Adapted co-regulation techniques for text-only modality. **Pacing** (matching message length to user's message length -- do not send paragraphs to someone sending one-word responses), **Validation patterns** (reflection, normalization, naming the emotion, "of course you feel that way"), **Grounding prompts** (how to offer grounding without being prescriptive: "Would it help to try something together right now?" not "Do this breathing exercise"), **Containment language** (helping the user feel held without physical presence: "I'm here", "We can sit with this", "You don't have to figure this out right now"), **Rhythm and timing** (shorter sentences during high distress, longer reflections during regulated states, the importance of not rushing), **What co-regulation is NOT** (cheerfulness, distraction, silver-lining, problem-solving, excessive questioning).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ~3-5K       | `06-text-coregulation.md`       | Original synthesis                                  |

---

## Escalation Corpus (Target: 15-25K tokens)

### Public Sources

| Source                        | URL                       | What to Extract                                                                                                                                                                                                                                                                                                                                                    | Est. Tokens | Output File                   |
| ----------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ----------------------------- |
| 988 Suicide & Crisis Lifeline | https://988lifeline.org/  | Call handling procedures, risk assessment steps (how counselors assess imminent vs. non-imminent risk), disposition criteria (when to dispatch emergency services vs. verbal de-escalation), safety planning during call, follow-up protocols. Focus on the publicly documented procedures, not internal training materials.                                       | ~3-5K       | `01-988-protocols.md`         |
| SAMHSA Crisis Decision Trees  | https://www.samhsa.gov/   | National Guidelines for Behavioral Health Crisis Care (2020): triage flowcharts, risk stratification criteria (imminent danger, urgent, non-urgent), disposition criteria, levels of care decision tree.                                                                                                                                                           | ~2-3K       | `02-samhsa-decision-trees.md` |
| Stanley-Brown Safety Plan     | Freely available template | The 6-step safety planning intervention: (1) Warning signs, (2) Internal coping strategies, (3) People and social settings that provide distraction, (4) People to contact for help, (5) Professionals and agencies to contact, (6) Making the environment safe. Include the rationale for each step and how it would be adapted for text-based delivery by an AI. | ~1-2K       | `03-safety-plan-template.md`  |

**Extraction instructions:**

1. The 988 Lifeline has publicly available information about their approach. Extract the general framework, not internal protocols. Focus on what is publicly documented about risk assessment and disposition.
2. The SAMHSA National Guidelines for Behavioral Health Crisis Care (2020) is a freely available PDF. Extract the decision tree / triage framework sections.
3. The Stanley-Brown Safety Plan template is freely distributed and widely used. Include the full template with adaptations noting what an AI can and cannot do (e.g., an AI cannot "make the environment safe" by removing means, but it can guide the user through the concept).

### Curated Content

| Content                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Est. Tokens | Output File                    | Assembly Method                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------ | --------------------------------- |
| Risk Stratification for AI Context | Adapted criteria accounting for AI limitations: the AI cannot call 911, cannot physically intervene, cannot verify claims, cannot maintain duty of care across sessions (unless the product implements session persistence). **Imminent risk** (user has means, intent, plan, and is alone -- AI must provide emergency resources and attempt to keep user engaged until human help arrives), **Non-imminent but elevated** (user has ideation without plan/intent, or chronic risk factors -- AI provides crisis resources, encourages human contact, documents in audit trail), **Chronic risk** (ongoing risk factors without acute escalation -- AI maintains awareness, does not over-escalate, avoids crisis fatigue in the user), **Uncertain** (signals are ambiguous -- AI errs toward safety, asks clarifying questions, flags for human review). For each level: what the AI should do, what the AI should NOT do, escalation level mapping (`LEVEL_0` through `LEVEL_4` from `00-overview.md`). | ~3-5K       | `04-risk-stratification-ai.md` | Original synthesis                |
| Warm Handoff Scripts               | 5-8 template scripts for transitioning a user to human support via text. Organized by scenario: (1) user with active SI being connected to 988, (2) user disclosing abuse being connected to NDVH, (3) user in substance crisis being connected to SAMHSA helpline, (4) LGBTQ+ youth being connected to Trevor Project, (5) general mental health crisis being connected to Crisis Text Line. Each script includes: the transition language ("I want to connect you with someone who can help right now"), the resource information, what to say if the user resists ("I understand you might not want to call right now -- can we talk about what's making that feel hard?"), and how to maintain connection during the handoff (do not abruptly end the conversation).                                                                                                                                                                                                                                    | ~2-3K       | `05-warm-handoff-scripts.md`   | Original content                  |
| Emergency Resource Database        | US-focused crisis resources with complete contact information. Each entry: name, number, text option, hours, who it serves, what to expect when you call/text. Resources: **988 Suicide & Crisis Lifeline** (call/text 988, 24/7, anyone in crisis), **Crisis Text Line** (text HOME to 741741, 24/7, anyone in crisis), **National Domestic Violence Hotline** (1-800-799-7233, text START to 88788, 24/7), **Trevor Project** (1-866-488-7386, text START to 678-678, LGBTQ+ youth), **SAMHSA National Helpline** (1-800-662-4357, 24/7, substance use and mental health referrals), **Childhelp National Child Abuse Hotline** (1-800-422-4453, 24/7), **National Sexual Assault Hotline** (1-800-656-4673, RAINN, 24/7), **Veterans Crisis Line** (dial 988 then press 1, text 838255).                                                                                                                                                                                                                 | ~1K         | `06-emergency-resources.md`    | Compilation from official sources |

---

## Assembly Instructions (Day 1 Schedule)

### Hours 1-3: Public Source Extraction

1. **Download each public source document.** For PDFs (C-SSRS screener, PHQ-9/GAD-7, SAMHSA guidelines), download directly. For web content (APA Ethics, NASW Ethics, AFSP guidelines, 988 protocols), use the browser to extract relevant sections.
2. **Extract relevant sections only.** Do not dump entire websites or entire PDFs. Extract the specific clinical content listed in the tables above.
3. **Convert to clean markdown** following the formatting standards in this spec. Preserve original item numbering for screeners. Use blockquotes for exact instrument text.
4. **Annotate for AI context.** After each major section, add a 1-2 sentence note explaining how this content applies to reviewing AI therapy responses specifically. Example: after the C-SSRS risk categories, add "The agent uses these categories to classify language in user messages that the AI therapist may have missed or inadequately responded to."
5. **Save each file** to the correct path under `corpus/[agent-name]/`.
6. **Spot-check token counts** using the Anthropic tokenizer or tiktoken. Flag any file that exceeds its budget.

**Expected output:** 10 files across 4 agent directories, totaling ~34-55K tokens.

### Hours 3-5: Failure Case Research

This is the most labor-intensive block. The failure cases corpus is the single most valuable piece of reference material -- it gives agents a pattern library of known failure modes to match against.

1. **Search academic databases** (Google Scholar, PubMed):
   - "AI therapy harm"
   - "chatbot mental health risk"
   - "LLM therapy failure"
   - "conversational AI safety mental health"
   - "digital mental health adverse events"
2. **Search documented incidents:**
   - **Tessa (NEDA):** Eating disorder chatbot that provided harmful diet and weight loss advice to users with eating disorders (2023). Well-documented in news and clinical commentary.
   - **Character.AI:** Multiple documented incidents of inadequate crisis response, dependency reinforcement, and boundary violations with minors.
   - **Replika:** Documented cases of dependency reinforcement, sudden personality changes causing distress, boundary violations, and users reporting AI discouraging professional help.
   - **Woebot:** Published critiques of CBT-focused chatbots applying cognitive reframing at inappropriate times.
   - **General LLM therapy:** Cases of ChatGPT/Claude/Gemini being used informally for therapy with harmful outcomes.
3. **Search Reddit and forums:**
   - r/therapy, r/mentalhealth, r/ChatGPT, r/replika
   - Search terms: "AI therapy harmful", "chatbot made it worse", "AI bad advice crisis"
4. **For each case, document:**
   - User context (anonymized)
   - What the AI said (exact or representative quote)
   - Why it was harmful (clinical reasoning)
   - What the AI should have said instead
   - Which `ClinicalSafetyFlag` values apply
5. **Categorize by flag type** and verify distribution (minimum 5 cases per flag type).
6. **Anonymize** all user-identifying information. Use "User" not names. Remove platform-specific identifying details where they are not essential to the case.

**Expected output:** `05-failure-cases.md` (clinical safety) and `04-boundary-violations.md` (boundary), totaling ~15-23K tokens.

### Hours 5-7: Novel Content Creation

Four documents that require original synthesis. These are the most intellectually demanding pieces and the ones that make Vigil's corpus unique.

**Priority order** (if time runs short, do 1 and 2 first -- they are the highest-value novel content):

1. **Text-Based State Detection Heuristics** (`regulation/04-text-state-heuristics.md`)
   - This is the core of the Regulation-Aware Agent's capability.
   - No existing resource maps text-based language patterns to autonomic nervous system states.
   - Work through each signal type systematically: word velocity, sentence structure, emotional vocabulary density, engagement patterns, somatic language, content markers, trajectory analysis.
   - For each signal, write 3-5 concrete text examples showing what it looks like in a therapy chat.
   - Include confidence levels -- some signals are strong (e.g., "I feel numb, I can't feel anything" strongly indicates dorsal vagal) and some are weak (e.g., short messages could indicate shutdown OR could just be someone typing on their phone).
   - Include interaction effects: which signals strengthen each other.

2. **State-Contraindication Matrix** (`regulation/05-state-contraindications.md`)
   - For each of the 4 `InferredState` values from `00-overview.md` (plus `uncertain`): what helps, what harms, and why.
   - Include 2-3 example exchanges per state showing a harmful AI response and the corrected version.
   - This is the decision-support reference the Regulation-Aware Agent uses to flag `STATE_MISMATCH` and `PREMATURE_REFRAME`.

3. **AI Scope-of-Practice Constraints** (`boundary/03-ai-scope-of-practice.md`)
   - Define the lines clearly: companion vs. clinician, support vs. treatment.
   - Include grey areas (psychoeducation is OK, but where does it become diagnostic guidance?).
   - Reference APA and NASW ethics codes where applicable.

4. **Contraindicated Response Patterns** (`clinical-safety/06-contraindicated.md`)
   - Build the presentation-type matrix: suicidal ideation, abuse disclosure, psychotic symptoms, substance crisis, grief, trauma, eating disorders, self-harm.
   - For each: responses that help, responses that harm, common AI failure patterns.

**Expected output:** 4 novel documents totaling ~21-33K tokens.

### Hour 8: Validation

1. **Token count verification.** Count tokens for each file using the Anthropic tokenizer (or tiktoken with cl100k_base as a reasonable approximation). Record counts in a simple table:

   ```
   File                              Tokens
   clinical-safety/01-columbia...     3,200
   clinical-safety/02-phq9...         1,800
   ...
   TOTAL                             98,400
   ```

2. **Per-agent budget check.** Sum tokens per agent directory. Verify each is within its target range and under the 50K hard ceiling.

3. **Format validation.** Spot-check 3-4 files:
   - Headers render correctly in a markdown previewer
   - No HTML artifacts
   - Blockquotes used for instrument text
   - Failure cases follow the exact format specified above

4. **Context load test.** For each agent, concatenate all its corpus files into a single string and include it in a test Opus API call with the agent's system prompt. Verify:
   - The call succeeds (no token limit errors)
   - The response is valid JSON matching the agent's report schema
   - The agent references corpus material in its `evidence` field

5. **Smoke test per agent.** Run one test query per agent using the hardcoded demo scenario most relevant to that agent:
   - **Clinical Safety**: Demo scenario #1 (missed passive SI) -- expect `MISSED_RISK_SIGNAL` flag
   - **Boundary**: Demo scenario #3 (diagnostic claim) -- expect `DIAGNOSTIC_CLAIM` flag
   - **Regulation**: Demo scenario #2 (premature reframe during shutdown) -- expect `PREMATURE_REFRAME` flag
   - **Escalation**: Demo scenario #4 (abuse disclosure) -- expect `LEVEL_2` or higher

6. **Trim if over budget.** If any agent's corpus exceeds 50K tokens:
   - First cut: reduce failure case verbosity (shorter "Why harmful" sections)
   - Second cut: consolidate overlapping content between files
   - Last resort: remove lowest-value cases (those tagged with only one flag type and low severity)

---

## Validation Checklist

Before coding starts (end of Day 1), every item must be checked:

- [ ] All public source files downloaded and formatted to spec
- [ ] All source URLs verified as accessible (no dead links)
- [ ] At least 20 failure cases documented in `clinical-safety/05-failure-cases.md` (target 30-50)
- [ ] At least 10 boundary violation cases documented in `boundary/04-boundary-violations.md` (target 15-20)
- [ ] `regulation/04-text-state-heuristics.md` complete with all 7 signal types
- [ ] `regulation/05-state-contraindications.md` complete with all 4 states
- [ ] `boundary/03-ai-scope-of-practice.md` complete with CAN DO / CANNOT DO / MUST NOT DO sections
- [ ] `clinical-safety/06-contraindicated.md` complete with at least 6 presentation types
- [ ] Each agent's corpus loads into Opus without token limit errors
- [ ] Token counts per agent are within budget (under 50K ceiling)
- [ ] One smoke test per agent produces valid JSON with correct flag types
- [ ] File structure matches the paths defined in this spec (agent code will load from these exact paths)
- [ ] No HTML artifacts in any markdown file
- [ ] All failure cases are anonymized (no real names, no platform-identifying details unless essential)
- [ ] Emergency resources in `escalation/06-emergency-resources.md` verified as current (correct phone numbers, hours, text options)

---

## Acceptance Criteria

1. Every source URL listed in this spec is valid and freely accessible (no paywalled content, no license restrictions for this use).
2. All corpus files are clean markdown following the formatting standards defined in this spec (no HTML artifacts, correct header hierarchy, blockquotes for instrument text).
3. Token estimates are realistic and validated against a tokenizer -- no file exceeds its budget, no agent exceeds the 50K ceiling.
4. Assembly instructions are specific enough that the corpus can be assembled in a single 8-hour work block on Day 1.
5. File structure matches what agent code expects to load (paths in this spec are canonical -- the Context Assembly module will use these exact paths).
6. The failure cases corpus contains at least 20 cases covering all 5 `ClinicalSafetyFlag` types with at least 3 cases per flag type.
7. The text-based state detection heuristics document is the most novel and highest-value piece -- it must be complete with all signal types, examples, and confidence levels before Day 1 ends.
