import { formatDistanceToNow } from "date-fns";

export type SummaryInputs = {
  name?: string;
  country?: string;
  grade?: string;
  status?: "Exploring" | "Shortlisting" | "Applying" | "Submitted";
  tags?: string[];
  lastActive?: Date;
  lastCommunicationAt?: Date;
  interactions?: { type: "login" | "ai_question" | "doc_upload"; timestamp?: Date }[];
};

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function buildSummary(i: SummaryInputs) {
  const first = (i.name ?? "The student").split(" ")[0];
  const stage = i.status ?? "Exploring";
  const intentHints: string[] = [];
  const tagHints: string[] = [];

  if (i.tags?.includes("Essay")) tagHints.push("needs essay support");
  if (i.tags?.includes("Scholarship")) tagHints.push("is tracking scholarships");
  if (i.tags?.includes("STEM")) tagHints.push("has STEM leaning");
  if (i.tags?.includes("SAT")) tagHints.push("is preparing for SAT");
  if (i.tags?.includes("TOEFL")) tagHints.push("is preparing for TOEFL");

  const lastSeen = i.lastActive
    ? formatDistanceToNow(i.lastActive, { addSuffix: true })
    : "recently";
  const lastContact = i.lastCommunicationAt
    ? formatDistanceToNow(i.lastCommunicationAt, { addSuffix: true })
    : "unknown";

  const recentAIQs =
    i.interactions?.filter((x) => x.type === "ai_question").length ?? 0;
  if (recentAIQs >= 2) intentHints.push("is actively exploring via AI Q&A");

  const bodies = [
    `${first} is in the **${stage}** stage and last active ${lastSeen}. Latest advisor contact was ${lastContact}.`,
    tagHints.length ? `${first} ${tagHints.join(", ")}.` : "",
    intentHints.length ? `${first} ${intentHints.join(", ")}.` : "",
    i.country ? `Based in ${i.country}${i.grade ? `, grade ${i.grade}` : ""}.` : i.grade ? `Currently in grade ${i.grade}.` : "",
    stage === "Applying"
      ? "Focus next on locking recommenders and finalizing the activity list."
      : stage === "Shortlisting"
      ? "Focus next on narrowing to 3–4 target programs and checking deadlines."
      : stage === "Submitted"
      ? "Next steps: interview prep and scholarship follow-ups."
      : "Encourage deeper exploration and a first draft college list.",
  ]
    .filter(Boolean)
    .map((s) => (s!.endsWith(".") ? s : s + "."));

  const openers = [
    `Here’s a quick read on ${first}:`,
    `Snapshot on ${first}:`,
    `Brief on ${first}:`,
  ];

  return `${pick(openers)}\n\n${bodies.join(" ")}`;
}
