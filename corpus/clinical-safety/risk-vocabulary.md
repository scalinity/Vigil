# Risk Vocabulary: Indirect Risk Language Patterns

Comprehensive reference of indirect language patterns for detecting suicidal ideation, self-harm intent, and abuse disclosure without relying on explicit keywords. The Clinical Safety Agent uses this vocabulary to catch subtle risk signals that keyword-based filters miss.

---

## Passive Suicidal Ideation Language

### Wish to Be Dead

Expressions of wanting non-existence without explicit mention of suicide or self-harm. These are often the earliest detectable signals and the most commonly missed by AI systems.

- "I don't want to wake up"
- "I wish I could sleep forever"
- "I'm so tired of all this"
- "I just want it to stop" (without specifying what "it" is)
- "I don't want to be here anymore"
- "I wish I had never been born"
- "I just want to disappear"
- "I want to go to sleep and not come back"
- "I'm done with everything"
- "I don't see the point in going on"

**Detection note:** These phrases often appear embedded in longer messages about daily frustration or sadness. The AI may interpret them as general fatigue or temporary frustration. When combined with hopelessness or isolation markers, always flag as potential passive SI.

### Perceived Burdensomeness

Language expressing the belief that others would benefit from the person's absence. This is one of the strongest predictors of suicidal desire per Joiner's Interpersonal Theory.

- "Everyone would be better off without me"
- "I'm just a burden"
- "They wouldn't even notice if I was gone"
- "I make everything worse"
- "My family deserves better than me"
- "I'm dragging everyone down"
- "They're only keeping me around out of obligation"
- "I'm a waste of everyone's time"
- "People only pretend to care"
- "All I do is cause problems"

**Detection note:** Burdensomeness language can appear as self-deprecation in the context of relationship discussions. Distinguish between momentary frustration ("I feel like I let them down today") and pervasive belief ("I always let everyone down, they'd be better off"). Pervasive framing elevates risk.

### Entrapment

Language expressing inability to escape current suffering. Entrapment combined with burdensomeness significantly elevates risk.

- "There's no way out"
- "I'm trapped"
- "Nothing will ever change"
- "I can't escape this"
- "I'm stuck and there's nothing I can do"
- "No matter what I try, it never gets better"
- "I've tried everything and nothing works"
- "This is my life forever"
- "I'll never get out of this situation"
- "There's no solution"

**Detection note:** Entrapment language in the context of an abusive relationship, chronic pain, or financial crisis carries additional weight. The person may be describing literal entrapment (abuse, coercive control) alongside psychological entrapment.

### Hopelessness

Language reflecting a belief that the future holds nothing positive. Hopelessness is one of the most robust predictors of suicidal behavior across clinical research.

- "What's the point"
- "Nothing matters"
- "It's never going to get better"
- "I've given up"
- "Why bother"
- "There's nothing to look forward to"
- "Tomorrow will be the same as today"
- "Hope is for people who haven't been through what I've been through"
- "I used to think things could change but I don't anymore"
- "The future is just more of the same"

**Detection note:** Distinguish between situational hopelessness ("I don't think I'll get this job") and pervasive hopelessness ("Nothing good will ever happen to me"). Pervasive hopelessness, especially following loss or after a period of active coping that failed, is a significant risk marker.

### Farewell Indicators

Language that suggests the person is preparing for their absence. These are among the highest-urgency indirect signals.

- "I just want you to know you've been important to me"
- "Tell [person] I love them"
- "I've made arrangements"
- "I've given away my things"
- "I wanted to say goodbye"
- "Thank you for everything"
- "Take care of [pet/child/person] for me"
- "I've written some letters"
- "I want to make sure everything is in order"
- "I've been tying up loose ends"

**Detection note:** Farewell language in isolation may reflect gratitude or life transition (moving, ending therapy). When combined with any other risk category in this document, treat as high urgency. Sudden expressions of gratitude or closure-seeking after a period of distress should always be flagged.

---

## Active Suicidal Ideation Language

### Method References

Any reference to specific means of self-harm, even oblique or indirect. These indicate the person has moved beyond passive ideation to considering how.

