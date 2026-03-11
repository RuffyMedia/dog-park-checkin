/**
 * Safely extracts a millisecond timestamp from a value that may be
 * a plain number or a Firestore Timestamp object.
 *
 * Returns 0 when the value cannot be resolved.
 */
export const resolveTimestamp = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
};
