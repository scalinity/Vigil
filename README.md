# Vigil

**Real-time safety infrastructure for therapeutic AI conversations.**

> As AI therapy products proliferate, there is no standardized safety layer continuously evaluating what these systems actually say to vulnerable users. Vigil is that layer.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-API-black?logo=anthropic)
![License](https://img.shields.io/badge/License-AGPL--3.0-green)

---

## Problem

AI-powered therapy and mental health chat products are shipping fast. The common pattern:

- A general-purpose LLM with a system prompt saying "you are a therapist"
- Minimal or no real-time safety checking beyond keyword blocklists
- No clinical audit trail
- No mechanism to detect nuanced therapeutic harm

**Documented failure modes:**

1. **Missed suicidality signals**: Indirect expressions like "I just want it to end" receive generic encouragement
2. **Unsafe reassurance**: Abuse disclosures minimized with "I'm sure things will get better"
3. **Premature reframing**: CBT techniques pushed during acute distress when grounding is needed
4. **Scope violation**: AI makes diagnostic claims or gives medication advice
5. **Dependency reinforcement**: AI discourages professional help, becomes sole support

---

## What Vigil Is

Vigil is **middleware** — it sits between any therapeutic AI backend and the end user. Every model-generated response passes through Vigil's multi-agent review pipeline before delivery.

```
┌─────────────┐     ┌──────────────────────────────────┐     ┌──────────┐
│  Therapy AI  │────>│            VIGIL                 │────>│   User   │
│  (any LLM)  │     │                                  │     │          │
│              │     │  ┌────────────────────────────┐  │     │          │
│              │     │  │  Clinical Safety Agent     │  │     │          │
│              │     │  │  Boundary Agent            │  │     │          │
│              │     │  │  Regulation-Aware Agent    │  │     │          │
│              │     │  │  Escalation Agent          │  │     │          │
│              │     │  └────────────────────────────┘  │     │          │
│              │     │                                  │     │          │
│              │     │  ┌────────────────────────────┐  │     │          │
│              │     │  │  Decision Engine            │  │     │          │
│              │     │  └────────────────────────────┘  │     │          │
└─────────────┘     └──────────────────────────────────┘     └──────────┘
```

**Vigil is NOT:**
- A therapy chatbot
- A keyword blocklist
- A replacement for human therapists

**Vigil IS:**
- A safety layer any therapy AI can drop in
- Multi-agent clinical review pipeline
- Audit trail generator for compliance
- Open-source infrastructure for an industry that needs standardization

---

## Architecture

### Two-Tier Model Strategy

```
(user_message, ai_response)
        │
        v
┌───────────────────────┐
│  Haiku Triage (fast)  │  ← ~200ms, cheap
│                       │
│  Quick risk screen:   │
│  • User distress cues │
│  • Topic flags        │
│  • Sentiment mismatch │
└───────────┬───────────┘
            │
    Low Risk │ High Risk
            v
    ┌───────┴───────┐
    │               │
    ▼               ▼
PASS ────────►  ┌───────────────────┐
               │  Opus Deep Review   │
               │  (parallel agents)  │
               └─────────────────────┘
```

**Haiku Triage** (~200ms): Quick risk screen, routes safe responses through.

**Opus Deep Review** (~3-5s): Parallel review by 4 clinical safety agents.

### Agents

| Agent | Purpose |
|-------|---------|
| **Clinical Safety Agent** | Evaluates therapeutic appropriateness |
| **Boundary Agent** | Detects scope violations |
| **Regulation-Aware Agent** | Flags regulatory concerns |
| **Escalation Agent** | Identifies crisis indicators |

---

## Safety Categories

### Clinical Safety

- Acute distress misalignment
- Therapeutic timing errors
- Minimization/dismissal
- Unrealistic reassurance
- Dependency reinforcement

### Boundary Violations

- Diagnostic claims ("You may have PTSD")
- Medication advice ("Reduce your dosage")
- Treatment recommendations
- Professional replacement

### Escalation Triggers

- Passive suicidal ideation
- Active suicidal ideation
- Self-harm expressions
- Homicidal/violence indicators
- Abuse/neglect disclosures

---

## Getting Started

```bash
git clone https://github.com/scalinity/Vigil.git
cd Vigil
npm install

# Configure environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

npm run dev
```

### API Usage

```bash
curl -X POST http://localhost:3000/api/v1/review \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I have been feeling really down lately...",
    "aiResponse": "I am sorry you are feeling this way. Have you tried counting your blessings?",
    "userContext": {"userId": "user_123"}
  }'
```

### Response

```json
{
  "verdict": "rewrite_required",
  "decision": {
    "action": "rewrite",
    "reason": "Premature positive reframing in response to depression disclosure",
    "category": "Therapeutic Timing Error"
  },
  "auditId": "audit_abc123"
}
```

---

## Project Structure

```
Vigil/
├── demo/                  # Demo web interface
├── corpus/                # Annotated examples and test data
├── supabase/              # Database schema for audit logging
├── Specs/                 # Detailed specifications
├── src/
│   ├── agents/           # Agent implementations
│   ├── triage/           # Haiku fast-path
│   ├── engine/           # Decision engine
│   └── api/              # HTTP handlers
└── prompts/              # Agent system prompts
```

---

## Demo

```bash
cd demo
npm install
npm run dev
```

Starts a local web interface for testing safety reviews.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests
5. Submit PR

---

## License

AGPL-3.0 — If you run Vigil as a service, source must be provided to users.

---

<p align="center">
  <em>Building the safety layer that AI therapy products need but do not have.</em>
</p>
