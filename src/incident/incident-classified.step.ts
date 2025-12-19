import type { EventConfig, Handlers } from "motia";
import { z } from "zod";

const inputSchema = z.object({
  incidentId: z.string(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

export const config: EventConfig = {
  name: "IncidentClassified",
  type: "event",
  description: "Assigns ownership based on category and priority",
  subscribes: ["incident-classified"],
  emits: [],
  flows: ["incident-flow"],
  input: inputSchema,
};

export const handler: Handlers["IncidentClassified"] = async (input, ctx) => {
  const { incidentId, priority } = input;
  const { logger, state } = ctx;

  const prevState = await state.get("incidents", incidentId);
  const prev =
    typeof prevState === "object" && prevState !== null ? prevState : {};

  const category =
    typeof prevState === "object" &&
    prevState !== null &&
    "category" in prevState
      ? (prevState as any).category
      : "GENERAL";

  //
  // TEAM ROUTING
  //
  let assignedTeam = "L1-SUPPORT";

  if (category === "INFRA") {
    assignedTeam = "INFRA-OPS";
  } else if (category === "APP") {
    assignedTeam = "APP-DEV";
  } else if (category === "SECURITY") {
    assignedTeam = "SECURITY-OPS";
  }

  if (priority === "HIGH") {
    assignedTeam = "ON-CALL-SRE";
  }

  const timeline = Array.isArray((prev as any).timeline)
    ? (prev as any).timeline
    : [];

  const time = new Date().toISOString();

  await state.set("incidents", incidentId, {
    ...prev,
    status: "ASSIGNED",
    priority,
    category,
    assignedTeam,
    assignedAt: time,
    timeline: [
      ...timeline,
      { event: "ASSIGNED", team: assignedTeam, category, at: time },
    ],
  });

  if (priority === "HIGH") {
    const pending = await state.get("escalation", "pendingIds");
    const arr = Array.isArray(pending) ? pending : [];
    await state.set("escalation", "pendingIds", [...arr, incidentId]);
  }

  logger.info("Incident assigned", {
    incidentId,
    priority,
    category,
    assignedTeam,
  });
};