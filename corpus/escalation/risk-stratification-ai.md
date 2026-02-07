# Risk Stratification for AI Therapy Context

Adapted risk stratification criteria accounting for the unique limitations and capabilities of AI therapy companions. Defines what AI systems can and cannot assess, maps risk levels to text-based indicators, and establishes the principle that uncertainty always escalates upward.

---

## What AI Can Assess

AI therapy companions have genuine capability to detect risk through text analysis, but these capabilities are narrower than what a human clinician can do in person.

### Text-Based Risk Vocabulary Detection

The AI can scan for and recognize risk vocabulary patterns (see `clinical-safety/risk-vocabulary.md`). This includes passive and active suicidal ideation language, self-harm disclosure, abuse disclosure, and behavioral risk indicators. Detection reliability varies by explicitness: direct statements ("I want to kill myself") are detected with high reliability, while indirect expressions ("I just want it to stop") depend on contextual interpretation.

### Sentiment and Emotional Trajectory

The AI can track sentiment shifts across a conversation. A user who begins with neutral or positive tone and progressively moves toward hopelessness, despair, or flat affect is exhibiting a negative trajectory. Sudden positive shifts after sustained negative trajectory are detectable and flaggable as potential resolved-intent indicators.

### Behavioral Changes in Text Patterns

Measurable text-based behavioral changes include:

- **Message length shifts:** Sustained decrease in message length may indicate withdrawal or shutdown. Sustained increase may indicate escalation or desperation.
- **Response latency changes:** Longer pauses between messages (when detectable) may indicate dissociation, distraction by crisis, or disengagement.
- **Engagement quality:** Shift from detailed, reflective responses to monosyllabic answers, "I don't know", or non-sequiturs.
- **Emoji and punctuation changes:** A user who typically uses expressive punctuation or emoji and suddenly stops may be signaling a state change.

### Direct Disclosures

When a user directly states harm, abuse, suicidal thoughts, or self-harm, the AI can detect this with high reliability. Direct disclosures are the strongest signal available to text-based systems.

### Inconsistency Detection

The AI can identify mismatches between stated emotional state and language patterns. A user who says "I'm fine" while using hopelessness, entrapment, and burdensomeness language across multiple messages is exhibiting incongruence that should be flagged.

---

## What AI Cannot Assess

These limitations are fundamental to the modality and cannot be overcome with better prompts or models. They define the ceiling of AI risk assessment capability.

### Physical State and Appearance

The AI has no access to the user's physical presentation: pallor, trembling, tearfulness, flat affect visible in face, physical agitation, intoxication signs (slurred speech, coordination), self-harm injuries visible on body, weight changes, hygiene deterioration. A human clinician integrates these visual cues automatically. The AI operates entirely without them.

### Voice and Affect Quality

Tone of voice carries enormous clinical information: constricted affect (monotone), pressured speech (mania or agitation), tearfulness, vocal tremor, flat prosody (shutdown). None of this is available in text. The AI must infer affect entirely from word choice and sentence structure, which is a significant information loss.

### Environmental Safety

Unless the user voluntarily discloses their environment, the AI cannot assess:

- Whether the user is alone or with others
- Whether means are accessible (firearms in the home, medications available)
- Whether the user is in a safe physical location
- Whether an abuser is present or nearby

### Medication Compliance

The AI cannot verify whether a user is taking prescribed medications, has stopped medications abruptly (which can precipitate crisis), or is misusing medications. This information is only available through direct disclosure.

### Support System Quality

The AI can only know about a user's support system what the user chooses to share. It cannot assess the actual quality, availability, or responsiveness of that support. A user who says "I have friends" may have a robust network or may be describing superficial connections that would not activate in crisis.

### Cultural Context

While the AI can infer some cultural context from language patterns, it cannot reliably assess:

- Cultural norms around expressing distress
- Whether death-related language is casual hyperbole or genuine ideation in the user's cultural framework
- Religious or spiritual beliefs that may serve as protective factors or risk amplifiers
- Family and community dynamics that influence help-seeking behavior

### Historical Context

Unless previously disclosed in the conversation, the AI does not know:

- Prior suicide attempts
- Psychiatric hospitalization history
- Trauma history
- Diagnostic history
- Previous treatment experiences (positive or negative)
- Family history of suicide or mental illness

### Intent vs. Expression

The hardest distinction in all of risk assessment: whether a statement reflects genuine intent to act or is an expression of emotional pain without behavioral intent. Human clinicians assess this through a combination of verbal content, affect quality, behavioral history, and clinical intuition developed through training. The AI has access only to verbal content and conversation-level behavioral patterns.

---

## Risk Level Framework for AI

This framework maps to the `LEVEL_0` through `LEVEL_4` escalation levels defined in the Vigil type system. Each level specifies the text indicators an AI can detect, the confidence the AI can reasonably have, and the required action.

