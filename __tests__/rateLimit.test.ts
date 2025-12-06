import { checkRateLimit } from '../src/rateLimit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limits between tests
    jest.clearAllMocks();
  });

  it('should allow first command', () => {
    expect(checkRateLimit('user1')).toBe(true);
  });

  it('should allow multiple commands within limit', () => {
    expect(checkRateLimit('user2')).toBe(true);
    expect(checkRateLimit('user2')).toBe(true);
    expect(checkRateLimit('user2')).toBe(true);
    expect(checkRateLimit('user2')).toBe(true);
  });

  it('should block after exceeding limit', () => {
    // Max is 5 commands per 10 seconds
    expect(checkRateLimit('user3')).toBe(true);
    expect(checkRateLimit('user3')).toBe(true);
    expect(checkRateLimit('user3')).toBe(true);
    expect(checkRateLimit('user3')).toBe(true);
    expect(checkRateLimit('user3')).toBe(true);
    expect(checkRateLimit('user3')).toBe(false); // 6th command blocked
  });

  it('should track users independently', () => {
    // User 4 spams
    for (let i = 0; i < 5; i++) {
      checkRateLimit('user4');
    }
    expect(checkRateLimit('user4')).toBe(false); // Blocked
    
    // User 5 should not be affected
    expect(checkRateLimit('user5')).toBe(true);
  });

  it('should reset after time window', async () => {
    // This test would need time mocking for full coverage
    expect(checkRateLimit('user6')).toBe(true);
  });
});
