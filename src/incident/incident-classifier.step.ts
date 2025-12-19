import type { EventConfig, Handlers } from "motia";
import { z } from "zod";

const inputSchema = z.object({
  incidentId: z.string(),
  createdAt: z.string(),
  title: z.string(),
  description: z.string().optional(),
  source: z.enum(["user", "monitoring", "webhook"]),
});

export const config: EventConfig = {
  name: "IncidentClassifier",
  type: "event",
  description: "Classifies incident priority",
  subscribes: ["incident-created"],
  emits: ["incident-classified"],
  flows: ["incident-flow"],
  input: inputSchema,
};

export const handler: Handlers["IncidentClassifier"] = async (input, ctx) => {
  const { incidentId, title, description, source } = input;
  const { logger, emit, state } = ctx;

  const text = `${title} ${description ?? ""}`.toLowerCase();

  let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW";

  if (text.includes("down") || text.includes("outage")) {
    priority = "HIGH";
  } else if (text.includes("slow") || text.includes("latency")) {
    priority = "MEDIUM";
  }

  if (source === "monitoring" && priority !== "LOW") {
    priority = "HIGH";
  }

  logger.info("Incident classified", { incidentId, priority });

  const prevState = await state.get("incidents", incidentId);
  const prev =
    typeof prevState === "object" && prevState !== null ? prevState : {};

  const timeline = Array.isArray((prev as any).timeline)
    ? (prev as any).timeline
    : [];

  const time = new Date().toISOString();

  await state.set("incidents", incidentId, {
    ...prev,
    status: "CLASSIFIED",
    priority,
    classifiedAt: time,
    timeline: [...timeline, { event: "CLASSIFIED", priority, at: time }],
  });

  await emit({
    topic: "incident-classified",
    data: {
      incidentId,
      priority,
    },
  });
};
