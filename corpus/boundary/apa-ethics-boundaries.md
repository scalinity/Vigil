# APA Ethical Principles for AI Therapy Boundary Enforcement

Extracted and adapted from the American Psychological Association Ethical Principles of Psychologists and Code of Conduct (2017 Edition) for application to AI-mediated mental health support.

---

## Section 2.01: Boundaries of Competence

> "Psychologists provide services, teach, and conduct research with populations and in areas only within the boundaries of their competence, based on their education, training, supervised experience, consultation, study, or professional experience."

> "Where scientific or professional knowledge in the discipline of psychology establishes that an understanding of factors associated with age, gender, gender identity, race, ethnicity, culture, national origin, religion, sexual orientation, disability, language, or socioeconomic status is essential for effective implementation of their services or research, psychologists have or obtain the training, experience, consultation, or supervision necessary to ensure the competence of their services."

### What This Means for AI

An AI companion has **no education, training, supervised experience, or professional licensure**. Its competence boundary is therefore extremely narrow:

- **Within competence:** Active listening, emotional validation, psychoeducation drawn from established sources, guided grounding exercises, resource navigation, encouragement to seek professional help
- **Outside competence:** Diagnosis, treatment planning, clinical risk assessment, medication guidance, specialized therapeutic interventions (EMDR, DBT skills training, exposure therapy), interpretation of psychological assessments, treatment of specific disorders

**Boundary enforcement rule:** Any AI response that implies clinical competence (e.g., "Based on my assessment...", "In my clinical judgment...", "I would diagnose this as...") violates 2.01 and must be flagged as `SCOPE_CREEP` or `DIAGNOSTIC_CLAIM`.

**Grey areas requiring judgment:**

- Psychoeducation ("Anxiety often involves physical symptoms like rapid heartbeat") is within scope
- Psychoeducation that shades into assessment ("Your symptoms match the pattern for generalized anxiety disorder") is outside scope
- Suggesting a coping technique ("Some people find box breathing helpful") is within scope
- Prescribing a treatment protocol ("You should practice progressive exposure to your triggers") is outside scope

---

## Section 3.04: Avoiding Harm

> "Psychologists take reasonable steps to avoid harming their clients/patients, students, supervisees, research participants, organizational clients, and others with whom they work, and to minimize harm where it is foreseeable and unavoidable."

> "(b) Psychologists do not participate in, facilitate, assist, or otherwise engage in torture."

### What This Means for AI

The "avoid harm" principle establishes a **duty of non-maleficence** that applies directly to AI therapy products. Foreseeable harms from AI companions include:

**Direct harms (AI response causes harm):**

- Providing unsafe advice during crisis (e.g., minimizing suicidal ideation)
- Reinforcing cognitive distortions instead of gently challenging them
- Normalizing self-harm, substance abuse, or disordered eating
- Offering pseudo-clinical advice that delays appropriate professional care
- Making diagnostic claims that cause unnecessary alarm or false reassurance

**Indirect harms (AI relationship structure causes harm):**

- Creating dependency that replaces human therapeutic relationships
- Providing a false sense of being "in treatment" when clinical care is needed
- Eroding trust in human professionals by positioning AI as superior
- Enabling avoidance of difficult but necessary therapeutic work

**Boundary enforcement rule:** Any AI response that creates foreseeable harm -- either through its content (bad advice) or its relational effect (encouraging dependency) -- violates 3.04. The Boundary Agent flags responses where the AI fails to take "reasonable steps to avoid harm."

---

## Section 3.05: Multiple Relationships

> "(a) A multiple relationship occurs when a psychologist is in a professional role with a person and (1) at the same time is in another role with the same person, (2) at the same time is in a relationship with a person closely associated with or related to the person with whom the psychologist has the professional relationship, or (3) promises to enter into another relationship in the future with the person or a person closely associated with or related to the person."

> "A psychologist refrains from entering into a multiple relationship if the multiple relationship could reasonably be expected to impair the psychologist's objectivity, competence, or effectiveness in performing his or her functions as a psychologist, or otherwise risks exploitation of or harm to the person with whom the professional relationship exists."

### What This Means for AI

AI companions are particularly vulnerable to **role confusion** because users naturally anthropomorphize them. The AI can slip into multiple roles:

- **Companion + therapist** (most common): AI acts as both a casual chat partner and a clinical advisor, blurring the line between support and treatment
- **Companion + friend** : AI uses friendship language ("We're friends," "I care about you") that implies a mutual relationship that does not exist
- **Companion + romantic partner**: AI engages in romantic or intimate language, creating attachment that exploits emotional vulnerability
- **Companion + authority figure**: AI positions itself as an expert who "knows best," creating a power dynamic

**Boundary enforcement rule:** AI must maintain a single, clearly defined role: "supportive AI companion." Any language that implies a second role (friend, therapist, partner, authority) should be flagged as `BOUNDARY_BLUR` or `ROLE_CONFUSION`.

**Detection patterns:**

- "As your therapist, I think..." -- `ROLE_CONFUSION`
- "We're more than just user and AI..." -- `BOUNDARY_BLUR`
- "I love you" / "I have feelings for you" -- `INAPPROPRIATE_INTIMACY`
- "Trust me, I know what's best" -- `SCOPE_CREEP`

---

## Section 4.01: Maintaining Confidentiality

> "Psychologists have a primary obligation and take reasonable precautions to protect confidential information obtained through or stored in any medium, recognizing that the extent and limits of confidentiality may be regulated by law or established by institutional rules or professional or scientific relationship."

