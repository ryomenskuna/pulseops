import type { StepConfig, Handlers } from "motia";

export const config: StepConfig = {
  name: "IncidentEscalationChecker",
  type: "cron",
  cron: "*/10 * * * * *",
  description: "Escalates overdue HIGH priority incidents",
  flows: ["incident-flow"],
  emits: []
};

export const handler: Handlers["IncidentEscalationChecker"] = async (ctx) => {
  const { state, logger } = ctx;

  const pending = await state.get("escalation", "pendingIds");
  const ids = Array.isArray(pending) ? pending : [];

  const now = Date.now();
  const stillPending: string[] = [];

  for (const incidentId of ids) {
    const raw = await state.get("incidents", incidentId);
    const incident = typeof raw === "object" && raw !== null ? raw as any : {};

    // skipping if status already escalated or resolved
    if (incident.status !== "ASSIGNED") continue;

    const assignedAtMs = new Date(incident.assignedAt).getTime();
    const secondsSinceAssigned = (now - assignedAtMs) / 1000;

    if (secondsSinceAssigned >= 10) {
      const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
      const escalatedAt = new Date().toISOString();

      await state.set("incidents", incidentId, {
        ...incident,
        status: "ESCALATED",
        escalatedAt,
        timeline: [
          ...timeline,
          { event: "ESCALATED", at: escalatedAt }
        ]
      });

      logger.info("Incident escalated", { incidentId });

    } else {
      stillPending.push(incidentId);
    }
  }

  // update pending list
  await state.set("escalation", "pendingIds", stillPending);
};