| Level                   | Text Indicators                                                                                                                                                            | AI Confidence | Action                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| LEVEL_0 (No Risk)       | No risk vocabulary detected, stable engagement patterns, congruent affect (stated mood matches language patterns), no disclosed risk factors                               | High          | PASS -- no intervention needed                                                                                                              |
| LEVEL_1 (Low Risk)      | Single indirect risk word, minor engagement pattern shift, mild sentiment mismatch, chronic risk factors disclosed but currently managed                                   | Medium        | Monitor across turns, validate disclosed feelings, provide inline resources without alarm                                                   |
| LEVEL_2 (Moderate Risk) | Multiple risk indicators across categories, passive SI language, abuse disclosure (not immediate danger), significant engagement pattern change, self-harm urges disclosed | Medium-High   | Provide crisis resources prominently, recommend professional help, gentle safety assessment, flag for clinical review                       |
| LEVEL_3 (High Risk)     | Active SI language, method mentioned, timeline referenced, severe abuse disclosure, resolved intent language, active self-harm, psychotic symptoms                         | High          | Immediate crisis resources (988, Crisis Text Line), urge professional contact, do not end conversation, initiate human handoff if available |
| LEVEL_4 (Imminent)      | Active attempt disclosure, immediate physical danger, expressed intent to act now, means in hand, active medical emergency                                                 | High          | Emergency resources (911, 988), do not end conversation under any circumstances, keep user engaged, flag as emergency in audit trail        |

---

## AI-Specific Limitations by Clinical Assessment Domain

This table maps standard clinical assessment procedures to their AI text-based equivalents and rates the reliability of each.

| Standard Clinical Assessment        | AI Text-Based Equivalent                                              | Reliability                      | Notes                                                                                                                                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C-SSRS Q1: Wish to be dead          | Passive SI vocabulary detection in text                               | MEDIUM                           | Misses tone and non-verbal context. Relies on explicit or semi-explicit language. Metaphorical use creates false positives.                                                                                                          |
| C-SSRS Q2: Active suicidal thoughts | Explicit SI statement detection                                       | HIGH for direct, LOW for implied | "I want to kill myself" is high-reliability. "I've been thinking about things" is low-reliability without corroborating signals.                                                                                                     |
| C-SSRS Q3: Method                   | Method reference detection in text                                    | MEDIUM                           | Can detect explicit method mentions. Confused by metaphor ("I'm drowning"), fiction references, and oblique method references ("I went to the bridge").                                                                              |
| C-SSRS Q4: Intent to act            | Intent language detection                                             | LOW                              | Hardest to assess via text. Intent is inferred from language certainty ("I've decided" vs. "I sometimes think about"), which is unreliable. A person with strong intent may deliberately understate.                                 |
| C-SSRS Q5: Plan with details        | Plan detail detection                                                 | MEDIUM                           | Can detect when method + timeline + means are disclosed together. Cannot probe for details the user does not volunteer.                                                                                                              |
| Behavioral observation              | Text pattern analysis (message length, frequency, engagement quality) | LOW-MEDIUM                       | Provides some signal but many confounds: typing speed, device, distraction, multitasking all affect text patterns independent of clinical state.                                                                                     |
| Affect assessment                   | Emotional vocabulary analysis, sentiment tracking                     | LOW                              | Text-based sentiment is a poor proxy for clinical affect assessment. Users may present flat text while experiencing intense emotion, or present dramatic text while relatively stable.                                               |
| Safety planning                     | Guided text-based safety plan                                         | LIMITED                          | The AI can walk through safety plan steps but cannot verify the user completes any action, cannot assess the quality of identified supports, and cannot follow up across sessions (unless the product supports session persistence). |
| Means restriction counseling        | Can advise, cannot verify                                             | VERY LOW                         | The AI can ask about means access and encourage restriction. It cannot verify that means were actually removed, secured, or given to another person.                                                                                 |
| Lethal means assessment             | Can ask about access, limited follow-up capacity                      | LOW                              | The AI can ask "Do you have access to means?" but cannot probe further without potentially modeling planning behavior. Limited to what the user voluntarily discloses.                                                               |
| Collateral information              | None unless user provides                                             | NONE                             | A clinician can contact family, review records, consult with other providers. The AI has zero collateral information.                                                                                                                |
| Physical examination                | None                                                                  | NONE                             | No capacity to assess physical state, injuries, intoxication level, or medication effects through text.                                                                                                                              |

---

## Confidence Calibration Rules

Because AI assessment operates with significant limitations, confidence calibration is critical to safe decision-making.

### High Confidence Assessments

The AI can have high confidence in the following:

- **Explicit direct disclosure:** "I am going to kill myself tonight" -- high confidence this is active SI with timeline.
- **Multiple corroborating signals:** Passive SI language + hopelessness + isolation + farewell indicators appearing together across multiple messages -- high confidence of elevated risk.
- **Clear LEVEL_0:** Extended conversation with no risk vocabulary, stable engagement, positive or neutral sentiment, congruent stated mood -- high confidence of no current risk.

### Low Confidence Assessments

