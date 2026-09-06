process.env.WEB_URL ??= "http://localhost:5173";
process.env.API_URL ??= "http://localhost:4000";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.REDIS_HOST ??= "localhost";
process.env.ETHEREAL_HOST ??= "smtp.ethereal.email";
process.env.JWT_SECRET ??= "test-jwt-secret-please-ignore";
process.env.COOKIE_SECRET ??= "test-cookie-secret-please-ignore";
process.env.SLACK_TOKEN_ENCRYPTION_KEY ??= "0".repeat(64);
