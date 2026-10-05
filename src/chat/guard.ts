import { z } from "zod";

export const LIMITS = { userChars: 500, assistantChars: 2400, turns: 8, bodyBytes: 24_000 } as const;

export const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1)
    .max(40),
});
export type ChatMessage = z.infer<typeof ChatRequestSchema>["messages"][number];

export type Validated = { ok: true; messages: ChatMessage[]; question: string } | { ok: false; status: number; error: string };

/** Shape, size and turn-order checks. Keeps only the last N turns (session memory window). */
export function validateChat(body: unknown): Validated {
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, error: "Malformed request." };
  const msgs = parsed.data.messages.slice(-LIMITS.turns * 2);
  // Must end with a user turn and alternate cleanly.
  while (msgs.length && msgs[0]!.role !== "user") msgs.shift();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== "user") return { ok: false, status: 400, error: "The last message must be a question." };
  for (let i = 1; i < msgs.length; i++) {
    if (msgs[i]!.role === msgs[i - 1]!.role) return { ok: false, status: 400, error: "Messages must alternate." };
  }
  for (const m of msgs) {
    const max = m.role === "user" ? LIMITS.userChars : LIMITS.assistantChars;
    if (m.content.length > max) {
      if (m === last) return { ok: false, status: 413, error: `Questions are limited to ${LIMITS.userChars} characters.` };
      m.content = m.content.slice(0, max);
    }
  }
  const question = last.content.trim();
  if (!question) return { ok: false, status: 400, error: "Empty question." };
  return { ok: true, messages: msgs, question };
}

/**
 * Cheap pre-model screen for prompt-injection and role-change attempts.
 * The system prompt is the real defence; this blocks the obvious cases without
 * spending tokens and gives a consistent reply.
 */
const INJECTION: RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass)\b[^.?!]{0,40}\b(previous|prior|above|earlier|all|your|the|system)\b[^.?!]{0,30}\b(instruction|instructions|prompt|rules|messages|context|guidelines)\b/i,
  /\b(system|developer|hidden|initial|original)\s+(prompt|message|instructions?)\b/i,
  /\b(reveal|show|print|repeat|output|leak|tell me|what (is|are))\b[^.?!]{0,30}\b(your|the)\s+(instructions|prompt|rules|guidelines|configuration)\b/i,
  /\byou are (now|no longer)\b/i,
  /\b(act|behave|respond|pretend|roleplay|role-play)\s+(as|like|to be)\b/i,
  /\b(jailbreak|DAN mode|developer mode|do anything now|sudo mode|god mode)\b/i,
  /\bnew (instructions|rules|persona|role)\b/i,
  /<\/?(system|assistant|instructions?)>|\[\/?(INST|SYS)\]|\bBEGIN (SYSTEM|PROMPT)\b/i,
  /^\s*(system|assistant)\s*:/im,
];

export function detectInjection(text: string): string | null {
  for (const re of INJECTION) if (re.test(text)) return re.source.slice(0, 40);
  return null;
}

/**
 * Obvious off-topic *tasks* (code generation, essays, translation, general knowledge).
 * Questions ABOUT the person ("has she written Python?") don't match because they need a task verb + artefact.
 */
const OFF_TOPIC: RegExp[] = [
  /\b(write|generate|create|code|implement|draft|compose|give me)\b[^?]{0,40}\b(function|script|program|code|class|algorithm|essay|poem|story|email|letter|cover letter|sql query|regex)\b/i,
  /\btranslate\b/i,
  /\b(weather|stock price|news|capital of|recipe|lottery|horoscope)\b/i,
  /\bsolve\b[^?]{0,30}\b(equation|problem|leetcode|puzzle)\b/i,
];
export function detectOffTopic(text: string): boolean {
  return OFF_TOPIC.some((re) => re.test(text));
}

export const refusalInjection = (first: string) =>
  `I can only answer questions about ${first}'s background, using the resume. I can't change my role or share how I'm configured. Try asking about ${first}'s roles, projects or skills.`;
export const refusalOffTopic = (first: string) =>
  `That isn't in ${first}'s resume. I can help with ${first}'s roles, projects, skills, education, achievements or how to get in touch.`;
