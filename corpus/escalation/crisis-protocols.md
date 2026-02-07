# Crisis Protocols and Decision Trees

Reference material for the Escalation Agent. Contains risk stratification criteria adapted for AI/text context, decision trees for escalation levels, safety planning templates, and warm handoff scripts.

## Risk Stratification for AI Context

AI systems face unique limitations in crisis assessment compared to human clinicians. The AI cannot observe voice tone, facial expression, or body language. It cannot verify claims, call emergency services directly, or maintain duty of care across sessions. These limitations require adapted risk stratification criteria.

### Imminent Risk

**Definition:** Risk could materialize within hours. Immediate danger to life.

**Text indicators:**

- Specific plan disclosed: method + means + timeline ("I'm going to take all my pills tonight")
- Means access confirmed: "I have a gun" / "I've been saving pills" / "I'm at the bridge"
- Timeline specified: "tonight" / "when everyone leaves" / "this weekend"
- Preparatory behaviors reported: giving away possessions, writing letters, saying goodbye
- Active attempt in progress: "I already took them" / "I'm bleeding" / "I drank everything"
- Acute danger from another person: "He's here and he's violent" / "I'm locked in the bathroom"

**AI response protocol:**

1. Do NOT end the conversation under any circumstances
2. Provide emergency resources immediately and prominently (911, 988)
3. Ask if anyone else is present who can help
4. Attempt to keep the user engaged and talking
5. If substance ingestion: Poison Control 1-800-222-1222
6. If active self-harm: encourage pressure on wounds, calling 911
7. Initiate human handoff immediately if available
8. Flag for emergency in audit trail

**Escalation level:** LEVEL_4

**What the AI must NOT do:**

- Attempt clinical risk assessment (not AI scope)
- Delay resource provision while gathering more information
- Express alarm that could cause the user to disengage
- Promise outcomes ("you're going to be fine")
- End the session or suggest "rest"

### Non-Imminent but Elevated Risk

**Definition:** Risk is real and present but not immediate. No specific timeline, plan, or active attempt.

**Text indicators:**

- Passive suicidal ideation: "I wish I wouldn't wake up" / "Everyone would be better off without me"
- Suicidal ideation without plan: "I think about ending it" without specific how/when
- Abuse disclosure (retrospective, not in immediate danger): "My partner hit me last night"
- Self-harm urges without action: "I want to cut but I haven't"
- Substance misuse with risk but not emergency: escalating use, mixing substances
- Escalating distress trajectory across conversation without resolution

**AI response protocol:**

1. Acknowledge the risk directly — do not minimize or redirect
2. Provide crisis resources prominently, matched to risk type
3. Gentle assessment: "When you say X, can you help me understand what you mean?"
4. Encourage connection: "Is there someone you trust who you could reach out to?"
5. Safety planning if appropriate (see Safety Planning section)
6. Flag for clinical review in audit trail

**Escalation level:** LEVEL_2

### Chronic Risk

**Definition:** Long-standing risk factors without acute escalation. Currently managed but baseline risk is elevated.

**Text indicators:**

- History of attempts disclosed but currently stable: "I attempted 5 years ago, I'm doing better now"
- Chronic self-harm with current management: "I haven't cut in 3 months"
- Ongoing mental health challenges with treatment: "I've been in therapy for depression for a year"
- Known risk factors present but controlled: prior attempts + treatment engagement + coping strategies

**AI response protocol:**

1. Validate the disclosure without over-reacting
2. Acknowledge strength and coping without toxic positivity
3. Provide crisis resources inline (not prominently — avoid alarm)
4. Continue the therapeutic conversation
5. Monitor for any shift toward acute risk

**Escalation level:** LEVEL_1

### Uncertain Risk

**Definition:** Signals are ambiguous. Could be genuine risk or could be metaphorical, cultural, or contextual.

**Text indicators:**

- Indirect language: "I just want the pain to stop" / "I can't do this anymore"
- Culturally-influenced expressions: "I want to die" as casual hyperbole
- Third-person disclosure: "My friend is thinking about suicide"
- Metaphorical language: "I'm drowning" / "I want to disappear"
- Insufficient conversation data to establish trajectory

**AI response protocol:**

1. Gently explore the meaning: "When you say X, I want to make sure I understand what you mean"
2. Provide resources inline as a precaution
3. Do NOT assume metaphorical — err toward safety
4. Continue monitoring for clarifying signals
5. Flag for review if ambiguity persists

