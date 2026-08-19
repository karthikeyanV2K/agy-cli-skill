/**
 * Phase enum representing the 9 mandatory phases in the AGY engineering framework
 * Order: DISCOVERY → RESEARCH → ANALYSIS → PLANNING → IMPLEMENTATION → VALIDATION → DEBUGGING → REVIEW → COMPLETE
 */
export enum Phase {
  DISCOVERY = 'DISCOVERY',
  RESEARCH = 'RESEARCH',
  ANALYSIS = 'ANALYSIS',
  PLANNING = 'PLANNING',
  IMPLEMENTATION = 'IMPLEMENTATION',
  VALIDATION = 'VALIDATION',
  DEBUGGING = 'DEBUGGING',
  REVIEW = 'REVIEW',
  COMPLETE = 'COMPLETE',
}

/**
 * PhaseTransition type defining a valid or invalid transition between phases
 */
export interface PhaseTransition {
  from: Phase;
  to: Phase;
  allowed: boolean;
}

/**
 * TRANSITION_MAP defines all valid phase transitions including rejection transitions
 * Forward transitions follow the mandatory sequence
 * Rejection transitions allow moving back to earlier phases when gates fail
 */
export const TRANSITION_MAP: PhaseTransition[] = [
  // Forward transitions (mandatory sequence)
  { from: Phase.DISCOVERY, to: Phase.RESEARCH, allowed: true },
  { from: Phase.RESEARCH, to: Phase.ANALYSIS, allowed: true },
  { from: Phase.ANALYSIS, to: Phase.PLANNING, allowed: true },
  { from: Phase.PLANNING, to: Phase.IMPLEMENTATION, allowed: true },
  { from: Phase.IMPLEMENTATION, to: Phase.VALIDATION, allowed: true },
  { from: Phase.VALIDATION, to: Phase.DEBUGGING, allowed: true },
  { from: Phase.DEBUGGING, to: Phase.REVIEW, allowed: true },
  { from: Phase.REVIEW, to: Phase.COMPLETE, allowed: true },

  // Rejection transitions (gate failures force backward movement)
  { from: Phase.RESEARCH, to: Phase.RESEARCH, allowed: true },      // Research gate rejection → stay in RESEARCH
  { from: Phase.ANALYSIS, to: Phase.RESEARCH, allowed: true },      // Analysis gate rejection → back to RESEARCH
  { from: Phase.PLANNING, to: Phase.RESEARCH, allowed: true },      // Architecture gate rejection → back to RESEARCH
  { from: Phase.IMPLEMENTATION, to: Phase.PLANNING, allowed: true }, // Implementation gate rejection → back to PLANNING
  { from: Phase.VALIDATION, to: Phase.DEBUGGING, allowed: true },   // Validation gate rejection → DEBUGGING
  { from: Phase.REVIEW, to: Phase.IMPLEMENTATION, allowed: true },  // Review gate rejection → back to IMPLEMENTATION

  // Explicitly forbidden transitions (all other combinations)
  // DISCOVERY cannot go backwards
  // RESEARCH cannot skip to ANALYSIS without passing gate
  // ANALYSIS cannot skip to PLANNING without passing gate
  // PLANNING cannot skip to IMPLEMENTATION without Architecture Gate = APPROVED
  // IMPLEMENTATION cannot skip to VALIDATION without passing gate
  // VALIDATION cannot skip to REVIEW without passing gate
  // DEBUGGING cannot skip to REVIEW without passing gate
  // REVIEW cannot skip to COMPLETE without passing gate
  // COMPLETE is terminal - no transitions out
];

/**
 * Phase order for validation (index represents progression)
 */
const PHASE_ORDER: Phase[] = [
  Phase.DISCOVERY,
  Phase.RESEARCH,
  Phase.ANALYSIS,
  Phase.PLANNING,
  Phase.IMPLEMENTATION,
  Phase.VALIDATION,
  Phase.DEBUGGING,
  Phase.REVIEW,
  Phase.COMPLETE,
];

/**
 * Check if a transition from one phase to another is allowed
 * @param from - Source phase
 * @param to - Target phase
 * @returns true if transition is allowed, false otherwise
 */
export function canTransition(from: Phase, to: Phase): boolean {
  // Same phase is always allowed (idempotent)
  if (from === to) {
    return true;
  }

  // Check explicit transition map
  const transition = TRANSITION_MAP.find(t => t.from === from && t.to === to);
  if (transition) {
    return transition.allowed;
  }

  // No explicit rule found - deny by default
  return false;
}

/**
 * Get the index of a phase in the mandatory sequence
 * @param phase - Phase to get index for
 * @returns Index in PHASE_ORDER, or -1 if not found
 */
export function getPhaseIndex(phase: Phase): number {
  return PHASE_ORDER.indexOf(phase);
}

/**
 * Check if a phase transition represents forward progress
 * @param from - Source phase
 * @param to - Target phase
 * @returns true if moving forward in sequence
 */
export function isForwardTransition(from: Phase, to: Phase): boolean {
  const fromIndex = getPhaseIndex(from);
  const toIndex = getPhaseIndex(to);
  return toIndex > fromIndex;
}

/**
 * Check if a phase transition represents a rejection (backward movement)
 * @param from - Source phase
 * @param to - Target phase
 * @returns true if moving backward in sequence
 */
export function isRejectionTransition(from: Phase, to: Phase): boolean {
  const fromIndex = getPhaseIndex(from);
  const toIndex = getPhaseIndex(to);
  return toIndex < fromIndex;
}

/**
 * Get all valid next phases from a given phase
 * @param from - Current phase
 * @returns Array of phases that can be transitioned to
 */
export function getValidNextPhases(from: Phase): Phase[] {
  return TRANSITION_MAP
    .filter(t => t.from === from && t.allowed)
    .map(t => t.to);
}

/**
 * Get the rejection target for a phase (where to go on gate failure)
 * @param from - Current phase
 * @returns Target phase for rejection, or null if no rejection defined
 */
export function getRejectionTarget(from: Phase): Phase | null {
  const rejection = TRANSITION_MAP.find(
    t => t.from === from && t.allowed && isRejectionTransition(t.from, t.to)
  );
  return rejection ? rejection.to : null;
}