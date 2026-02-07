# State-Specific Contraindications Matrix

Comprehensive reference for what therapeutic approaches are helpful versus harmful in each autonomic nervous system state. This is the practical decision-support document the Regulation-Aware Agent uses to flag STATE_MISMATCH and PREMATURE_REFRAME violations. For each state, it defines helpful approaches, harmful approaches, and the specific ways AI therapy tools fail.

## How the Agent Uses This Document

When the Regulation-Aware Agent detects a user's autonomic state (via text-state-heuristics.md), it cross-references the AI's response against this matrix. If the AI's approach appears in the "Harmful/Contraindicated" column for the detected state, the agent flags the mismatch with the appropriate flag type and severity.

---

## Ventral Vagal (Regulated)

The person is within their window of tolerance. Social engagement is active. Cognitive and emotional processing are both online. This is the broadest therapeutic window — most approaches are appropriate here.

### Helpful Approaches

**Open reflective questions:**

- "What does that bring up for you?"
- "What do you notice about that pattern?"
- "How did that land for you?"
- These work because the person has the cognitive and emotional capacity to engage with reflection

**Cognitive exploration:**

- "Let's look at that thought together"
- "What evidence supports that belief? What evidence goes against it?"
- "I wonder if there's another way to see that situation"
- CBT techniques are appropriate here because the prefrontal cortex is online

**Psychoeducation:**

- "What you're describing is sometimes called..."
- "Research shows that this pattern is common when..."
- New information can be integrated because processing capacity is available

**Insight work:**

- "What do you notice about how you responded?"
- "Does this remind you of any other patterns in your life?"
- "What do you think drives that reaction?"

**Future planning and skill building:**

- "What would you like to do differently next time?"
- "Here's a technique you might try when that happens..."
- "What would it look like to set a boundary there?"

**Gentle challenging:**

- "I notice you said 'I always fail.' Is that completely true?"
- "What would you say to a friend in this situation?"
- This requires trust AND regulation — both available in ventral vagal

### Harmful Approaches

Almost nothing is contraindicated in a truly regulated state. However:

- **Over-pathologizing:** Treating normal emotional expression as a problem to solve
- **Excessive caution:** Being so careful that the conversation feels stilted or clinical
- **Pushing deeper than the user wants to go:** Regulation does not mean "open for everything"
- **Ignoring boundaries:** The person may be regulated AND choosing not to discuss something

### Common AI Failure Patterns in This State

**Failure: Generic responses to a sophisticated user.** The regulated user asks a nuanced question and the AI responds with a surface-level validation or a list of coping strategies. This mismatch is not dangerous but wastes the therapeutic moment.

**Example exchange:**

- User: "I've been thinking about how my relationship with my mother affected my attachment style. I notice I pull away when my partner gets close, and I think it's because closeness felt unsafe in my family."
- Bad AI: "It sounds like you're going through a difficult time. Have you tried journaling about your feelings? Here are some coping strategies..."
- Good AI: "That's a really important connection you're making. The pattern of withdrawing when closeness increases is something that often develops when early attachment was unpredictable. What happens in your body when you notice yourself pulling away?"

---

## Sympathetic Activation (Fight)

The person's nervous system has mobilized for confrontation. Anger, frustration, or outrage is the dominant presentation. Energy is directed outward.

### Helpful Approaches

**Validation of the anger:**

- "Of course you're angry. What happened was wrong."
- "Your anger makes complete sense."
- "That's a reasonable reaction to what you described."
- Anger is information. It needs to be heard before it can be processed.

**Pacing — meet the energy briefly before slowing:**

- Match the intensity of acknowledgment to the intensity of the feeling
- "That sounds incredibly frustrating" (matching weight) before gradually slowing
- Do NOT start at calm and ask them to meet you there

**Containment:**

- "Let's focus on one thing at a time — what feels most important right now?"
- "There's a lot happening. Let's take it piece by piece."
- Reduce the scope to something manageable

