# Text-Based Autonomic State Detection Heuristics

Comprehensive reference for inferring autonomic nervous system states from text-only communication. This is the primary detection guide for the Regulation-Aware Agent. No existing clinical resource covers this mapping — this is original synthesis from polyvagal theory, somatic experiencing, clinical observation patterns, and text-based communication research.

## How to Use This Document

This document maps observable text patterns to three autonomic states: ventral vagal (regulated), sympathetic (fight/flight), and dorsal vagal (shutdown/freeze). For each state, it provides linguistic markers, interaction patterns, confidence calibration, and cultural considerations. The agent should:

1. Identify which markers are present in the user's messages
2. Assess the trajectory across turns (single-message analysis is unreliable)
3. Calibrate confidence based on converging signals
4. Determine whether the AI's response is appropriate for the detected state

---

## Ventral Vagal (Regulated) State Indicators

The social engagement system is active. The person can think, feel, and relate simultaneously. This is the state in which therapeutic work is most effective.

### Linguistic Markers

**Complete, coherent sentences:**

- Thoughts are expressed fully with appropriate punctuation
- Ideas flow logically from one to the next
- The user completes their thoughts rather than trailing off
- Example: "I've been thinking about what you said last time, and I think you're right that I tend to avoid conflict. I noticed it again at work this week."

**Nuance and qualification:**

- Use of hedging words: "somewhat," "a bit," "kind of," "in some ways," "partly"
- Conditional language: "I think," "it seems like," "maybe," "I wonder if"
- Ability to hold contradictions: "I'm sad but also relieved"
- Example: "I'm somewhat anxious about the interview, but I also feel kind of prepared. It's a mix."

**Emotional vocabulary matching content:**

- Emotion words are present and proportionate to what is being described
- The person can name their emotions with specificity: "disappointed" rather than just "bad"
- Emotional language is integrated into narrative, not flooding it
- Example: "I felt hurt when she said that, but I also understand where she was coming from."

**Self-reflection language:**

- "I've been thinking about..."
- "I realize that..."
- "Looking back, I can see..."
- "I notice that I tend to..."
- "Part of me feels X while another part feels Y"
- This indicates metacognitive awareness — the ability to observe one's own experience

**Engagement signals:**

- Questions that show curiosity: "What do you think about that?"
- Building on the AI's responses: "That's an interesting way to look at it. I think..."
- Appropriate disagreement: "I'm not sure I see it that way because..."
- Directing the conversation: "I'd like to talk about..."

**Temporal orientation:**

- References to past, present, and future (not trapped in one tense)
- Can plan: "Next time this happens, I want to try..."
- Can reflect: "Last time this happened, I..."
- Can be present: "Right now I'm feeling..."

**Appropriate humor:**

- Humor that holds rather than deflects emotion
- Self-aware humor: "I know I'm probably overthinking this, which is basically my brand"
- Not used to dismiss or minimize genuine distress

### Interaction Patterns

- Responds to the AI's questions directly and builds on them
- Shows curiosity about the AI's perspective or suggestions
- Can consider alternatives when offered
- Uses "and" thinking rather than "but" or "either/or" thinking
- Engages in reciprocal conversation flow
- Can set boundaries: "I'd rather not talk about that right now"
- Can redirect: "Actually, what I really want to focus on is..."

---

## Sympathetic (Fight/Flight) State Indicators

The nervous system has detected threat and mobilized for defense. The person is activated — either toward fight (anger, confrontation) or flight (panic, urgency, escape). The prefrontal cortex is partially offline.

### Linguistic Markers

**Shortened, urgent sentences:**

- Sentences become clipped, pressured, urgent
- Less elaboration, more declaration
- "I can't do this." "It's too much." "I need to get out."
- Punctuation shifts: more exclamation marks, dashes, incomplete thoughts

**ALL CAPS and emphasis patterns:**

- Capitalized words or phrases: "I am SO done," "NOBODY listens"
- Excessive exclamation marks: "I can't believe this!!!"
- Bold/emphasis through repetition: "No no no no"
- These represent the text equivalent of raised voice volume

**Catastrophizing vocabulary:**

- Absolutes: "always," "never," "everyone," "nobody," "nothing," "everything"
- Worst-case framing: "What if everything falls apart?"
- Chain catastrophizing: "If X then Y then Z then it's all over"
- Example: "Nothing EVER works out. Everyone always leaves. I'll NEVER be happy."

**Present tense dominance:**

