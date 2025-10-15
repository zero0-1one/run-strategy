import ms from 'ms';
import { setTimeout } from 'timers/promises';

/**
 * 重试策略
 */
export type RetryStrategy = {
  /** 重试次数, 默认无限重试 */
  maxRetries?: number;
  /** 重试间隔, 默认 1s */
  interval?: ms.StringValue;
  /** 重试间隔递增倍数, 默认 1（不递增） */
  intervalMultiplier?: number;
  /** 最大重试间隔, 默认不限制 */
  maxInterval?: ms.StringValue;
};

export async function retry<T>(
  fn: () => Promise<[true, T] | [false, unknown]>,
  strategy: RetryStrategy = {},
  onFailed?: (error: unknown, retryCount: number) => void | Promise<void>,
): Promise<T> {
  const { maxRetries = Infinity, interval = '1s', intervalMultiplier = 1, maxInterval } = strategy;
  let intervalMs = ms(interval);
  const maxIntervalMs = maxInterval ? ms(maxInterval) : Infinity;
  for (let i = 0; i < maxRetries; i++) {
    const fail = async (error: unknown) => {
      await onFailed?.(error, i);
      if (i < maxRetries - 1) await setTimeout(intervalMs);
      intervalMs = Math.min(intervalMs * intervalMultiplier, maxIntervalMs);
    };
    try {
      const [valid, result] = await fn();
      if (valid) {
        return result;
      }
      await fail(result);
    } catch (error) {
      await fail(error);
    }
  }
  throw new Error('retry failed');
}

export async function retryOnlyError<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy = {},
  onFailed?: (error: unknown, retryCount: number) => void | Promise<void>,
): Promise<T> {
  return retry(async () => [true, await fn()], strategy, onFailed);
}