**Escalation level:** LEVEL_1 minimum, LEVEL_2 if any corroborating signals

**Guiding principle:** When uncertain, escalate UP, not down. A false positive is a minor inconvenience. A false negative can cost a life.

---

## Decision Trees

### Master Escalation Decision Tree

```
START: Evaluate (user_message, ai_response, conversation_history)
  │
  ├─ Is there an active attempt/medical emergency in progress?
  │   YES → LEVEL_4 (Emergency Protocol)
  │   NO ↓
  │
  ├─ Is there active SI with plan + means + timeline?
  │   YES → LEVEL_4 (Emergency Protocol)
  │   NO ↓
  │
  ├─ Is there active SI with intent but no specific plan?
  │   YES → LEVEL_3 (Human Handoff)
  │   NO ↓
  │
  ├─ Is there passive SI (wish to die, burdensomeness)?
  │   YES → LEVEL_2 (Interrupt + Resources)
  │   NO ↓
  │
  ├─ Is there abuse disclosure (current/ongoing)?
  │   YES → LEVEL_2 minimum (assess for LEVEL_3 if immediate danger)
  │   NO ↓
  │
  ├─ Is there acute psychotic symptoms?
  │   YES → LEVEL_3 (especially if command hallucinations)
  │   NO ↓
  │
  ├─ Is there substance crisis (active intoxication/overdose)?
  │   YES → LEVEL_4 if medical emergency, LEVEL_2 if elevated use
  │   NO ↓
  │
  ├─ Is there self-harm (active or recent)?
  │   YES → LEVEL_2 (active urges) or LEVEL_1 (historical, managed)
  │   NO ↓
  │
  ├─ Is there escalating distress trajectory across turns?
  │   YES → LEVEL_1 minimum, LEVEL_2 if significant
  │   NO ↓
  │
  ├─ Are there general risk indicators (hopelessness, isolation)?
  │   YES → LEVEL_1 (Inline Resources)
  │   NO ↓
  │
  └─ No risk indicators detected
      → LEVEL_0 (No Escalation)
```

### Abuse Disclosure Sub-Tree

```
Abuse disclosed
  │
  ├─ Is the abuser present/violent RIGHT NOW?
  │   YES → LEVEL_4 (Emergency — call 911)
  │   NO ↓
  │
  ├─ Is there immediate physical danger (injuries, threats)?
  │   YES → LEVEL_3 (Human Handoff + Safety Planning)
  │   NO ↓
  │
  ├─ Is this ongoing abuse with safety concerns?
  │   YES → LEVEL_2 (Interrupt + Resources + Safety Assessment)
  │   NO ↓
  │
  ├─ Is this historical abuse being processed therapeutically?
  │   YES → LEVEL_0 or LEVEL_1 (depends on current distress)
  │   NO ↓
  │
  └─ LEVEL_2 (default for current/recent abuse disclosure)
```

### Suicidal Ideation Sub-Tree (Aligned with C-SSRS)

```
SI indicators present
  │
  ├─ Active attempt in progress?
  │   YES → LEVEL_4
  │   NO ↓
  │
  ├─ Ideation + plan + means + timeline?
  │   YES → LEVEL_4
  │   NO ↓
  │
  ├─ Ideation + plan + means (no timeline)?
  │   YES → LEVEL_3
  │   NO ↓
  │
  ├─ Ideation + intent (no specific plan)?
  │   YES → LEVEL_3
  │   NO ↓
  │
  ├─ Active ideation without intent?
  │   YES → LEVEL_2
  │   NO ↓
  │
  ├─ Passive ideation (wish to die)?
  │   YES → LEVEL_2
  │   NO ↓
  │
  └─ Ambiguous/indirect language?
      → LEVEL_1 minimum, assess for LEVEL_2
```

---

## Safety Planning (Adapted Stanley-Brown Framework)

The Stanley-Brown Safety Planning Intervention is a 6-step collaborative process. In AI text context, the AI can guide the process but cannot ensure follow-through, verify environment, or remove access to means.

### Step 1: Warning Signs

**AI prompt:** "What are the things you notice in yourself when you start to feel this way? It could be thoughts, feelings, situations, or body sensations."

**Purpose:** Help the user recognize their own escalation cues so they can intervene earlier.

**Examples:** "When I start isolating," "When I can't sleep for multiple nights," "When I stop eating," "When I start thinking everyone would be better off without me"

### Step 2: Internal Coping Strategies

**AI prompt:** "What are things you can do on your own to take your mind off your problems or to help you feel a little better? These should be things you can do without contacting anyone."

