import { Waiting } from './waiting';

describe('Waiting', () => {
  test('Waiting: resolve', async () => {
    const waiting = new Waiting<number>();
    setTimeout(() => waiting.resolve(123), 100);
    await expect(waiting).resolves.toBe(123);
  });

  test('Waiting: resolve with timeout', async () => {
    const waiting = new Waiting<number>(200);
    setTimeout(() => waiting.resolve(123), 100);
    await expect(waiting).resolves.toBe(123);
  });

  test('Waiting: reject', async () => {
    const waiting = new Waiting<number>();
    setTimeout(() => waiting.reject(new Error('error')), 100);
    await expect(waiting).rejects.toThrow('error');
    expect(waiting.isTimeout).toBe(false);
  });

  test('Waiting: reject with timeout', async () => {
    const waiting = new Waiting<number>(200);
    setTimeout(() => waiting.reject(new Error('error')), 100);
    await expect(waiting).rejects.toThrow('error');
    expect(waiting.isTimeout).toBe(false);
  });

  test('Waiting: timeout', async () => {
    const waiting = new Waiting<number>(50);
    setTimeout(() => waiting.resolve(123), 100);
    await expect(waiting).rejects.toThrow('waiting timeout');
    expect(waiting.isTimeout).toBe(true);
  });

  test('Waiting: setTimeout method - timeout', async () => {
    const waiting = new Waiting<number>();
    waiting.setTimeout(50);
    setTimeout(() => waiting.resolve(123), 100);
    await expect(waiting).rejects.toThrow('waiting timeout');
    expect(waiting.isTimeout).toBe(true);
  });

  test('Waiting: setTimeout method - reset timer', async () => {
    const waiting = new Waiting<number>();
    waiting.setTimeout(50);
    setTimeout(() => waiting.setTimeout(100), 30);
    setTimeout(() => waiting.resolve(123), 70);
    await expect(waiting).resolves.toBe(123);
    expect(waiting.isTimeout).toBe(false);
  });

  test('Waiting: setTimeout should throw when not pending', () => {
    const waiting = new Waiting<number>();
    waiting.resolve(1);
    expect(() => waiting.setTimeout(10)).toThrow('waiting is not pending');
  });

  test('Waiting: setTimeout method - reject before timeout', async () => {
    const waiting = new Waiting<number>();
    waiting.setTimeout(100);
    setTimeout(() => waiting.reject(new Error('error')), 50);
    await expect(waiting).rejects.toThrow('error');
    expect(waiting.isTimeout).toBe(false);
  });

  test('Waiting: call', async () => {
    const waiting = Waiting.call(() => Promise.resolve(123));
    await expect(waiting).resolves.toBe(123);
  });

  test('Waiting: call with timeout', async () => {
    const waiting = Waiting.call(() => new Promise((resolve) => setTimeout(resolve, 100)), 50);
    await expect(waiting).rejects.toThrow('waiting timeout');
  });
});