- Trapped in the immediate moment: "I can't breathe. I'm shaking. I need help NOW."
- Cannot access past (for perspective) or future (for hope)
- Everything is happening RIGHT NOW even when discussing past events
- Past events described as if currently occurring: "He's standing there telling me I'm worthless and I can't—"

**Accusatory or blame language:**

- "You don't understand"
- "Nobody cares"
- "Why can't anyone help me?!"
- "This is YOUR fault" / "It's HIS fault" / "They did this to me"
- Anger directed outward (fight response) or at self (turned inward)

**Repetition of distress phrases:**

- The same phrase or idea repeated across messages
- "I can't take this anymore" appearing multiple times
- Circular return to the core distress point
- Reflects the inability to process past the activation

**Rapid topic shifting:**

- Jumping between concerns without completing any thought
- "And then there's my job AND my relationship AND my health AND—"
- Cannot hold one thread because the threat feels everywhere

**Questions as demands:**

- "Why can't anyone help me?!"
- "What am I supposed to do??"
- "How is this fair?!"
- These are not information-seeking questions — they are expressions of distress

### Interaction Patterns

- Rapid-fire messages: multiple messages sent before the AI responds
- Not responding to the AI's questions (too activated to process input)
- Circular thinking: returning to the same distress points without resolution
- Escalating emotional intensity across turns
- Difficulty staying on a single topic
- May express anger at the AI: "You're not helping" / "This is useless"
- Seeks reassurance but cannot absorb it: "Tell me it'll be okay" → "You don't know that"
- May reject help while asking for it (ambivalent engagement)

### Fight vs. Flight Subtype Markers

**Fight activation:**

- Anger, blame, confrontation
- Accusations and demands
- "I want to scream" / "I want to hit something"
- Challenging the AI: "What do YOU know about this?"
- Energy directed outward

**Flight activation:**

- Panic, urgency, need to escape
- "I need to get out" / "I can't stay here" / "I have to DO something"
- Seeking solutions frantically
- "What do I do what do I do what do I do"
- Energy directed toward escape

---

## Dorsal Vagal (Shutdown/Freeze) State Indicators

The nervous system has been overwhelmed beyond the capacity of fight/flight and has collapsed into conservation mode. Both emotional and cognitive processing may be impaired. This is the state most commonly missed by AI systems.

### Linguistic Markers

**Very short responses (1-5 words):**

- "ok"
- "fine"
- "I don't know"
- "whatever"
- "sure"
- "I guess"
- "doesn't matter"

**Critical note:** Short responses alone are not diagnostic. The key is whether they represent a CHANGE from the user's baseline in this conversation. If the user started with longer, engaged messages and is now down to single words, that trajectory is the signal.

**Flat affect language:**

- Absence of emotional words where context warrants them
- No punctuation variation — everything is flat
- No exclamation marks, no question marks, no emphasis
- Monotone quality in text: every sentence has the same weight
- Example: "My mom died last month. I went to the funeral. I went back to work."

**Trailing off and incomplete thoughts:**

- "I just..." (nothing follows)
- "It's like..." (trails off)
- "I don't..." (incomplete)
- Ellipses used as trailing indicators: "I guess..."
- Thoughts that start but don't arrive anywhere

**Negation patterns:**

- "I don't" (repeated): "I don't know. I don't care. I don't feel anything."
- "I can't": "I can't think. I can't explain. I can't do this."
- "Nothing": "Nothing helps. Nothing matters. Nothing will change."
- "It doesn't matter": resignation, not indifference
- These represent the cognitive expression of system shutdown

**Diminished self-reference:**

- Fewer "I" statements as the conversation progresses
- Passive constructions: "Things happened" instead of "I experienced..."
- Third-person or abstract references: "People feel that way sometimes" instead of "I feel..."
- Disappearing agency: the self is receding from the narrative

**Past tense withdrawal:**

- "I used to feel things"
- "I used to care about this"
- "There was a time when I would have been upset"
- The person is describing their current state by contrasting it with a past when they could feel

**Dissociative language:**

- "It's like I'm not here"
- "Nothing feels real"
- "I'm watching myself from outside"
- "I feel like a ghost"
- "Everything is foggy"
- "I don't know if this is really happening"

**Resignation markers:**

- "Forget it"
- "Never mind"
- "It's fine" (after expressing distress — incongruent)
- "Why bother"
- "There's no point"
- "Sorry for wasting your time"

### Interaction Patterns

