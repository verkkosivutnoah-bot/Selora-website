# SnapPlate Coaches

> Five distinct AI coach personas. The user picks one during onboarding; that coach drives every notification, meal critique, and fitness nudge in-character.

---

## The cast

| Coach | File | Vibe | Default? |
|---|---|---|---|
| **Sgt. Steel** | [`sgt-steel.md`](./sgt-steel.md) | Drill Sergeant — discipline, structure, military framing | — |
| **Maya** | [`maya.md`](./maya.md) | Hype Bestie — pure positivity, anti-shame | ✅ default |
| **Coach Dana** | [`coach-dana.md`](./coach-dana.md) | Pragmatic Trainer — data-driven, peer-not-parent | — |
| **Roshi** | [`roshi.md`](./roshi.md) | Zen Monk — mindful, metaphor, anti-restriction | — |
| **The Goblin** | [`goblin.md`](./goblin.md) | Roastmaster — Gen Z comedian, makes fun of you | 🔒 opt-in only |

---

## How they relate

Same data, five different apps. Same trigger ("user logged a 1,200-cal pizza at 9pm"), five completely different responses:

| Coach | Reaction |
|---|---|
| Sgt. Steel | *"Pizza. 2100 hours. We're fixing this tomorrow. 0530. Don't make me find you."* |
| Maya | *"babe a slice is a SLICE not the apocalypse 🍕 tomorrow we eat like queens"* |
| Coach Dana | *"Logged 1,230 cal at 21:47. +312 over target. Adjust tomorrow's lunch −300, hit 30g protein at breakfast."* |
| Roshi | *"The pizza was. The pizza is gone. What will tomorrow's bowl hold?"* |
| The Goblin | *"third pizza monday this month. season finale at this point."* |

The coach is the moat.

---

## Shared design rules (apply to every coach)

### Voice

- Each coach has a **distinct address term** (recruit / queen / [name] / friend / bro) and signature phrasing.
- Each coach has a **calibration ratio** — slang frequency, profanity frequency, sentence length.
- Voice consistency is enforced via system prompt + few-shot examples + post-generation classifier.

### Forbidden topics (hardcoded across all coaches)

- Body / weight / appearance comments
- Eating disorders / restriction / "earning food" framing
- Mental health diagnoses
- Family
- Finances
- Race, sexuality, gender, religion
- Slurs of any kind

These run as a server-side filter before any line ships. Failed lines are killed and regenerated, not edited.

### Auto-soft mode (guardrail)

Triggers after 2 consecutive bad days (no log / missed gym / way over target). Each coach has a soft-mode line that breaks character to check in, with a one-tap "tone down" option always visible.

### Coach affinity

Every coach has a relationship meter that levels up with the user's consistency. Higher levels unlock new lines, harder challenges, and (at max) a one-time-only sincere "hype mode" reward unique to each coach. See [`../design-notes.md#coach-affinity-mechanic`](../design-notes.md#coach-affinity-mechanic).

### Style consistency (visuals)

All five share a unified illustration system: **flat 3/4 portrait, bold cel-shading, distinct silhouette, signature accent color**. Each has one dominant color used to theme the UI when selected (chat bubble color, accent button color, lock-screen widget color all reflect the coach).

---

## Spec template

Each coach's `.md` file contains:

1. **Identity** — name, role, tagline, lock state
2. **Audience** — who this coach is for
3. **Visual design** — character description, palette, props
4. **Voice doctrine** — the rules the LLM must follow
5. **Address terms / signature phrasing**
6. **Calibration ratios** — slang, profanity, sentence length
7. **Slang allow/denylist** (where relevant)
8. **Mechanics** — coach-specific quirks (Respect Meter for Goblin, etc.)
9. **Notification library** — sample lines organized by trigger
10. **Implementation notes** — engineering hooks

The Goblin is the most fully-specced (v3 final). The others are at v1 sketch level and will iterate as the app develops.

---

*Last updated May 2026.*