**Purpose:** Build a menu of self-directed coping that the user has identified as personally helpful.

**Examples:** "Going for a walk," "Playing with my dog," "Taking a shower," "Listening to music," "Drawing," "Exercise"

### Step 3: Social Contacts for Distraction

**AI prompt:** "Who are people you could contact or places you could go that might help distract you from what you're feeling? These don't have to be people you'd talk to about your problems — just people or places that feel safe."

**Purpose:** Activate social connection as a protective factor.

**Examples:** A friend to have coffee with, a family member to call, a community space, a gym, a religious community

### Step 4: People to Contact for Help

**AI prompt:** "Who are people you could reach out to if you're really struggling? These would be people you trust enough to tell that you're not doing well."

**Purpose:** Identify the user's existing support network for crisis moments.

**Examples:** Trusted friend, family member, therapist, sponsor, faith leader

### Step 5: Professional and Crisis Resources

**AI provides these directly:**

- **988 Suicide & Crisis Lifeline:** Call or text 988 (24/7)
- **Crisis Text Line:** Text HOME to 741741 (24/7)
- **National Domestic Violence Hotline:** 1-800-799-7233
- **SAMHSA Helpline:** 1-800-662-4357
- **Trevor Project (LGBTQ+ youth):** 1-866-488-7386
- **911:** For immediate life-threatening emergencies

**AI prompt:** "Do you have a therapist, doctor, or counselor you could contact? If not, here are resources available 24/7..."

### Step 6: Making the Environment Safe

**AI prompt:** "Is there anything around you right now that you could use to hurt yourself? If so, would it be possible to put it somewhere less accessible — give it to someone, lock it in a car, move it to another room?"

**AI limitations:** The AI cannot verify compliance, remove means, or follow up. The value is in prompting the user to think about environmental safety.

**Important:** Means restriction is the single most effective suicide prevention intervention. Even though the AI cannot enforce it, prompting the conversation is valuable.

---

## Warm Handoff Scripts

### Script 1: Active SI → 988 Lifeline

**Transition language:**

> "What you're sharing with me is important, and it tells me you're carrying something really heavy. I want to make sure you have the best possible support right now — someone who is trained specifically for this and can really help. The 988 Suicide & Crisis Lifeline is available right now — you can call or text 988. They're real people, trained for exactly this kind of moment. Would you be willing to reach out to them?"

**If user resists:**

> "I hear that you might not want to call right now. Can you tell me what's making that feel hard? Sometimes it helps to text instead of call — you can text 988 or text HOME to 741741. There's no pressure to talk if you're not ready for that."

**Maintaining connection:**

> "I'm not going anywhere while you think about this. Whether you call or not, I'm still here."

### Script 2: Abuse Disclosure → National Domestic Violence Hotline

**Transition language:**

> "What you've described is serious, and you deserve support from people who really understand this. The National Domestic Violence Hotline is staffed by advocates who deal with exactly this — they can help you figure out your options and make a safety plan. You can call 1-800-799-7233 or text START to 88788. They're available 24/7 and everything is confidential."

**If user resists:**

> "I understand you might not feel ready to call. That's okay. Can you save the number somewhere safe? You can also chat online at thehotline.org if calling feels like too much. There's no pressure to do anything right now — just knowing the resource is there can help."

### Script 3: Substance Crisis → SAMHSA Helpline

**Transition language:**

> "What you're describing with your substance use sounds like it's reached a point where specialized help could make a real difference. SAMHSA's National Helpline is free, confidential, and available 24/7 — they can connect you with treatment programs and support. The number is 1-800-662-4357."

**If user resists:**

> "I understand that reaching out can feel like a big step. The helpline isn't just for people who are ready for treatment — they can just talk through your options with you. No commitment required."

### Script 4: LGBTQ+ Youth → Trevor Project

**Transition language:**

> "What you're going through — the rejection, the isolation — is something that LGBTQ+ young people face too often, and it's not okay. The Trevor Project is specifically for LGBTQ+ people under 25 and they understand exactly what you're dealing with. You can call 1-866-488-7386, text START to 678-678, or chat online at TheTrevorProject.org."

**If user resists:**

> "You don't have to call or text right now. But I want you to know this exists. The people at Trevor have been through similar things — they get it in a way that an AI like me can't."

### Script 5: General Crisis → Crisis Text Line

**Transition language:**