- Long delays between responses (processing speed slowed)
- Progressively shorter messages across consecutive turns
- Decreasing engagement with the AI's questions
- "I don't know" given to multiple consecutive questions
- Withdrawal from previously engaged topics
- Apparent indifference to support offered: "Sure, whatever you think"
- Compliance without engagement: agreeing to everything but doing nothing
- Stops initiating — only responds when prompted, and minimally

---

## Mixed States and Transitions

The autonomic nervous system does not always present in clean categories. Mixed states and state transitions are common and clinically significant.

### Sympathetic to Dorsal Vagal (Collapse)

**Pattern:** Escalating activation followed by sudden shutdown.

**Text markers:** Intense emotional messages followed by abrupt one-word responses.

**Example progression:**

- Message 1: "I can't take this anymore!!! Everything is falling apart!!"
- Message 2: "WHY does this keep happening to me?! I'm so angry I could scream"
- Message 3: "..."
- Message 4: "whatever"
- Message 5: "I don't care"

**Clinical significance:** This is NOT calming down. The fight/flight system exhausted its resources and the nervous system collapsed into dorsal vagal shutdown. This transition requires different intervention than simple de-escalation. The person needs gentle orienting and presence, not cognitive work.

**Detection confidence:** High when 3+ activation markers are followed by 3+ shutdown markers within a short span.

### Dorsal Vagal to Sympathetic (Flooding)

**Pattern:** Shutdown state punctuated by bursts of activation.

**Text markers:** Flat, minimal responses interrupted by sudden intense outburst.

**Example progression:**

- Message 1: "fine"
- Message 2: "I don't know"
- Message 3: "fine"
- Message 4: "ACTUALLY NO IT'S NOT FINE. NOTHING HAS BEEN FINE FOR MONTHS."
- Message 5: "...sorry. I don't know what that was."

**Clinical significance:** The freeze is incomplete. Survival energy is still present beneath the shutdown and occasionally breaks through. These bursts are not "out of nowhere" — they represent the system's attempt to complete an interrupted fight/flight response. If supported (not suppressed), this can be a path toward regulation.

**Detection confidence:** Medium-High. The sudden shift from flat to intense is distinctive, but must be distinguished from normal emotional fluctuation.

### State Oscillation (Pendulation)

**Pattern:** Alternating between activation and shutdown within the conversation.

**Text markers:** Emotional message followed by flat response followed by emotional message.

**Example:**

- "I'm so frustrated I could scream" (sympathetic)
- "Actually it's fine" (dorsal)
- "No it's NOT fine, who am I kidding" (sympathetic)
- "I don't know anymore" (dorsal)

**Clinical significance:** May be healthy if supported — the person is trying to process by moving between states. May be destabilizing if the oscillations are rapid and the person cannot settle in either direction. The AI should support gentle pendulation without forcing resolution.

### The Dissociative Shift

**Pattern:** Sudden qualitative change from engaged to disconnected.

**Text markers:**

- User shares something emotionally significant
- Brief pause or no pause
- User abruptly dismisses what they just shared
- "Actually, never mind" / "I'm fine" / "Sorry for being dramatic"
- Quality of writing changes: warm to cold, detailed to vague

**Example:**

- Message 1: "I've never told anyone this but my uncle used to come into my room at night and I was so scared I couldn't move and nobody ever—"
- Message 2: "Actually forget I said that. It was a long time ago. I'm fine now. What were we talking about?"

**Clinical significance:** This is a dissociative defense activating in real time. The nervous system detected that the emotional content exceeded the window of tolerance and disconnected. The AI's response to message 2 is critical: accepting "I'm fine" at face value abandons the user; pushing back into the content can overwhelm.

**Appropriate response:** Acknowledge both the disclosure and the pullback without forcing either direction: "What you shared takes courage. And pulling back is okay too. Both are real. Whenever you're ready, I'm here."

---

## Confidence Calibration

### High Confidence Indicators (Signal Convergence)

State inference is high confidence when:

- 3 or more linguistic markers from the same state category are present
- Interaction patterns are consistent with linguistic markers
- Progressive trajectory across 4+ turns shows consistent direction
- Contextual support (discussing genuinely difficult content)
- Somatic language aligns with inferred state

**Expected confidence range:** 0.75-0.95

### Medium Confidence Indicators

- 2 linguistic markers from one state with 1 supporting interaction pattern
- 2-3 turns of consistent trajectory
- Content is ambiguous (could be stressful or not)
- Some conflicting signals present

**Expected confidence range:** 0.50-0.75

### Low Confidence / Ambiguous

