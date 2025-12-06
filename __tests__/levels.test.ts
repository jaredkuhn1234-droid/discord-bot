import { calculateLevel, xpForNextLevel } from '../src/levels';

describe('Levels System', () => {
  describe('calculateLevel', () => {
    it('should calculate correct level for 0 XP', () => {
      expect(calculateLevel(0)).toBe(0);
    });

    it('should calculate correct level for 100 XP', () => {
      expect(calculateLevel(100)).toBe(1);
    });

    it('should calculate correct level for 400 XP', () => {
      expect(calculateLevel(400)).toBe(2);
    });

    it('should calculate correct level for 900 XP', () => {
      expect(calculateLevel(900)).toBe(3);
    });

    it('should calculate correct level for 1600 XP', () => {
      expect(calculateLevel(1600)).toBe(4);
    });

    it('should floor partial levels', () => {
      expect(calculateLevel(250)).toBe(1); // sqrt(2.5) = 1.58... -> floor = 1
    });
  });

  describe('xpForNextLevel', () => {
    it('should calculate XP needed for level 1', () => {
      expect(xpForNextLevel(0)).toBe(100);
    });

    it('should calculate XP needed for level 2', () => {
      expect(xpForNextLevel(1)).toBe(400);
    });

    it('should calculate XP needed for level 3', () => {
      expect(xpForNextLevel(2)).toBe(900);
    });

    it('should calculate XP needed for level 4', () => {
      expect(xpForNextLevel(3)).toBe(1600);
    });

    it('should calculate XP needed for level 10', () => {
      expect(xpForNextLevel(9)).toBe(10000);
    });
  });
});
