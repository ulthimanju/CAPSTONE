---
name: gemini-prompt-engineering
description: Write, review, or refine the wording and structure of prompts intended for Google Gemini models. Use this skill whenever the user asks to write a prompt "for Gemini," optimize a prompt to work better on Gemini, port a prompt written for Claude/GPT over to Gemini, or debug why a Gemini prompt is producing weak/rambly/off-format output. Trigger even for partial requests like "how do I prompt Gemini for X" or "make this prompt work better on Gemini." This is about prompt text and technique only — not API code, SDKs, or how to call Gemini programmatically. Do not use for general prompt-engineering questions with no Gemini-specific angle — for those, just answer directly.
---

# Gemini Prompt Engineering

Helps write prompts that are idiomatic for Gemini specifically, not just generically "AI-shaped." Gemini responds differently than Claude or GPT to the same phrasing — it's more literal, defaults to heavier formatting and conversational preambles, and benefits from explicit scaffolding that other models pick up on implicitly. This skill is about the wording and structure of the prompt itself — not the API, SDKs, or code to call Gemini.

## Core techniques to apply

**Be literal and concrete, not vibes-based.** Gemini follows the surface of an instruction closely — a strength for compliance, a weakness if the instruction is vague. Prefer checkable constraints over adjectives.
- Weak: "Keep it concise."
- Strong: "Respond in 3 bullet points, each under 15 words."

**State the output format explicitly, every time.** Don't assume Gemini will infer the shape you want — it defaults to fairly heavy markdown (headers, bold, bullets) and conversational framing unless told otherwise.
- If you want plain prose: say "respond in plain prose, no markdown."
- If you want no preamble/closing remarks: say "respond with only the answer — no opener like 'Sure, here's...' and no closing offer to help further."

**Resolve conflicting instructions yourself.** If a prompt asks for both "thorough" and "short," Gemini won't reliably pick a priority — decide the tradeoff in the prompt rather than leaving it ambiguous.

**Use explicit step-by-step scaffolding for reasoning tasks.** More than some other models, Gemini benefits from being told to reason first and answer last, with a clear marker separating the two:
> "First think through the problem step by step. Then, on a new line starting with `Final Answer:`, give only the final answer."
This also makes the answer easy to extract if the prompt is used programmatically later.

**Structure few-shot examples as a dialogue, not a wall of text.** Instead of pasting several examples concatenated into one paragraph, format them as a clear sequence of input → output pairs (e.g., numbered, or as "Example 1 / Example 2" blocks). Gemini tracks example structure like this more reliably than an inlined dump.

**Put persistent instructions up front and keep them separate from the task.** Persona, tone, constraints, and rules that should hold for the whole task read best as a distinct block before the actual request — e.g., under a heading like "Instructions" or "Role" — rather than woven into the middle of the ask.

**For long or multi-part context, restate the actual question at the end.** If a prompt includes a lot of background material (a document, a long history, several examples) before the task, repeat a short version of the actual question again immediately before you expect the answer. This measurably reduces cases where Gemini answers a slightly different question than the one intended, or drops a constraint stated only at the top.

**Label and delimit multiple pieces of content clearly.** If a prompt includes more than one document, image description, or example, mark boundaries explicitly (e.g., `=== Document A ===`) rather than letting them run together — this helps Gemini keep track of which content it's referencing.

**Say explicitly when NOT to do something, if the wrong behavior is plausible.** Gemini can be eager — e.g., over-explaining, adding caveats, or volunteering extra content the user didn't ask for. If a specific over-eager behavior is a known risk for the task, name it and forbid it directly rather than assuming restraint will follow from a positive instruction alone.

## Porting a prompt from Claude or GPT

When adapting an existing prompt written for another model, check for and adjust:
- **Persona/role framing** — move it to its own clearly labeled block at the top if it was previously threaded through the middle of the prompt.
- **XML-tag-heavy structure** — Claude prompts often lean on XML tags (`<context>`, `<instructions>`) for structure. Gemini doesn't have the same trained affinity for XML tags; convert to Markdown headers or clearly labeled plain-text sections instead.
- **Implicit format assumptions** — if the original prompt relied on the model inferring a format (common with GPT), make the format explicit for Gemini.
- **Preamble suppression** — add an explicit "no preamble" instruction if the original prompt didn't need one but the output is being parsed downstream.

When you port a prompt, briefly call out what you changed and why, rather than silently rewriting it.

## Output format

Show the finished prompt as a single fenced text/markdown block, ready to paste wherever the user is running it. Keep any explanation of your choices brief and outside the block, not as inline comments cluttering the prompt itself — unless the user asks for annotations.