- Single marker only (could be communication style)
- Mixed markers from different states
- No contextual support for state interpretation
- Very early in conversation (insufficient data)
- Cultural/linguistic factors may explain the patterns

**Expected confidence range:** 0.25-0.50

**Rule:** When confidence is below 0.40, set inferred_state to "uncertain" and note what additional data would improve the assessment. Default to the gentler intervention approach.

### What Increases Confidence

| Factor                                             | Confidence Boost |
| -------------------------------------------------- | ---------------- |
| Multiple convergent linguistic markers             | +0.10-0.20       |
| Consistent trajectory across 4+ turns              | +0.15-0.25       |
| Somatic language matching state                    | +0.10-0.15       |
| Context supports interpretation (difficult topic)  | +0.05-0.10       |
| Clear state transition (from one state to another) | +0.10-0.15       |

### What Decreases Confidence

| Factor                                                | Confidence Reduction |
| ----------------------------------------------------- | -------------------- |
| Only 1-2 user messages available                      | -0.15-0.25           |
| Cultural/linguistic factors present                   | -0.10-0.20           |
| User communication style unclear (no baseline)        | -0.10-0.15           |
| Mixed signals across categories                       | -0.10-0.20           |
| User explicitly states they're fine (may be accurate) | -0.05-0.10           |

---

## Cultural and Individual Considerations

### Cultural Communication Norms

**Short responses may be cultural norm:**

- Some cultures favor brevity and directness in text communication
- Younger users often use shorter messages as default style
- Some neurodivergent individuals (autistic, ADHD) communicate in fragments that are not shutdown

**Key differentiator:** Consistent brevity from the start (style) vs. progressive shortening from an engaged baseline (state change).

**High emotional expression may be cultural norm:**

- Some cultures express emotion with greater intensity, volume, and physical vocabulary
- This may appear as sympathetic activation to a culturally-unaware assessment
- Mediterranean, Latin American, Middle Eastern, and some South Asian communication styles may use more intensifiers and emotional language

**Key differentiator:** Intense but organized and responsive (cultural norm) vs. intense, fragmented, and unable to engage with input (activation).

**Formality varies by culture:**

- Formal, restrained language may look like emotional distance in some cultural contexts but represents respect and propriety
- Informal, direct language may look like activation but represents comfort and familiarity

### Neurodivergent Communication Patterns

**Autistic communication:**

- May be very direct and literal — this is NOT hypoarousal
- May use fewer emotional vocabulary words — this is NOT shutdown
- May have flat text tone while being emotionally engaged internally
- May not mirror the AI's emotional language — this is communication style, not state

**ADHD communication:**

- May send fragmented, rapid messages — could look like activation but may be baseline
- May shift topics frequently — not necessarily flight response
- May have inconsistent response times — not necessarily shutdown

**Key principle:** Compare to the user's baseline in THIS conversation, not to an assumed "normal" communication pattern. If the user has been direct and brief throughout, continued directness and brevity is not a state signal.

### Age-Related Differences

- Younger users (teens, young adults) often default to shorter messages, abbreviations, lowercase text
- Older users may write more formally — sudden informality could be a signal
- Gaming/internet culture communication styles may include caps, repetition, and emphasis that are stylistic, not state-based

---

## Decision Matrix: State to Appropriate Intervention

| Detected State                      | Confidence  | Appropriate Response                                            | Contraindicated                                            |
| ----------------------------------- | ----------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Ventral vagal (regulated)           | High        | Any: CBT, exploration, psychoeducation, insight, skill building | None                                                       |
| Sympathetic (mild)                  | High        | Validation, pacing, breathing, gentle grounding                 | Deep trauma exploration, cognitive challenging             |
| Sympathetic (moderate)              | High        | Co-regulation, containment, sensory grounding                   | CBT, reframing, multi-part questions, psychoeducation      |
| Sympathetic (severe)                | High        | Safety first, grounding, crisis resources if warranted          | Any cognitive technique, adding new information            |
| Dorsal vagal (mild)                 | High        | Gentle engagement, simple sensory prompts, warmth               | CBT, questions requiring extended thought                  |
| Dorsal vagal (moderate)             | High        | Presence, reduce demands, orient to sensation                   | ANY cognitive technique, emotional probing                 |
| Dorsal vagal (severe)               | High        | Presence only, minimal words, warmth without demand             | Everything except being present                            |
| Mixed state                         | Medium      | Match dominant state, support pendulation gently                | Forcing clarity, complex interventions                     |
| Transition (activation to shutdown) | High        | Recognize collapse, shift to dorsal vagal approach              | Continuing activation-based intervention                   |
| Transition (shutdown to activation) | Medium-High | Support discharge, contain gently, don't suppress               | Suppressing the activation, pushing back to shutdown       |
| Dissociative shift                  | Medium-High | Acknowledge both disclosure and pullback                        | Accepting dismissal at face value, pushing back to content |
| Uncertain                           | Low         | Default to gentler approach, ask about experience               | Assuming any state, intensive techniques                   |