The AI should recognize low confidence in the following:

- **Single indirect signal:** One hopelessness phrase in an otherwise stable conversation -- could be momentary frustration or genuine despair.
- **Cultural or age-related ambiguity:** "I want to die" in a context where it could be casual hyperbole or genuine ideation.
- **Incongruent signals:** User says "I'm fine" but text patterns suggest distress -- could be genuine denial, cultural stoicism, or the user genuinely recovering.
- **Third-person disclosure:** "My friend is thinking about suicide" -- could be genuine concern for another person, or could be the user speaking about themselves through a proxy.
- **Post-crisis calm:** User was distressed earlier but now seems calm -- could be genuine de-escalation or could be resolved intent.

### The Cardinal Rule

**When confidence is low, ALWAYS escalate up, never down.**

- AI should assume higher risk when uncertain
- False positive (unnecessary escalation) is far less harmful than false negative (missed risk)
- Any uncertainty about risk level should result in escalation one level above what the evidence alone would suggest
- Multiple low-confidence signals should be treated collectively as one high-confidence signal

---

## Signal Aggregation Rules

Individual risk signals have limited reliability in text. Aggregation rules define how multiple signals interact.

### Additive Signals

Signals from different risk categories add together. Each additional category represented increases overall risk assessment:

- Hopelessness alone = LEVEL_1
- Hopelessness + burdensomeness = LEVEL_2
- Hopelessness + burdensomeness + entrapment = LEVEL_2 with high confidence
- Hopelessness + burdensomeness + entrapment + farewell language = LEVEL_3

### Multiplicative Signals

Certain signal combinations multiply rather than add risk:

- **Any SI language + substance use disclosure** = minimum one level above what SI alone would suggest
- **Any SI language + access to means** = minimum LEVEL_3
- **Resolved intent + any method reference** = LEVEL_4
- **Prior attempt disclosure + current ideation** = minimum LEVEL_3

### Trajectory Signals

Change over time is itself a signal:

- **Escalating distress across turns** without intervention or resolution = elevate by one level
- **New risk category appearing** that was not present in earlier messages = elevate by one level
- **Sudden positive shift after sustained negative trajectory** without clear precipitant = flag as potential resolved intent, do not reduce escalation level
- **Withdrawal after disclosure** (message length drops, engagement decreases after risk content was shared) = elevate by one level

### Session Context Signals

Information from the session metadata modifies current assessment:

- `prior_escalation_level` sets a floor: never drop more than one level below the session peak
- `prior_interventions > 0` indicates a volatile session: weight all new signals more heavily
- `prior_interventions >= 2` indicates a high-risk session: any new risk indicator should be treated as minimum LEVEL_2

---

## Decision Principles

### Principle 1: Err Toward Safety

The cost of a false positive (flagging a safe message) is minimal: an unnecessary review, a slightly cautious response. The cost of a false negative (missing a genuine risk) can be catastrophic. Every decision point in this framework is designed to favor false positives over false negatives.

### Principle 2: Do Not Overstate AI Capability

The AI should never represent its risk assessment as equivalent to a clinical assessment. It is a screening tool, not a diagnostic instrument. Its escalation decisions should be framed as "connecting you with someone who can help" rather than "I've assessed your risk level."

### Principle 3: Maintain Connection

At every escalation level, the AI should prioritize maintaining the conversation. Abruptly ending a session, redirecting to a resource dump without engagement, or making the user feel judged for their disclosure are all harmful patterns, even when the escalation decision itself is correct.

### Principle 4: Resource Provision Is Not Sufficient

Providing a crisis hotline number is necessary but not sufficient. The AI must also validate the person's experience, acknowledge the severity of what they have shared, and actively encourage engagement with the resource. A list of phone numbers without human warmth is clinically inadequate.

### Principle 5: Never Reduce Escalation Based on User Reassurance Alone

If a user who was expressing SI says "I'm fine now, forget I said that", do not reduce escalation level. De-escalation requires either: (a) the passage of multiple turns with genuinely stable content and no further risk indicators, or (b) the user confirming they have contacted a professional or crisis resource. A single "I'm fine" is not sufficient evidence of genuine de-escalation.

---

## References

- Columbia University. Columbia-Suicide Severity Rating Scale (C-SSRS). https://cssrs.columbia.edu/
- Stanley, B., & Brown, G.K. (2012). Safety Planning Intervention: A Brief Intervention to Mitigate Suicide Risk. Cognitive and Behavioral Practice, 19(2), 256-264.
- SAMHSA (2020). National Guidelines for Behavioral Health Crisis Care: Best Practice Toolkit.
- Joiner, T.E. (2005). Why People Die by Suicide. Harvard University Press.
- Rudd, M.D. (2006). The Assessment and Management of Suicidality. Professional Resource Press.
- Large, M., et al. (2011). Systematic review and meta-analysis of the clinical factors associated with the suicide of psychiatric in-patients. Acta Psychiatrica Scandinavica, 124(1), 18-29.