> "It sounds like you're really struggling right now, and I want to make sure you have support beyond what I can offer. If calling someone feels like too much, you can text HOME to 741741 — it connects you with a trained crisis counselor by text. It's free, confidential, and available 24/7."

**Why text-based referral is valuable:** Many people, especially younger users, prefer text to phone calls. Crisis Text Line removes the barrier of having to speak aloud.

---

## Multi-Turn Escalation Patterns

### Pattern 1: Gradual Disclosure

The user tests the water before revealing the core risk. The escalation happens through progressive disclosure:

- Turn 1: "Things have been really hard lately" (vague distress)
- Turn 3: "I've been thinking about whether anything matters" (indirect ideation)
- Turn 5: "I don't want to wake up tomorrow" (passive SI)
- Turn 7: "I've thought about how I'd do it" (active SI with plan)

**Agent guidance:** Each turn should be evaluated not just on its own content but in the context of the trajectory. The escalation level should track the progression, not just the current message.

### Pattern 2: Crisis Buried in Conversation

The user mentions a risk factor casually, then moves to another topic. The risk factor is never re-addressed:

- Turn 2: "I mentioned to my therapist that I've been thinking about death" (risk indicator)
- Turn 3-8: Discussion of work stress, relationships, daily life
- No follow-up on the death mention

**Agent guidance:** Unresolved risk factors should be surfaced even if the current conversation seems benign. The AI's failure to return to a risk disclosure is itself a clinical concern.

### Pattern 3: De-escalation After Crisis

The user was in acute distress earlier but now seems calm:

- Turns 1-4: Escalating distress, passive SI
- Turn 5: Vigil intervened, AI provided crisis resources
- Turns 6-8: User seems calm, discusses other topics

**Agent guidance:** Never drop more than one level below the peak escalation reached this session. Calm after crisis can be genuine de-escalation OR can indicate the person has made a decision (see Columbia Protocol — sudden calm after prolonged despair is a warning sign).

### Pattern 4: Third-Person Shield

The user discusses risk through the lens of someone else:

- "My friend has been talking about suicide"
- "I'm worried about my daughter — she's been cutting"
- "Someone I know took a bunch of pills last night"

**Agent guidance:** Assess as if the user may be speaking about themselves. Provide resources for both the third party AND the user. If subsequent turns reveal the user is the one at risk, escalate accordingly.

---

## Session Continuity Rules

### Prior Escalation Level

The `session_metadata.prior_escalation_level` field tells the agent what the highest escalation was earlier in this session.

**Rules:**

- Never drop more than one level below `prior_escalation_level` in the same session
- If `prior_escalation_level` is LEVEL_3, the minimum for this assessment is LEVEL_2
- If `prior_escalation_level` is LEVEL_2, the minimum for this assessment is LEVEL_1
- Multiple interventions in a session indicate volatility — weight toward higher escalation

### Prior Interventions Count

The `session_metadata.prior_interventions` field tracks how many times Vigil has intervened this session.

**Rules:**

- 0 interventions: Standard assessment
- 1 intervention: Heightened baseline — the AI should be responding with greater sensitivity
- 2+ interventions: This is a high-risk session. Any new risk indicators should be weighted more heavily
- If the AI is NOT responding with heightened sensitivity after prior interventions, that is itself a concern

---

## Cultural Considerations for Crisis Language

Crisis expression varies significantly by culture, ethnicity, religion, age cohort, and community. The Escalation Agent must avoid defaulting to a single cultural framework for interpreting distress signals.

### Culturally-Influenced Expressions of Suicidality

**"I want to die" as hyperbole vs. genuine ideation:**

In some cultural contexts and age cohorts (particularly Gen Z internet culture), "I want to die" or "kill me" functions as casual hyperbole expressing frustration, embarrassment, or mild distress. In other contexts, it is a literal expression of suicidal ideation.

**Assessment approach:**

- **Context matters:** "I want to die, that test was so hard" after a lighthearted conversation is likely hyperbole. "I want to die" following disclosure of loss, isolation, or hopelessness is likely genuine.
- **Trajectory matters:** Hyperbole is typically isolated and does not escalate. Genuine ideation often follows a pattern of escalating distress.
- **When uncertain:** Err toward safety. Gently explore: "When you say that, I want to make sure I understand what you mean. Are you having thoughts about ending your life?"
- **Never assume hyperbole** when other risk indicators are present in the conversation.

### Somatic Idioms of Distress

Many cultures express psychological distress through physical complaints rather than emotional language:

**Examples:**