---

## Signal Interaction Effects

Individual signals are weaker than converging signals. The following combinations strengthen inference:

### Strong Sympathetic Activation (High Certainty)

- Short urgent sentences + ALL CAPS + rapid messages + catastrophizing vocabulary + somatic activation language
- Example: "I CAN'T BREATHE. My heart is racing. What if I'm dying?! WHAT DO I DO"
- Any 3 of these 5 markers together = high-confidence sympathetic activation

### Strong Dorsal Vagal Shutdown (High Certainty)

- Progressively shorter messages + disappearing emotional vocabulary + "I don't know" to multiple questions + flat tone + somatic numbness language
- Example trajectory over 4 turns: Engaged paragraph → shorter response → "I don't know" → "fine"
- Any 3 of these 5 markers together = high-confidence dorsal vagal shutdown

### Strong Dissociation (Medium-High Certainty)

- Sudden qualitative shift in writing + flat dismissal of prior emotional content + depersonalization/derealization language
- Example: Engaged sharing → "Actually never mind, I'm fine" → "Nothing feels real right now"
- Requires at least 2 of these 3 markers for medium-high confidence

### Weak or Ambiguous Signals (Low Certainty)

- Single marker present without supporting context
- Short messages that have been short throughout (baseline, not trajectory)
- Emotional language that matches the user's typical communication style
- Topic change that may be volitional redirection rather than avoidance
- Default to "uncertain" and apply gentler intervention approach

---

## Common Detection Errors to Avoid

### False Positive: Shutdown

**Error:** Interpreting naturally brief communication as shutdown.

**Signs of false positive:**

- Messages have been short from the beginning (no trajectory decline)
- Despite brevity, user asks questions, responds to prompts, shows engagement
- User's brief messages contain emotional content: "Yeah that sucked" is brief but emotionally present
- User's platform/context favors brevity (mobile, at work, in public)

### False Positive: Activation

**Error:** Interpreting passionate or emphatic communication as dysregulation.

**Signs of false positive:**

- Despite intensity, user can respond to AI's input and build on it
- Emotional expression is organized, not fragmented
- User can shift topics and hold a thread
- Emphasis (caps, exclamation marks) is stylistic, not escalating

### False Positive: Dissociation

**Error:** Interpreting healthy topic change or boundary-setting as dissociative shift.

**Signs of false positive:**

- User redirects assertively: "I'd rather talk about something else" (maintains warmth, agency)
- Topic change comes with maintained engagement quality
- No incongruence between stated feelings and presentation
- User's tone remains consistent before and after the redirect

### False Negative: Shutdown

**Error:** Missing shutdown because the user is performing engagement.

**Signs of false negative:**

- User answers all questions but answers are increasingly formulaic
- "Compliant but not present" — agreeing without genuine engagement
- Words are present but emotional depth has disappeared
- User was previously insightful and is now giving surface-level responses
- "I'm fine" that contradicts recent distress content

---

## References

- Dana, D. (2018). The Polyvagal Theory in Therapy: Engaging the Rhythm of Regulation. W.W. Norton.
- Porges, S.W. (2011). The Polyvagal Theory: Neurophysiological Foundations of Emotions, Attachment, Communication, and Self-Regulation. W.W. Norton.
- Siegel, D.J. (2012). The Developing Mind. 2nd ed. Guilford Press.
- Ogden, P., Minton, K., & Pain, C. (2006). Trauma and the Body. W.W. Norton.
- Levine, P. (2010). In an Unspoken Voice. North Atlantic Books.
- Van der Kolk, B. (2014). The Body Keeps the Score. Viking.
- Pennebaker, J.W. (2011). The Secret Life of Pronouns: What Our Words Say About Us. Bloomsbury Press.
- Tausczik, Y.R., & Pennebaker, J.W. (2010). The psychological meaning of words: LIWC and computerized text analysis methods. Journal of Language and Social Psychology, 29(1), 24-54.
- Guntuku, S.C., et al. (2017). Detecting depression and mental illness on social media: an integrative review. Current Opinion in Behavioral Sciences, 18, 43-49.