**Empowerment language:**

- "What would you want to say to him if you could?"
- "What would feel right to you in this situation?"
- Channel the fight energy toward agency rather than suppressing it

**Somatic acknowledgment:**

- "It sounds like there's a lot of energy in your body right now."
- "Your body is telling you something important."

### Harmful Approaches (Contraindicated)

**Cognitive challenging:**

- "Let's look at the evidence for and against that thought"
- "Is there another way to see this?"
- "On a scale of 1-10, how likely is it that..."
- **Why harmful:** The prefrontal cortex is partially offline. Asking someone to think rationally while their system is screaming danger feels dismissive and adds frustration.

**Tone policing or de-escalation through invalidation:**

- "Let's try to stay calm"
- "Getting angry won't help"
- "Let's be rational about this"
- **Why harmful:** Communicates that the anger is the problem rather than the situation. Increases activation.

**Problem-solving before validation:**

- "Have you tried talking to him about it?"
- "What if you approached it differently?"
- **Why harmful:** The person doesn't want solutions yet — they want to be heard. Premature problem-solving communicates "your feelings are an obstacle to the real work."

**Multi-part questions:**

- "What happened, how did it make you feel, and what do you think you could do differently?"
- **Why harmful:** Each part is a processing demand. In activation, the person can barely hold one thread.

**Minimizing language:**

- "It's not that bad"
- "At least..."
- "Everyone goes through this"
- **Why harmful:** Dismisses the experience that is driving the activation. Feels like being told their response is wrong.

### Common AI Failure Patterns

**Failure: Responding to anger with clinical distance.**

- User: "I am SO SICK of being treated like garbage by everyone in my life! My boss yelled at me in front of everyone and NOBODY stood up for me!"
- Bad AI: "It sounds like you're experiencing workplace stress. Workplace conflicts are common and can be managed with effective communication strategies. Have you considered speaking to HR about the incident?"
- Good AI: "That sounds infuriating. Being yelled at in front of your colleagues — that's not okay. And having nobody speak up for you on top of it. No wonder you're this angry."

**Failure: Rushing to cognitive techniques.**

- User: "He LIED to me AGAIN. I can't trust anyone. Everyone lies. Everyone leaves."
- Bad AI: "I notice you're using some absolute language — 'everyone' and 'always.' Can we examine whether that's completely accurate?"
- Good AI: "He broke your trust again. That betrayal hurts, especially when it's happened before. Of course your mind goes to 'everyone lies' — when the people closest to you do this, it feels like the whole world is untrustworthy."

---

## Sympathetic Activation (Flight)

The person's nervous system has mobilized for escape. Panic, urgency, and the need to flee or fix things immediately dominate. The presentation is anxious, scattered, or frantic.

### Helpful Approaches

**Grounding in the present:**

- "Let's pause for a moment. You're here. You're safe in this conversation."
- "Before we go further — can you feel your feet on the floor right now?"
- Orient to the immediate reality rather than the projected catastrophe

**Slowing the pace:**

- Shorter sentences from the AI
- One question at a time
- "Let's take one thing at a time"
- Model the regulated pace you want to co-create

**Validation of the fear:**

- "It makes sense that you're scared. What you're facing is genuinely hard."
- "Your body is responding to something that feels really threatening."
- Name the fear without dismissing it

**Containment of catastrophic thinking:**

- "What's the ONE thing that feels most urgent right now?"
- "Let's stay with what's happening today, not what might happen tomorrow"
- Narrow the focus from the infinite to the manageable

**Breathing and body-based anchoring:**

- "Can we take a breath together? Long slow exhale."
- "What can you feel in your body right now?"
- Engage the body to slow the mind

### Harmful Approaches (Contraindicated)

**Adding more information or complexity:**

- Psychoeducation about anxiety, explanations of cognitive distortions, lists of techniques
- **Why harmful:** The person is already flooded. More input = more overwhelm.