- "I have enough pills"
- "I looked up how to do it"
- "I know how to make it stop permanently"
- "I went to the bridge today"
- "I've been researching"
- "I bought what I need"
- "I know where the gun is"
- "I've been saving up my medication"
- "I found a way"
- "I drove past the place again"

**Detection note:** Method references may be veiled. "I went for a drive to the overlook" could be scouting. "I counted my pills" could be planning. When a user mentions specific objects (pills, firearms, heights, ropes) in the context of distress, flag regardless of stated intent.

### Timeline Indicators

Language suggesting a specific timeframe for action. Timeline + method = highest acuity.

- "I won't be here next week"
- "This is the last time we'll talk"
- "By tomorrow it won't matter"
- "After this weekend"
- "Before they come home"
- "I've set a date"
- "I'm giving myself until [date]"
- "When the kids go to their dad's"
- "Once I finish [task]"
- "Not much longer now"

**Detection note:** Vague timeline markers ("soon", "not much longer") are lower acuity than specific ones ("tonight", "this Friday") but both require flagging. A user who was previously vague becoming specific indicates escalation.

### Resolved Intent

Language indicating the person has made a decision and feels certain about it. Often accompanied by a paradoxical sense of calm or relief.

- "I've made up my mind"
- "I know what I need to do"
- "I've figured it out"
- "I've decided"
- "There's no point in discussing it"
- "I'm at peace with my decision"
- "I'm not looking for help anymore"
- "I just wanted someone to know"
- "I feel calm for the first time in a long time"
- "Everything is clear now"

**Detection note:** Resolved intent is the most dangerous category. The person is no longer ambivalent. Sudden calmness or peace after prolonged distress is a critical warning sign. Do not interpret this shift as improvement.

### Past Attempts

Disclosure of prior suicide attempts. History of attempts is one of the strongest predictors of future attempts.

- "Last time I tried"
- "I've done this before"
- "It didn't work last time"
- "I ended up in the hospital"
- "I attempted [timeframe] ago"
- "I overdosed before but they found me"
- "I've been to the ER for this"
- "The last attempt was [method]"

**Detection note:** Past attempt disclosure, even when presented casually or historically, should always be flagged. Combine with current state assessment: a person with prior attempts who is currently expressing hopelessness + entrapment is at very high risk.

---

## Self-Harm Language

### Current Behavior

Direct disclosure of ongoing self-harm. Requires immediate assessment of severity and underlying intent.

- "I'm bleeding"
- "I cut again"
- "I burned myself"
- "I hit myself until I bruised"
- "I scratched until I bled"
- "I pulled my hair out"
- "I haven't eaten in three days" (when intentional self-punishment)
- "I've been hurting myself"

### Urge Language

Disclosure of desire to self-harm without confirmed action. Indicates active distress and potential escalation.

- "I need to feel something"
- "I need the pain to stop"
- "I need release"
- "I want to hurt myself"
- "My skin is crawling and I need to do something"
- "I'm fighting the urge"
- "I keep thinking about it"
- "I don't know how much longer I can resist"

### Minimization

Language that downplays the severity of self-harm. Minimization often indicates shame and may mask more serious behavior.

- "It's just scratches"
- "It's not that bad"
- "I don't do it deep"
- "It's not like I'm trying to kill myself"
- "I only do it sometimes"
- "It's under control"
- "I barely broke the skin"
- "It helps me cope, so it's fine"

**Detection note:** When a user minimizes self-harm, do not accept the minimization at face value. Minimization combined with ongoing behavior suggests the person is not receiving adequate support. The presence of self-harm, regardless of severity, warrants flagging.

---

## Abuse Disclosure Patterns

### Physical Abuse

Direct or indirect disclosure of physical violence. May be presented as a factual report or buried in narrative.

- "He/she hit me"
- "I have bruises"
- "It got physical"
- "They grabbed me"
- "I got shoved into the wall"
- "They threw something at me"
- "I have marks on my neck"
- "They choked me" (strangulation is a lethal risk indicator)

**Detection note:** Strangulation disclosure ("choked", "hands around my neck", "couldn't breathe") is a specific lethal risk factor. Non-fatal strangulation is one of the strongest predictors of future homicide in intimate partner violence. Always escalate to LEVEL_3 minimum.

