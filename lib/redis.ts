const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\\/+$/, "");
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export async function redisCommand<T>(...command: Array<string | number>): Promise<T> {
  if (!redisUrl || !redisToken) {
    throw new Error("RATE_LIMIT_STORE_NOT_CONFIGURED");
  }

  const response = await fetch(`${redisUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command.map(String)]),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error("RATE_LIMIT_STORE_UNAVAILABLE");
  }

  const payload = (await response.json()) as Array<{ result?: T; error?: string }>;
  if (!Array.isArray(payload) || payload.length === 0 || payload[0]?.error) {
    throw new Error("RATE_LIMIT_STORE_UNAVAILABLE");
  }

  return payload[0].result as T;
}

const incrementScript =
  "local current = redis.call('INCR', KEYS[1]); " +
  "if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; " +
  "return current";

const consumeOtpScript =
  "local current = redis.call('GET', KEYS[1]); " +
  "if not current then return 0 end; " +
  "if current == ARGV[1] then redis.call('DEL', KEYS[1]); return 1 end; " +
  "return 0";

/**
 * Atomically verifies and consumes an OTP digest.
 * A separate GET followed by DEL would let concurrent requests reuse the same code.
 */
export async function consumeOtpDigest(key: string, digest: string): Promise<boolean> {
  const result = await redisCommand<number>(
    "EVAL",
    consumeOtpScript,
    "1",
    key,
    digest,
  );
  return Number(result) === 1;
}

export async function incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
  const count = await redisCommand<number>(
    "EVAL",
    incrementScript,
    "1",
    key,
    String(windowSeconds),
  );
  return Number(count);
}