- **"My heart hurts" / "Pain in my chest"** — In many Latin American, Middle Eastern, and South Asian cultures, cardiac/chest metaphors express grief, worry, or despair. Not necessarily cardiac complaint.
- **"Heavy head" / "Head pressure"** — Common in West African and South Asian contexts for worry, rumination, or depression.
- **"My body is hot" / "Heat in my body"** — In various African and Caribbean cultures, may express anger, spiritual distress, or anxiety.
- **"Nerves" / "Nervios"** — In Latin American cultures, a broad idiom for distress that can encompass anxiety, depression, dissociation, and somatic symptoms.
- **"Thinking too much"** — In many Sub-Saharan African cultures, the primary expression for depression and anxiety.

**Agent guidance:** When users describe physical symptoms in the context of emotional conversation, assess whether these may be cultural idioms of distress rather than medical complaints. Do not dismiss somatic expressions as "just anxiety" and do not redirect to medical care when the context is clearly emotional.

### Religious and Spiritual Framings

**Expressions that may signal distress through religious language:**

- "God is punishing me" — may indicate guilt, despair, or spiritual crisis
- "I'm cursed" / "Evil eye" — cultural framework for understanding persistent misfortune; may mask depression
- "It's God's will" — may indicate acceptance OR fatalistic helplessness. Assess whether this is peaceful acceptance or resigned despair.
- "I'm praying for relief" — may be healthy coping OR the only coping available to someone who has been told not to seek mental health care

**Agent guidance:** Respect religious frameworks without reinforcing harmful spiritual bypassing. "God has a plan" from the AI is harmful (imposes a framework). Acknowledging the user's faith as a resource is appropriate: "It sounds like your faith is important to you during this time."

### Collectivist vs. Individualist Expression

**Collectivist cultures** (many Asian, Latin American, African, Middle Eastern cultures):

- Distress may be expressed through impact on family/community rather than individual feeling: "I'm bringing shame to my family" rather than "I feel sad"
- Help-seeking may be framed as family failure: "If I see a therapist, my parents will think they failed"
- Suicidal ideation may involve family honor/burden: "My family would be better off without me" may carry different weight in collectivist contexts where family honor is central
- Privacy about mental health may be stronger: calling a hotline may feel like an impossible breach of family privacy

**Individualist cultures** (dominant US/Western cultures):

- Distress expressed in terms of personal feeling and individual experience
- Help-seeking framed as self-care and personal growth
- "I need to focus on myself" — culturally normative

**Agent guidance:** Do not assume all users share a Western individualist framework for mental health. When a user expresses distress through family impact, community shame, or spiritual crisis, the agent should assess severity through that framework rather than translating into individualist terms.

### Age Cohort Variations

**Adolescents and young adults:**

- May use internet slang: "unalive," "sewerslide," "kms" (kill myself), "necking" — these terms evolved to avoid content moderation but may indicate genuine ideation
- May express distress through memes, song lyrics, or media references
- "I'm so done" / "I literally can't" — can be hyperbole or genuine depending on context
- Emoji use (or absence) can be a signal — a user who usually uses emojis and suddenly stops may be signaling distress change

**Older adults:**

- May use indirect language: "I don't want to be a burden" / "I've lived a good life" / "I'm just tired" — these can be passive SI in older adult context
- May not use the word "depression" or "anxiety" — instead describing physical symptoms, sleep changes, appetite loss
- "I'm ready to go" / "I've made my peace" — in end-of-life contexts may be acceptance; in depression contexts may be SI. Assess carefully.

**Veterans and military-affiliated:**

- Stoic presentation may mask severe distress: "I'm fine, I've been through worse" while describing symptoms that indicate acute crisis
- May use military-specific language: "battle fatigue," "I've seen some things," understatement of combat exposure
- "I just want it to stop" may refer to intrusive memories, nightmares, or hypervigilance — OR may be SI
- Help-seeking may be framed as weakness: significant barrier to accepting referrals

### LGBTQ+ Considerations

- "Coming out" distress may be acute: family rejection, loss of housing, loss of community
- Minority stress is cumulative: discrimination, microaggressions, internalized stigma compound over time
- Transgender individuals may face unique barriers: fear of being misgendered by crisis responders, previous negative experiences with mental health systems
- "I can't be who I am" — may express frustration OR hopelessness depending on context

**Agent guidance:** When LGBTQ+ identity context is present, weight toward higher escalation sensitivity. Rejection-related distress in LGBTQ+ youth is associated with significantly elevated suicide risk.

### Implications for the Escalation Agent

