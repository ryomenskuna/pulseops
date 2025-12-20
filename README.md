PulseOps – Event-Driven Incident Management Backend

## Overview
*PulseOps is a backend system that ingests, classifies, assigns, tracks, and automatically escalates operational incidents through event-driven workflows powered by Motia. Incidents transition through well-defined lifecycle stages and persist timeline history for auditability and debugging.*

*The architecture separates responsibilities using Motia Steps, enabling independent development and scaling of ingestion, classification, assignment, and escalation processes.*

## Problem
*Distributed systems experience outages, slowdowns, and anomalies. Manual triage adds latency and inconsistency to response processes. A backend capable of automated prioritization and routing improves reliability and incident MTTR.*

## Solution
PulseOps automates the operational backend pathway:

- **Ingest incident via API Step** – Accept incident reports through HTTP POST
- **Emit event → classifier evaluates severity & category** – Event-driven classification determines priority and routing category
- **Assignment Step routes to the correct response team** – Assign incidents to appropriate team based on category
- **Timeline state persisted in Motia's state manager** – Track all transitions and changes for auditability
- **CRON Step periodically evaluates unresolved incidents for escalation** – Background job checks for overdue high-priority incidents
- **GET API exposes full state for visual dashboards or CLI tooling** – Query endpoint returns current state and complete timeline history


## Architecture Diagram (Logical Flow)

```
┌─────────────────────┐
│  POST /incident     │
│  (API Step)         │
└──────────┬──────────┘
           │
           ├─→ emit: incident-created
           │
           v
┌─────────────────────────────┐
│ Incident Classifier Step    │
│ (Event Step)                │
│ - Evaluate severity         │
│ - Infer category            │
└──────────┬──────────────────┘
           │
           ├─→ emit: incident-classified
           │
           v
┌─────────────────────────────┐
│ Incident Assignment Step    │
│ (Event Step)                │
│ - Route to team             │
│ - Update state + timeline   │
└──────────┬──────────────────┘
           │
           v
┌─────────────────────────────┐
│ Cron Escalation Step        │
│ (Cron Step – periodic)      │
│ - Check unresolved items    │
│ - Escalate if overdue       │
│ - Modify state + timeline   │
└──────────┬──────────────────┘
           │
           v
┌─────────────────────────────┐
│ GET /incident/:id           │
│ (API Step)                  │
│ - Return full state         │
│ - Return timeline history   │
└─────────────────────────────┘
```


## Key Features

- Stateless ingestion / stateful lifecycle
- Automated priority determination
- Category inference for routing
- Automatic assignment to teams
- Persistent timeline of transitions
- Background escalation for unresolved high-priority incidents
- Query API for consumers
- Fully event-driven backend behaviors

## Motia Usage
PulseOps leverages the following Motia primitives:

- **API Steps** – HTTP endpoints for incident ingestion (`POST /incident`) and state retrieval (`GET /incident/:id`)
- **Event Steps** – Async handlers for incident classification, assignment, and state mutations triggered by emitted events
- **CRON Step** – Periodic background job that evaluates unresolved high-priority incidents for escalation
- **Virtual Steps** – Flow connections documenting the logical chain: ingestion → classification → assignment → escalation → query
- **State Manager** – Persistent in-memory state storage for incident records, timelines, and escalation queues
- **Logger Integration** – Structured logging across all steps for full trace visibility and incident audit trails

*Motia enables strict separation of workflow concerns and avoids tightly coupled imperative logic inside a single handler.*

### Endpoints

**POST /incident**  
Creates a new incident and returns its ID.

**GET /incident/:id**  
Retrieves current lifecycle state and timeline for a given incident.

```typescript
### State Schema

interface IncidentTimeline {
    event: "CREATED" | "CLASSIFIED" | "ASSIGNED" | "ESCALATED" | "RESOLVED";
    timestamp: string;
    details?: Record<string, unknown>;
}

interface Incident {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "critical";
    assignedTeam: string;
    assignedAt: string;
    escalatedAt?: string;
    resolvedAt?: string;
    timeline: IncidentTimeline[];
}

interface PulseOpsState {
    incidents: Record<string, Incident>;
    escalation: {
        pendingIds: string[];
    };
}
```

## Tech Stack
- **Motia Runtime & Types** – TypeScript with Motia's event-driven step execution
- **State Management** – Redis-backed state runtime (memory mode for development)
- **Type Safety** – Auto-generated TypeScript types from step configs
- **Node.js** – JavaScript/TypeScript runtime environment

## Running Locally
- npm install
- motia generate-types
- npm run dev
```bash
# Access Workbench UI
open http://localhost:3000

# Run tests
npm run test

# Build for production
npm run build

# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

## Future Enhancements

- ML inference based classifier
- notification integrations
- persistent external DB state backend
- resolution workflows
- user role systems