import type { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  source: z.enum(["user", "monitoring", "webhook"]),
});

export const config: ApiRouteConfig = {
  name: "IncidentAPI",
  type: "api",
  path: "/incident",
  method: "POST",
  description: "Creates an incident and emits event",
  emits: ["incident-created"],
  flows: ["incident-flow"],
  responseSchema: {
    200: z.object({
      status: z.string(),
    }),
    400: z.object({
      error: z.string(),
    }),
  },
};

export const handler: Handlers["IncidentAPI"] = async (input, ctx) => {
  const { emit, logger, state } = ctx;

  // ✅ Validate request body manually (Motia way)
  const parsed = bodySchema.safeParse(input.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid request body",
      },
    };
  }

  const { title, description, source } = parsed.data;

  const incidentId = Math.random().toString(36).substring(2);
  const createdAt = new Date().toISOString();

  logger.info("Incident API called", {
    incidentId,
    title,
    source,
  });

  // Initialize incident state
  await state.set("incidents", incidentId, {
    status: "CREATED",
    title,
    description,
    source,
    createdAt,
    timeline: [
      {
        event: "CREATED",
        at: createdAt,
      },
    ],
  });

  await emit({
    topic: "incident-created",
    data: {
      incidentId,
      createdAt,
      title,
      description,
      source,
    },
  });

  return {
    status: 200,
    body: {
      status: "processing",
      incidentId,
    },
  };
};