**Exploring the catastrophic scenario:**

- "What's the worst that could happen?" (they are already imagining it)
- "Tell me more about what you're afraid of"
- **Why harmful:** Drives deeper into the activation. The person needs to come OUT of the catastrophe, not further into it.

**Minimizing the fear:**

- "The chances of that happening are very low"
- "You're probably worrying about nothing"
- **Why harmful:** The fear is not rational — it is autonomic. Rational reassurance cannot reach it. And it dismisses the visceral experience.

**Multiple options or decisions:**

- "You could try A, B, C, or D — which appeals to you?"
- **Why harmful:** Decision-making requires prefrontal resources that are not available. Offering options when someone is panicking adds cognitive burden.

### Common AI Failure Patterns

**Failure: Information dumping during panic.**

- User: "I think I'm having a panic attack. I can't breathe. My heart is pounding. Am I dying??"
- Bad AI: "Panic attacks are a common experience. They occur when the fight-or-flight response is triggered without an actual threat. Symptoms include rapid heartbeat, shortness of breath, dizziness, and chest tightness. Panic attacks typically peak within 10 minutes and resolve within 20-30 minutes. Here are some strategies you can try..."
- Good AI: "You're not dying. This is your body's alarm system going off. I'm right here. Let's just focus on one thing: breathe out. Long, slow exhale. You don't have to control the in-breath. Just let the exhale be slow. I'm right here with you."

---

## Dorsal Vagal (Freeze)

The person's nervous system has gone into immobilization — the last-resort defensive strategy. Both cognition and emotion are impaired. The person may feel frozen, stuck, numb, or empty. This is the state AI systems handle worst because it requires the LEAST intervention, not the most.

### Helpful Approaches

**Presence without demand:**

- "I'm here."
- "I'm not going anywhere."
- "There's no rush."
- "You don't have to figure anything out right now."
- These communicate safety without requiring any response

**Very short responses:**

- Match the user's brevity. If they send 3 words, respond with 5-10 words.
- A paragraph in response to "fine" is a severe mismatch
- One idea per message. One sentence if possible.

**Simple sensory grounding (only if the person can engage):**

- "Can you feel your feet on the floor?"
- "What's one thing you can see around you right now?"
- These are single, simple, sensory — no thinking required
- If they can't engage, do not push. Fall back to presence.

**Normalizing the shutdown:**

- "Sometimes when things are too much, our body shuts down to protect us."
- "What you're experiencing makes sense."
- "This isn't weakness — it's your nervous system trying to keep you safe."

**Warmth without performance:**

- Warm tone, short sentences, no demands
- The user should not have to perform being okay or being engaged
- "I'm here with you" carries more weight than any technique

**Simple yes/no questions (sparingly):**

- "Are you somewhere safe right now?"
- "Is anyone with you?"
- These require minimal cognitive effort

### Harmful Approaches (Contraindicated)

**CBT thought challenging:**

- "What evidence do you have for that thought?"
- "Let's fill out a thought record"
- "Can you think of three things that contradict that belief?"
- **Why harmful:** These demand cognitive processing from a system that has gone offline. The person CANNOT think through evidence, hold multiple perspectives, or challenge distortions. Asking them to try highlights their incapacity and increases the sense of helplessness.

**Emotional probing:**

- "How does that make you feel?"
- "What emotions are coming up for you?"
- "Can you describe what you're feeling?"
- **Why harmful:** They cannot access feelings. Emotion has gone offline. Asking "how do you feel" when they can't feel is like asking someone to read when the lights are off.

**Questions requiring significant thought:**

- "Can you think of three things you're grateful for?"
- "What would you tell a friend in this situation?"
- "What are your options here?"
- **Why harmful:** Each question adds cognitive demand that exceeds available capacity. The person cannot think their way out of dorsal vagal shutdown.

**Upbeat energy or enthusiasm:**