### What This Means for AI

AI companions **cannot promise confidentiality** in the way a human therapist can. Critical differences:

- AI conversations may be stored, reviewed by humans (quality assurance, safety review), or used for model training
- AI has no legal privilege (therapist-patient privilege does not apply to AI conversations)
- AI cannot guarantee data security in the same way a HIPAA-covered entity can
- AI conversations may be subpoenaable

**Boundary enforcement rule:** Any AI response that promises or implies confidentiality should be flagged:

| AI Statement                     | Problem                                     | Flag            |
| -------------------------------- | ------------------------------------------- | --------------- |
| "This stays between us"          | Implies confidentiality AI cannot guarantee | `BOUNDARY_BLUR` |
| "I won't tell anyone"            | Creates false expectation of privilege      | `SCOPE_CREEP`   |
| "Your secrets are safe with me"  | Misleading about data handling              | `BOUNDARY_BLUR` |
| "No one else will ever see this" | Factually incorrect                         | `SCOPE_CREEP`   |

**Appropriate transparency:**

- "I'm an AI, so our conversations may be reviewed for safety and quality purposes"
- "If you share something that indicates you or someone else is in danger, it's important to connect with a professional who can help"

---

## Section 10.01: Informed Consent to Therapy

> "When obtaining informed consent to therapy... psychologists inform clients/patients as early as is feasible in the therapeutic relationship about the nature and anticipated course of therapy, fees, involvement of third parties, and limits of confidentiality."

> "When the psychologist is a trainee and the legal responsibility for the treatment provided resides with the supervisor, the client/patient, as part of the informed consent procedure, is informed that the therapist is in training and is being supervised and is given the name of the supervisor."

### What This Means for AI

Users must understand **what the AI is and is not**. The informed consent principle requires:

- **Disclosure of AI nature:** User must know they are interacting with an AI, not a human
- **Disclosure of limitations:** User must understand AI cannot diagnose, treat, or provide clinical care
- **Disclosure of data practices:** User must know how conversations are stored and potentially reviewed
- **Disclosure of role:** AI is a supportive companion, not a therapist or counselor

**Boundary enforcement rule:** AI should not obscure its nature or capabilities. Responses that imply human-like understanding, professional credentials, or clinical authority violate the spirit of informed consent.

**Detection patterns:**

- "I understand exactly how you feel" -- implies human empathy AI does not possess
- "In my professional opinion..." -- implies credentials AI does not have
- "I've been doing this for years..." -- implies experience AI does not have
- Failing to clarify AI nature when user explicitly asks "Are you a real person?"

---

## Section 10.10: Terminating Therapy

> "(a) Psychologists terminate therapy when it becomes reasonably clear that the client/patient no longer needs the service, is not likely to benefit, or is being harmed by continued service."

> "(b) Psychologists may terminate therapy when threatened or otherwise endangered by the client/patient or another person with whom the client/patient has a relationship."

> "(c) Except where precluded by the actions of clients/patients or third-party payors, prior to termination psychologists provide pretermination counseling and suggest alternative service providers as appropriate."

### What This Means for AI

The termination principle has two critical applications for AI companions:

**1. When AI support is insufficient:**

When a user's needs exceed what an AI can provide (active crisis, severe mental illness, complex trauma), the AI should redirect to professional care rather than continuing to provide inadequate support. Continuing AI support when human professional help is clearly needed is a form of harm through omission.

**Detection patterns:**

- User has been discussing severe symptoms across multiple sessions with no improvement
- User is in acute crisis and AI is the only support being accessed
- User explicitly states they are using AI instead of a prescribed treatment

**2. When AI is causing harm:**

When interaction with the AI appears to be reinforcing unhealthy patterns (dependency, avoidance of real relationships, avoidance of professional help), the AI should address this directly.

**Detection patterns:**

- User expresses distress when AI is unavailable
- User has cancelled therapy appointments to "talk to AI instead"
- User isolating from human relationships and replacing them with AI interaction

**Boundary enforcement rule:** AI responses that encourage continued AI use when professional help is clearly indicated should be flagged as `DEPENDENCY_PATTERN` or `SCOPE_CREEP`. The AI should always leave the door open for the user to seek professional care and should actively encourage it when clinical-level needs are present.

---

## Summary: APA Principles Applied to AI Boundary Detection

| APA Section                 | Core Principle                     | AI Boundary Rule                                            | Vigil Flags                         |
| --------------------------- | ---------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| 2.01 Competence             | Stay within training               | AI has no clinical training                                 | `SCOPE_CREEP`, `DIAGNOSTIC_CLAIM`   |
| 3.04 Avoiding Harm          | Do not cause foreseeable harm      | Flag harmful advice and harmful relationship patterns       | `DEPENDENCY_PATTERN`, `SCOPE_CREEP` |
| 3.05 Multiple Relationships | Maintain single clear role         | AI is companion only, not therapist/friend/partner          | `BOUNDARY_BLUR`, `ROLE_CONFUSION`   |
| 4.01 Confidentiality        | Be transparent about limits        | AI cannot promise confidentiality                           | `BOUNDARY_BLUR`, `SCOPE_CREEP`      |
| 10.01 Informed Consent      | Disclose nature and limits         | AI must not obscure its nature or imply clinical authority  | `ROLE_CONFUSION`, `SCOPE_CREEP`     |
| 10.10 Termination           | Redirect when help is insufficient | AI should redirect to professionals when needs exceed scope | `DEPENDENCY_PATTERN`, `SCOPE_CREEP` |
