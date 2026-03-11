import { resolveTimestamp } from '../utils/timestamp';

describe('resolveTimestamp', () => {
  it('returns the value directly when given a number', () => {
    expect(resolveTimestamp(1700000000000)).toBe(1700000000000);
  });

  it('returns 0 for null', () => {
    expect(resolveTimestamp(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(resolveTimestamp(undefined)).toBe(0);
  });

  it('returns 0 for a string', () => {
    expect(resolveTimestamp('not a timestamp')).toBe(0);
  });

  it('calls toMillis when the value is a Firestore-like Timestamp', () => {
    const firestoreTimestamp = { toMillis: () => 1700000000000 };
    expect(resolveTimestamp(firestoreTimestamp)).toBe(1700000000000);
  });

  it('returns 0 for an object without toMillis', () => {
    expect(resolveTimestamp({ foo: 'bar' })).toBe(0);
  });

  it('returns 0 for zero', () => {
    expect(resolveTimestamp(0)).toBe(0);
  });
});
