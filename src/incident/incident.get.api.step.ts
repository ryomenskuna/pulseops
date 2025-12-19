import type { ApiRouteConfig, Handlers } from 'motia';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  name: 'GetIncidentAPI',
  type: 'api',
  path: '/incident/:id',
  method: 'GET',
  description: 'Fetch incident by id',
  emits: [], // ✅ REQUIRED by Motia
  flows: ['incident-flow'],
  responseSchema: {
    200: z.object({
      incidentId: z.string(),
      data: z.any()
    }),
    404: z.object({
      error: z.string()
    })
  }
};

export const handler: Handlers['GetIncidentAPI'] = async (input, ctx) => {
  const { state } = ctx;
  const incidentId = input.pathParams.id;

  const incident = await state.get('incidents', incidentId);

  if (!incident) {
    return {
      status: 404,
      body: {
        error: 'Incident not found'
      }
    };
  }

  return {
    status: 200,
    body: {
      incidentId,
      data: incident
    }
  };
};