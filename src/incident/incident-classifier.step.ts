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
  description: "Classifies incident priority and category",
  subscribes: ["incident-created"],
  emits: ["incident-classified"],
  flows: ["incident-flow"],
  input: inputSchema,
};

export const handler: Handlers["IncidentClassifier"] = async (input, ctx) => {
  const { incidentId, title, description, source } = input;
  const { logger, emit, state } = ctx;

  const text = `${title} ${description ?? ""}`.toLowerCase();

  //
  // PRIORITY CLASSIFICATION
  //
  let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW";

  if (text.includes("down") || text.includes("outage")) {
    priority = "HIGH";
  } else if (text.includes("slow") || text.includes("latency")) {
    priority = "MEDIUM";
  }

  if (source === "monitoring" && priority !== "LOW") {
    priority = "HIGH";
  }

  //
  // CATEGORY ROUTING
  //
  let category: "INFRA" | "APP" | "SECURITY" | "GENERAL" = "GENERAL";

  if (
    text.includes("server") ||
    text.includes("cpu") ||
    text.includes("disk") ||
    text.includes("memory")
  ) {
    category = "INFRA";
  } else if (
    text.includes("api") ||
    text.includes("service") ||
    text.includes("deploy")
  ) {
    category = "APP";
  } else if (
    text.includes("breach") ||
    text.includes("attack") ||
    text.includes("unauthorized") ||
    text.includes("security")
  ) {
    category = "SECURITY";
  }

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
    category,
    classifiedAt: time,
    timeline: [
      ...timeline,
      { event: "CLASSIFIED", priority, category, at: time },
    ],
  });

  logger.info("Incident classified", {
    incidentId,
    priority,
    category,
  });

  await emit({
    topic: "incident-classified",
    data: {
      incidentId,
      priority,
    },
  });
};