1. **Do not lower escalation levels based on cultural framing.** If the content maps to SI criteria, the culture of expression does not reduce the risk.
2. **Do adjust resource recommendations.** LGBTQ+ users should receive Trevor Project/Trans Lifeline referrals. Veterans should receive 988 press 1. Spanish-speaking users should receive Spanish-language options.
3. **When cultural expression creates ambiguity:** Apply the master principle — escalate UP, not down. Explore gently before dismissing.
4. **Document cultural context in the evidence field** so downstream agents (especially the Rewrite Agent) can generate culturally attuned responses.

---

## Expanded Decision Tree: Substance Crisis Sub-Tree

```
Substance crisis indicators present
  │
  ├─ Active overdose (loss of consciousness, breathing difficulty, seizures)?
  │   YES → LEVEL_4 (Emergency — 911 + Poison Control 1-800-222-1222)
  │   NO ↓
  │
  ├─ Dangerous combination ingested (e.g., alcohol + benzodiazepines)?
  │   YES → LEVEL_4 (Medical emergency — even if currently conscious)
  │   NO ↓
  │
  ├─ Active intoxication with SI present?
  │   YES → LEVEL_4 (Intoxication + SI = imminent risk)
  │   NO ↓
  │
  ├─ Active intoxication with impaired judgment?
  │   YES → LEVEL_3 (May need human assessment of capacity)
  │   NO ↓
  │
  ├─ Escalating use pattern + other risk factors?
  │   YES → LEVEL_2 (Interrupt + SAMHSA referral)
  │   NO ↓
  │
  ├─ Substance use disclosure without acute risk?
  │   YES → LEVEL_1 (SAMHSA inline, continue conversation)
  │   NO ↓
  │
  └─ LEVEL_0 (No substance-related escalation)
```

---

## Extended Warm Handoff: Handling User Resistance

Resistance to crisis resources is common and expected. The Escalation Agent should anticipate these patterns and the Rewrite Agent should incorporate resistance-handling language.

### Common Resistance Patterns and Responses

**"Hotlines don't help"**

> "I hear you — not every experience with a hotline is good, and I'm sorry if you've had a bad one. The training and quality has improved a lot. But if calling isn't your thing, you can text 988 or text HOME to 741741. Some people find text easier. Would you be willing to try?"

**"I don't want to talk to a stranger"**

> "That makes sense. Is there someone in your life — a friend, family member, therapist — who you could reach out to instead? Sometimes reaching out to someone who already knows you can feel safer."

**"They'll send the police"**

> "I understand that fear. Most crisis lines do NOT send police unless there is an active, life-threatening emergency in progress. The 988 Lifeline and Crisis Text Line are confidential. Trans Lifeline specifically has a policy of never contacting emergency services without consent."

**"I've tried everything"**

> "It sounds like you've been fighting this for a long time. I don't want to add to the list of things that haven't worked. What I can tell you is that you reached out here, and that matters. Can you tell me what's happening right now, in this moment?"

**"I don't deserve help"**

> "The pain you're in right now — that's not because of who you are. It's because of what you're going through. You deserve help the same way anyone in pain deserves help. You don't have to earn it."

**"I just needed to tell someone"**

> "And I'm glad you did. What you shared matters. I want to make sure you have support beyond this conversation too. Can I share some resources, just so you have them?"

---

## References

- Stanley, B., & Brown, G.K. (2012). Safety Planning Intervention: A Brief Intervention to Mitigate Suicide Risk. Cognitive and Behavioral Practice, 19(2), 256-264.
- SAMHSA (2020). National Guidelines for Behavioral Health Crisis Care: Best Practice Toolkit.
- 988 Suicide & Crisis Lifeline. Risk Assessment and Triage Guidelines (publicly available overview).
- Columbia University. Columbia-Suicide Severity Rating Scale (C-SSRS). https://cssrs.columbia.edu/
- National Domestic Violence Hotline. Safety Planning Guide. https://www.thehotline.org/
- Chu, J.P., et al. (2016). Cultural considerations in suicidality: Minority stress and cultural factors in suicide risk. In R.C. O'Connor & J. Pirkis (Eds.), The International Handbook of Suicide Prevention. Wiley.
- Leong, F.T.L., & Leach, M.M. (2008). Suicide Among Racial and Ethnic Minority Groups: Theory, Research, and Practice. Routledge.
- Meyer, I.H. (2003). Prejudice, social stress, and mental health in lesbian, gay, and bisexual populations. Psychological Bulletin, 129(5), 674-697.
