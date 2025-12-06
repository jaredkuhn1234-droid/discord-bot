import { getAutomodConfig, setAutomodConfig } from '../src/automod';

describe('Automod System', () => {
  describe('getAutomodConfig', () => {
    it('should return default config for unknown guild', () => {
      const config = getAutomodConfig('test-guild-123');
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('spamThreshold');
      expect(config).toHaveProperty('capsThreshold');
      expect(config).toHaveProperty('linkFilter');
      expect(config).toHaveProperty('badWords');
    });

    it('should return default values', () => {
      const config = getAutomodConfig('test-guild-123');
      expect(config.enabled).toBe(true);
      expect(config.spamThreshold).toBe(5);
      expect(config.capsThreshold).toBe(70);
      expect(config.linkFilter).toBe(false);
      expect(config.badWords).toEqual([]);
    });
  });

  describe('setAutomodConfig', () => {
    it('should update guild config', () => {
      const guildId = 'test-guild-456';
      setAutomodConfig(guildId, { spamThreshold: 10 });
      const config = getAutomodConfig(guildId);
      expect(config.spamThreshold).toBe(10);
    });

    it('should merge with existing config', () => {
      const guildId = 'test-guild-789';
      setAutomodConfig(guildId, { spamThreshold: 8 });
      setAutomodConfig(guildId, { capsThreshold: 80 });
      const config = getAutomodConfig(guildId);
      expect(config.spamThreshold).toBe(8);
      expect(config.capsThreshold).toBe(80);
    });

    it('should enable/disable automod', () => {
      const guildId = 'test-guild-disabled';
      setAutomodConfig(guildId, { enabled: false });
      const config = getAutomodConfig(guildId);
      expect(config.enabled).toBe(false);
    });
  });
});
