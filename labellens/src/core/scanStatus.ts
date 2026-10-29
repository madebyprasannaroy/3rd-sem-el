// Scan status state machine: defines which status changes are legal so a scan cannot skip or reverse steps.
export type ScanStatus = "uploaded" | "processing" | "needs_review" | "reviewed" | "completed" | "failed";

// Allowed transitions. 'failed' can be retried by moving back to 'processing'; 'completed' is final.
const TRANSITIONS: Record<ScanStatus, readonly ScanStatus[]> = {
  uploaded: ["processing"],
  processing: ["needs_review", "failed"],
  needs_review: ["reviewed", "processing"],
  reviewed: ["completed", "needs_review"],
  completed: [],
  failed: ["processing"],
};

// Returns true if moving from one status to another is allowed.
export function canTransition(from: ScanStatus, to: ScanStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// Throws a clear error when a transition is illegal; used by server routes before updating the database.
export function assertTransition(from: ScanStatus, to: ScanStatus): void {
  if (!canTransition(from, to)) throw new Error(`Illegal scan status change: ${from} -> ${to}`);
}