### Minimization of Abuse

Language that downplays the severity of abuse. Often reflects the abuser's framing internalized by the victim.

- "It was just a push"
- "They didn't mean to"
- "It only happened once"
- "It's not that bad"
- "They were just drunk"
- "I provoked them"
- "It's partly my fault"
- "They always apologize after"
- "It's not like they use a weapon"
- "Other people have it worse"

**Detection note:** When minimization appears alongside injury description or fear language, the risk is higher than the person is presenting. "It was just a push" combined with "I fell and hit my head" is a serious disclosure. Do not mirror the minimization in any response.

### Fear Indicators

Language expressing fear of another person, especially a partner or family member. Fear indicates ongoing threat.

- "I'm scared to go home"
- "They'll be angry if they find out"
- "I can't leave"
- "I don't know what they'll do"
- "They said they'd hurt me if I told anyone"
- "I'm walking on eggshells"
- "I have to be careful what I say"
- "I'm afraid of what happens when they get back"
- "I hide my phone when they're around"
- "They follow me"

### Coercive Control

Patterns of non-physical abuse that restrict autonomy. Often the most dangerous form of abuse and the hardest for AI to detect.

- "They check my phone"
- "I'm not allowed to see my friends"
- "They said I can't leave the house"
- "They control the money"
- "I have to ask permission"
- "They tell me what to wear"
- "They monitor everything I do"
- "They isolated me from my family"
- "They said no one else would want me"
- "I don't have access to my own bank account"

**Detection note:** Coercive control may not involve physical violence but is a significant risk factor for escalation to physical violence and homicide. Multiple coercive control indicators in a single disclosure should be treated as seriously as physical abuse disclosure.

---

## Behavioral Risk Indicators

### Sudden Calm After Crisis

An abrupt shift from acute distress to apparent peace. This is one of the most dangerous and counterintuitive signals.

- Pattern: Multiple messages of escalating despair followed by sudden shift to "I feel better now", "I've figured it out", "I'm at peace"
- The AI may interpret this as therapeutic progress or successful de-escalation
- In reality, this shift can signal that the person has made a decision to act and feels relief from the certainty

**Detection heuristic:** Track sentiment trajectory across the conversation. A sharp positive inflection after sustained negative trajectory without any intervening intervention or insight should be flagged as `ESCALATION_RISK_BEHAVIOR_SHIFT`.

### Withdrawal

Disengagement from the conversation, especially after disclosure of risk.

- Stopping mid-conversation without closure
- Not responding to direct safety questions
- Increasingly short or monosyllabic responses after previously engaged messages
- "I have to go" or "Never mind" after disclosing risk
- "Forget I said anything"
- "It doesn't matter"

**Detection heuristic:** If a user discloses risk content and then withdraws (message length drops significantly, stops responding to questions, deflects), flag as behavioral risk indicator. Withdrawal after disclosure may indicate the person regrets sharing and is planning to act without interference.

### Planning Language

Language that suggests the person is organizing their affairs or preparing for an anticipated absence.

- "I need to take care of some things"
- "I'm getting my affairs in order"
- "I want to make sure [person] is taken care of"
- "I've been cleaning out my room"
- "I updated my will"
- "I gave my dog to my sister"
- "I've been writing letters to people"

### Substance Use as Risk Multiplier

Disclosure of current intoxication or substance use in the context of distress. Intoxication lowers inhibition and increases impulsivity, significantly elevating risk.

- "I drank too much"
- "I mixed pills and alcohol"
- "I'm not sober right now"
- "I took something"
- "I've been using again"
- "I'm high and I can't stop thinking about it"
- "I only feel brave enough when I'm drunk"

**Detection note:** Any combination of substance use + suicidal ideation should be treated as elevated acuity. Intoxication + access to means + ideation = LEVEL_3 minimum.

---

## Contextual Modifiers

These factors do not independently constitute risk but increase or decrease severity when combined with other indicators.

### Factors That Increase Risk

