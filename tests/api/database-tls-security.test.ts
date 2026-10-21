import {
  getDatabaseSslConfig,
  getDatabasePoolConfig,
  sanitizeDatabaseError,
} from '../../src/lib/database';

describe('Database TLS & Security Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('TLS Enforcement (getDatabaseSslConfig & getDatabasePoolConfig)', () => {
    it('1. In production, enforces strict TLS certificate verification ({ rejectUnauthorized: true })', () => {
      const config = getDatabaseSslConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://user:pass@ep-neon.tech/neondb',
      });

      expect(config).toEqual({ rejectUnauthorized: true });
      expect((config as any).rejectUnauthorized).toBe(true);
    });

    it('2. NEVER returns { rejectUnauthorized: false } under any configuration', () => {
      const prodConfig = getDatabaseSslConfig({ NODE_ENV: 'production' });
      const devConfig = getDatabaseSslConfig({ NODE_ENV: 'development' });
      const testConfig = getDatabaseSslConfig({ NODE_ENV: 'test' });
      const emptyConfig = getDatabaseSslConfig({});

      expect(prodConfig).not.toEqual({ rejectUnauthorized: false });
      expect(devConfig).not.toEqual({ rejectUnauthorized: false });
      expect(testConfig).not.toEqual({ rejectUnauthorized: false });
      expect(emptyConfig).not.toEqual({ rejectUnauthorized: false });
    });

    it('3. In non-production with sslmode=require, enables strict TLS verification', () => {
      const config = getDatabaseSslConfig({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://user:pass@ep-neon.tech/neondb?sslmode=require',
      });

      expect(config).toEqual({ rejectUnauthorized: true });
    });

    it('4. In non-production without SSL parameters, disables SSL', () => {
      const config = getDatabaseSslConfig({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://user:pass@localhost:5432/testdb',
      });

      expect(config).toBe(false);
    });

    it('5. getDatabasePoolConfig correctly binds connection string and production SSL', () => {
      const poolConfig = getDatabasePoolConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgres://neon_user:p4ssw0rd@ep-quiet-forest-b571toev.us-east-2.aws.neon.tech/neondb',
      });

      expect(poolConfig.connectionString).toBe(
        'postgres://neon_user:p4ssw0rd@ep-quiet-forest-b571toev.us-east-2.aws.neon.tech/neondb'
      );
      expect(poolConfig.ssl).toEqual({ rejectUnauthorized: true });
    });
  });

  describe('Database Error & Log Sanitization (sanitizeDatabaseError)', () => {
    it('6. Sanitizes database connection strings containing credentials', () => {
      const rawError = new Error(
        'Connection terminated unexpectedly on postgres://neon_admin:SuperSecretPassword123!@ep-quiet-forest-b571toev.us-east-2.aws.neon.tech:5432/neondb?sslmode=require'
      );

      const sanitized = sanitizeDatabaseError(rawError);
      expect(sanitized).not.toContain('SuperSecretPassword123!');
      expect(sanitized).not.toContain('neon_admin');
      expect(sanitized).toContain('postgres://***:***@ep-quiet-forest-b571toev.us-east-2.aws.neon.tech:5432/neondb?sslmode=require');
    });

    it('7. Redacts password and secret parameters in error messages', () => {
      const rawError = new Error('FATAL: password="secret_db_pass_xyz" authentication failed for user "dante"');
      const sanitized = sanitizeDatabaseError(rawError);

      expect(sanitized).not.toContain('secret_db_pass_xyz');
      expect(sanitized).toContain('password=***');
    });

    it('8. Redacts database password matching process.env.DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://app:mySensitiveSecretKey999@db.neon.tech/db';
      const rawError = new Error('Query error occurred with key mySensitiveSecretKey999 in transaction');

      const sanitized = sanitizeDatabaseError(rawError);
      expect(sanitized).not.toContain('mySensitiveSecretKey999');
      expect(sanitized).toContain('***');
    });

    it('9. Gracefully handles null, undefined, or empty error values', () => {
      expect(sanitizeDatabaseError(null)).toBe('Unknown database error');
      expect(sanitizeDatabaseError(undefined)).toBe('Unknown database error');
      expect(sanitizeDatabaseError('simple text error')).toBe('simple text error');
    });
  });
});
