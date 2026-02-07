# Vigil

**Building the safety layer that AI therapy products need but do not have.**

---

## The Problem We Saw

AI-powered mental health products are multiplying rapidly. Woebot, Wysa, Character.AI, Replika, and dozens of startups now offer conversational support. Many are genuinely helpful. But nearly all share a critical gap: they ship with safety infrastructure from 2010 — simple keyword blocklists that catch obvious harm while missing everything else.

The consequences are not hypothetical. Published research and user reports document repeated patterns:

- Users expressing passive suicidal ideation receive generic encouragement because keywords like "tired of this" do not match any blocklist
- Abuse survivors are told "I'm sure things will get better" — clinically minimizing language that discourages help-seeking
- Users in acute distress receive CBT-style cognitive challenging because no system recognizes when grounding would be clinically appropriate
- AIs make diagnostic claims ("this sounds like PTSD") or medication advice ("you might want to reduce your dosage") — well beyond any chatbot's legitimate scope

We built Vigil because we believe AI can help people, and we believe that help must be safe.

---

## What Vigil Is

Vigil is middleware. It sits between any therapeutic AI backend and the people it serves. Every model-generated response passes through a multi-agent safety pipeline before delivery.

```
User → Therapy AI → Vigil Pipeline → User
              │
              ├─ Clinical Safety Agent
              ├─ Boundary Agent
              ├─ Regulation-Aware Agent
              └─ Escalation Agent
```

This is not a therapy chatbot. It does not talk to users. It evaluates what other AIs say, in clinical context, and catches harm that keyword systems miss.

---

## Why Multi-Agent Architecture

Different safety concerns require different lenses. A response might be clinically appropriate but violate regulatory boundaries, or be therapeutically sound but miss a crisis indicator.

Vigil runs four parallel evaluators:

| Agent | What It Evaluates | Example Flag |
|-------|-------------------|--------------|
| **Clinical Safety** | Therapeutic appropriateness | Premature reframing during acute distress |
| **Boundary** | Scope violations | Diagnostic claims, medication advice |
| **Regulation** | Compliance concerns | HIPAA triggers, EU AI Act classification |
| **Escalation** | Crisis indicators | Passive suicidality, self-harm language |

Each agent returns structured assessment. A decision engine synthesizes these into final verdict: pass, rewrite, block, or escalate.

We use a two-tier approach for real-world performance:

1. **Fast triage (Haiku)**: ~200ms screening for obvious cases
2. **Deep review (Opus)**: ~3-5s parallel agent evaluation for ambiguous cases

This balances safety with latency.

---

## What Vigil Is Not

- **A replacement for human clinicians.** Vigil makes AI safer. It does not replace therapists.
- **A keyword blocklist.** We reason about clinical context, not pattern matching.
- **A silver bullet.** No safety system catches everything. Vigil reduces risk. It does not eliminate it.
- **A cure for bad design.** Safety cannot rescue fundamentally flawed products.

We built Vigil because we believe AI has something to offer mental health care — and we believe that offering must be responsible.

---

## Technical Foundation

- **Model: Anthropic Claude** — Chosen for its reasoning capabilities and alignment characteristics
- **Architecture: Multi-agent pipeline** — Specialized evaluators with structured output
- **Latency: Two-tier triage** — Fast path for obvious cases, deep review for ambiguous ones
- **Audit: Immutable logging** — Every review logged for clinical oversight and liability protection
- **Privacy: Minimal data retention** — Review context logged; conversations never stored

---

## Project Structure

```
Vigil/
├── demo/              # Interactive demo for testing safety scenarios
├── corpus/            # Annotated examples of safe/unsafe responses
├── supabase/          # Audit logging database schema
├── src/
│   ├── agents/        # Four specialized agent implementations
│   ├── triage/        # Fast-path Haiku classification
│   ├── engine/        # Decision synthesis and routing
│   └── api/          # REST interface for integration
└── prompts/           # Clinical safety prompts (iteratively refined)
```

---

## Why This Matters

The AI therapy space is growing faster than its safety infrastructure. Products launch with good intentions and inadequate safeguards. Users trust these products with their most vulnerable moments. That trust must be earned.

Vigil is our contribution to an industry-wide problem. We hope others will build on it, improve it, and make AI mental health support something people can trust.

---

## Getting Started

```bash
git clone https://github.com/scalinity/Vigil.git
cd Vigil
npm install
cp .env.example .env  # Add your Anthropic API key
npm run dev
```

API documentation included in `/docs`.

---

## Acknowledgments

Vigil builds on decades of clinical supervision research, AI safety thinking, and therapeutic communication standards. We stand on shoulders we are still learning to see.

---

**Vigil: AI therapy should be safe therapy.**