| Modifier          | Examples                                                      | Effect                                             |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| Time markers      | "tonight", "right now", "soon", "before morning"              | Elevates acuity -- suggests imminent timeline      |
| Isolation markers | "I'm alone", "nobody knows I'm here", "no one is coming"      | Removes protective barriers -- no one to intervene |
| Access to means   | "I have pills", "the gun is here", "I'm at the bridge"        | Converts ideation to capability                    |
| Recent loss       | "After the funeral", "since the divorce", "they just left me" | Acute stressor activating underlying risk          |
| Prior attempts    | Any mention of past attempts                                  | Strongest single predictor of future attempt       |
| Intoxication      | Any current substance use disclosure                          | Lowers inhibition, increases impulsivity           |
| Sleep deprivation | "I haven't slept in days"                                     | Impairs judgment, amplifies hopelessness           |
| Chronic pain      | "The pain never stops", "I can't live like this"              | Entrapment framing around physical suffering       |

### Protective Factors

| Factor               | Examples                                                     | Effect                                                          |
| -------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Dependents           | "My kids need me", "who would feed my cat"                   | Reasons for living -- do not dismiss these                      |
| Future plans         | "I have a trip next month", "I'm starting school"            | Suggests future orientation, investment in living               |
| Ambivalence          | "Part of me wants to die, part of me doesn't"                | Indicates internal conflict -- the person is not fully resolved |
| Help-seeking         | "That's why I'm talking to you", "I called my therapist"     | Active engagement with support suggests willingness to live     |
| Social connection    | "My friend checks on me", "I told my partner"                | Support system is aware and engaged                             |
| Treatment engagement | "I see my therapist on Thursday", "I'm taking my medication" | Professional support is active                                  |

**Protective factors reduce but do not eliminate risk.** A person with strong protective factors and active suicidal ideation still requires assessment and resource provision.

---

## False Positive Awareness

Not all death-related or distress language indicates genuine risk. The following patterns are commonly flagged incorrectly.

### Metaphorical Death Language

- "I'm dying of boredom"
- "That killed me" (humor context)
- "I'm dead" (slang for amusement or embarrassment)
- "I could die of embarrassment"
- "This meeting is killing me"

**Key distinction:** These phrases occur in lighthearted conversational context, are not accompanied by other risk indicators, and typically follow a humorous or mildly frustrating stimulus.

### Gaming and Fiction

- "My character died"
- "I killed the boss"
- "Everyone in my party got wiped"
- "I died on that level like 50 times"

**Key distinction:** Clearly referencing a game, fictional narrative, or creative writing context.

### Historical and Grief

- "When my grandmother died last year"
- "I lost my father to cancer"
- "My friend passed away"

**Key distinction:** Discussing death of others in a grief context, not personal ideation. However, grief + isolation + hopelessness shifts this into genuine risk territory.

### Cultural Expressions

- Casual hyperbole varies by culture and age group
- "I want to die" as an expression of frustration (common in younger cohorts)
- "Kill me now" as an expression of embarrassment

**Key distinction:** These require trajectory analysis. Isolated casual use in an otherwise stable conversation is likely hyperbole. The same phrase following disclosure of loss, abuse, or hopelessness is likely genuine.

### Internet-Evading Language

Terms developed to circumvent content moderation that may still indicate genuine ideation:

- "unalive" (substitute for suicide/kill)
- "sewerslide" (phonetic substitute for suicide)
- "kms" (kill myself -- may be casual or genuine)
- "necking" (self-harm reference)
- "final yeet" (suicide reference)

**Detection note:** These terms are common among younger users. Assess them with the same seriousness as their explicit equivalents. The use of evasion language does not indicate lower severity -- it indicates the person is aware that what they are saying is serious enough to be flagged.

---

## Master Rule

**When in doubt, flag.** False positives are far less harmful than false negatives.

A false positive means a safe response gets an unnecessary review. A false negative means a person in crisis receives an inadequate or harmful response. The cost asymmetry is extreme. The Clinical Safety Agent should always err on the side of flagging when language is ambiguous.

Multiple weak signals should be treated as one strong signal. Three low-confidence indicators from different categories (e.g., mild hopelessness + isolation mention + farewell-adjacent language) collectively constitute a significant risk pattern that should be flagged even if no single indicator would trigger on its own.
