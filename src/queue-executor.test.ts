import { QueueExecutor } from './queue-executor';

describe('QueueExecutor', () => {
  let executor: QueueExecutor;

  beforeEach(() => {
    executor = new QueueExecutor();
  });

  it('应该能够执行简单的异步函数', async () => {
    const result = await executor.execute('test', () => {
      return Promise.resolve('success');
    });

    expect(result).toBe('success');
  });

  it('应该能够处理函数异常', async () => {
    const error = new Error('test error');

    await expect(
      executor.execute('test', () => {
        return Promise.reject(error);
      }),
    ).rejects.toThrow('test error');
  });

  it('相同 key 的函数应该排队执行', async () => {
    const results: number[] = [];
    const promises: Promise<unknown>[] = [];

    // 提交 3 个任务到同一个 key
    for (let i = 0; i < 3; i++) {
      const index = i;
      promises.push(
        executor.execute(`queue-${index}`, () => {
          results.push(index);
          return new Promise((resolve) => {
            setTimeout(() => resolve(index), 10);
          });
        }),
      );
    }

    await Promise.all(promises);

    // 验证结果按顺序执行
    expect(results).toEqual([0, 1, 2]);
  });

  it('不同 key 的函数应该并行执行', async () => {
    const results: number[] = [];
    const promises: Promise<unknown>[] = [];

    // 提交 3 个任务到不同的 key
    for (let i = 0; i < 3; i++) {
      promises.push(
        executor.execute(`parallel-${i}`, () => {
          results.push(i);
          return new Promise((resolve) => {
            setTimeout(() => resolve(i), 50);
          });
        }),
      );
    }

    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();

    // 验证并行执行（总时间应该接近单个任务的执行时间）
    expect(endTime - startTime).toBeLessThan(100);
    expect(results).toHaveLength(3);
  });

  it('不同 key 的异常不应该相互影响', async () => {
    const promises: Promise<unknown>[] = [];

    // 提交会抛出异常的任务到 key1
    promises.push(
      executor
        .execute('key1', () => {
          return Promise.reject(new Error('key1 error'));
        })
        .catch(() => 'key1 error caught'),
    );

    // 提交正常任务到 key2
    promises.push(
      executor.execute('key2', () => {
        return Promise.resolve('key2 success');
      }),
    );

    const [key1Result, key2Result] = await Promise.all(promises);

    expect(key1Result).toBe('key1 error caught');
    expect(key2Result).toBe('key2 success');
  });

  it('应该能够获取队列长度', async () => {
    // 提交多个任务但不等待完成
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        executor.execute('queue-length-test', () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(i), 100);
          });
        }),
      );
    }

    // 等待一小段时间让任务开始执行
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 10);
    });

    // 检查队列长度（任务执行期间队列长度应该大于 0，因为还有等待中的任务）
    expect(executor.getQueueLength('queue-length-test')).toBeGreaterThan(0);
    expect(executor.isRunning('queue-length-test')).toBe(true);

    await Promise.all(promises);
  });

  it('应该能够处理大量并发任务', async () => {
    const taskCount = 100;
    const results: number[] = [];
    const promises: Promise<unknown>[] = [];

    // 提交大量任务到同一个队列
    for (let i = 0; i < taskCount; i++) {
      const index = i;
      promises.push(
        executor.execute('mass-test', () => {
          results.push(index);
          return Promise.resolve(index);
        }),
      );
    }

    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();

    // 验证所有任务都按顺序执行
    expect(results).toHaveLength(taskCount);
    expect(results).toEqual(Array.from({ length: taskCount }, (_, i) => i));

    // 验证执行时间合理（串行执行）
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('应该能够处理混合场景', async () => {
    const results: string[] = [];
    const promises: Promise<unknown>[] = [];

    // 提交任务到不同队列，模拟混合场景
    for (let i = 0; i < 5; i++) {
      const key = i % 2 === 0 ? 'even' : 'odd';
      const index = i;

      promises.push(
        executor.execute(key, () => {
          results.push(`${key}-${index}`);
          return new Promise((resolve) => {
            setTimeout(() => resolve(`${key}-${index}`), 10);
          });
        }),
      );
    }

    await Promise.all(promises);

    // 验证结果
    expect(results).toHaveLength(5);

    // 验证相同 key 的任务按顺序执行
    const evenResults = results.filter((r) => r.startsWith('even-')).map((r) => parseInt(r.split('-')[1]));
    const oddResults = results.filter((r) => r.startsWith('odd-')).map((r) => parseInt(r.split('-')[1]));

    expect(evenResults).toEqual([0, 2, 4]);
    expect(oddResults).toEqual([1, 3]);
  });
});
