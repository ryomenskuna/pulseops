import type { EventConfig, Handlers } from 'motia';
import { z } from 'zod';

const inputSchema = z.object({
  incidentId: z.string(),
  createdAt: z.string(),
  title: z.string(),
  description: z.string().optional(),
  source: z.enum(['user', 'monitoring', 'webhook'])
});

export const config: EventConfig = {
  name: 'IncidentCreated',
  type: 'event',
  description: 'Triggered when a new incident is created',
  subscribes: ['incident-created'],
  emits: [],
  flows: ['incident-flow'],
  input: inputSchema
};

export const handler: Handlers['IncidentCreated'] = async (input, ctx) => {
  const { logger } = ctx;

  logger.info('Incident created event received', input);
};