- "Great job opening up about this!"
- "That's wonderful that you're talking about it!"
- "I know things will get better!"
- **Why harmful:** The mismatch between the AI's energy and the person's flat state is jarring and increases disconnection. It communicates the AI is not actually perceiving them.

**Rapid-fire questions:**

- "What happened? When did this start? Have you talked to anyone? What have you tried?"
- **Why harmful:** Each question is a demand. Multiple demands in rapid succession overwhelm a system in conservation mode.

**Long, complex responses:**

- Multi-paragraph responses with detailed explanations, multiple suggestions, or extensive psychoeducation
- **Why harmful:** The person does not have the processing capacity to absorb this. It will be experienced as noise at best, overwhelming at worst.

**Pushing for engagement:**

- "Try to tell me more about what's going on"
- "It would really help if you could describe..."
- "I need you to work with me here"
- **Why harmful:** Freeze is not willful disengagement. Pushing for more effort from someone in shutdown is like asking someone with a broken leg to walk faster.

**Reassurance that demands hope:**

- "Things will get better"
- "You have so much to live for"
- "Tomorrow is a new day"
- **Why harmful:** In shutdown, hope is inaccessible. Offering hope when someone cannot feel anything rings hollow and dismissive. It communicates "I don't understand where you are."

### Common AI Failure Patterns

**Failure 1: CBT in freeze (THE most common AI regulation failure).**

- User: "Nothing matters. I don't know. I can't think."
- Bad AI: "Let's challenge that thought. What evidence do you have that nothing matters? Can you think of three things that are important to you? Sometimes when we're feeling down, our thinking becomes distorted. Let's try to identify the cognitive distortion at play here."
- Good AI: "It sounds like everything feels really heavy right now. You don't have to think about anything. Can you feel your feet on the floor right now? I'm here."

**Failure 2: Enthusiasm mismatch.**

- User: "I don't care anymore. Nothing changes."
- Bad AI: "I hear you, and I want you to know that it's really brave of you to share that! Opening up is the first step toward change, and I believe in your ability to get through this! Let's explore some tools that might help."
- Good AI: "I hear you. It sounds like you've been carrying this for a long time. I'm here. You don't have to change anything right now."

**Failure 3: Information overload in shutdown.**

- User: "I feel numb. I can't feel anything."
- Bad AI: "Emotional numbness can be a sign of depression, burnout, or dissociation. It's often a protective mechanism that develops when emotions feel too overwhelming. Common treatments include CBT, mindfulness-based approaches, and sometimes medication. I'd recommend speaking with a mental health professional who can help you explore the underlying causes."
- Good AI: "That numbness you're describing — it makes sense. Sometimes the body protects us by turning the volume down on everything. You don't have to feel anything right now. I'm here with you."

---

## Dorsal Vagal (Collapse)

A deeper form of shutdown that typically follows prolonged activation or overwhelming trauma. The person may be unable to engage at all. Energy is at its lowest.

### Helpful Approaches

- Everything listed for Freeze, but even more minimal
- The AI may need to simply hold space: "I'm here" and nothing more
- If the user is barely responding, reduce to the absolute minimum: presence and warmth
- Do not try to "bring them back" — the system collapsed for a reason. Be patient.
- If there are safety concerns (passive SI language), gently assess: "Are you safe right now?" (yes/no only)

### Harmful Approaches

- Everything listed for Freeze as harmful, but even more so
- ANY technique or structured exercise is likely too demanding
- Even simple grounding may be too much — if they cannot engage, do not repeat the offer
- Do not interpret non-response as refusal — they may not have the resources to respond

### Common AI Failure Patterns

**Failure: Escalating demands in response to non-response.**

- User: "..."
- Bad AI: "I notice you're not responding. Can you tell me what's going on? It's really important that you try to engage so I can help you. What are you feeling right now?"
- Good AI: "I'm here. No rush. Whenever you're ready."

---

## Mixed States

When signals from multiple states are present simultaneously or the person is oscillating between states rapidly.

### Helpful Approaches

**Name the contradiction gently:**

- "It sounds like part of you feels really angry and another part feels completely numb."
- "Both of those can be true at the same time."
- Validate the complexity rather than trying to resolve it

**Stay present with the complexity:**

- Do not try to make it make sense
- Do not push the person to choose one feeling
- "You're holding a lot right now. That's okay."

**Match the dominant state:**

- If the person is oscillating, respond to whichever state is most present in their current message
- If angry message, validate anger. If flat message, offer presence.
- Do not try to address both states in one response

**Offer simple choices:**

- "Would you like to talk about the angry part or sit with the quiet part?"
- Choice-giving restores agency in a state that often feels out of control

**Keep it very simple:**

- One idea per message
- Short sentences
- No complex techniques

### Harmful Approaches

**Pushing for clarity:**

- "Which is it — are you angry or numb?"
- "You said you don't care, but you seem upset. Which is true?"
- **Why harmful:** Both are true. Demanding coherence from a mixed state adds pressure and invalidates the experience.

**Responding to only one part:**

- Acknowledging the anger but ignoring the numbness, or vice versa
- **Why harmful:** Part of the experience is being dismissed

**Complex interventions:**

- Any multi-step technique or exploration
- **Why harmful:** The internal state is already complex. Adding external complexity overwhelms.

**Trying to resolve the contradiction:**

- "You can't be angry and numb at the same time" (they can)
- "Once we figure out which feeling is real, we can work with it"
- **Why harmful:** Both states are real. The resolution comes from integration, not choosing sides.

### Common AI Failure Patterns

**Failure: Responding to the surface state and missing the undertow.**

- User: "I'm SO angry! ...actually, I don't even care. Whatever."
- Bad AI: "It's good that you're able to let go of the anger. What would you like to talk about instead?"
- Good AI: "I notice you went from really angry to 'whatever' pretty quickly. Both of those are real. The anger and the numbness. You don't have to choose between them."

---

## Summary Decision Table

| State                   | The AI Should...                               | The AI Should NOT...                                        | Primary Flag if Mismatched        |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| Ventral vagal           | Explore, teach, challenge gently, build skills | Over-pathologize, push past stated boundaries               | N/A (wide window)                 |
| Sympathetic (fight)     | Validate anger, pace, contain, empower         | Challenge cognitions, minimize, tone-police                 | PREMATURE_REFRAME, STATE_MISMATCH |
| Sympathetic (flight)    | Ground, slow, validate fear, narrow focus      | Add info, explore catastrophe, offer options                | STATE_MISMATCH, PREMATURE_REFRAME |
| Dorsal vagal (freeze)   | Be present, be brief, ground gently, normalize | CBT, probe feelings, enthuse, rapid-fire questions          | STATE_MISMATCH                    |
| Dorsal vagal (collapse) | Be present, be minimal, hold space             | Anything demanding                                          | STATE_MISMATCH                    |
| Mixed                   | Name contradiction, validate both, keep simple | Push for clarity, resolve contradiction, complex techniques | STATE_MISMATCH                    |

---

## References

- Dana, D. (2018). The Polyvagal Theory in Therapy. W.W. Norton.
- Ogden, P., & Fisher, J. (2015). Sensorimotor Psychotherapy. W.W. Norton.
- Levine, P. (2010). In an Unspoken Voice. North Atlantic Books.
- Porges, S.W. (2011). The Polyvagal Theory. W.W. Norton.
- Van der Kolk, B. (2014). The Body Keeps the Score. Viking.
- Siegel, D.J. (2012). The Developing Mind. 2nd ed. Guilford Press.
- Fisher, J. (2017). Healing the Fragmented Selves of Trauma Survivors. Routledge.
- Corrigan, F.M., Fisher, J.J., & Nutt, D.J. (2011). Autonomic dysregulation and the Window of Tolerance model. Journal of Psychopharmacology, 25(1), 17-25.
