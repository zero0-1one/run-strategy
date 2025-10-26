import { Waiting } from './waiting';

/**
 * 基于 key 的异步函数排队执行器
 * 相同 key 的函数会排队执行，不同 key 的函数可以并行执行
 * 单个函数的异常不会影响其他函数的执行
 */
export class QueueExecutor {
  private queues = new Map<string, Array<{ waiting: Waiting<unknown>; fn: () => Promise<unknown> }>>();

  /**
   * 执行异步函数
   * @param key 队列标识
   * @param fn 要执行的异步函数
   * @returns Promise<T>
   */
  public async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const waiting = new Waiting<T>();

    // 获取或创建队列
    if (!this.queues.has(key)) {
      this.queues.set(key, []);
    }
    const queue = this.queues.get(key)!;

    // 将任务添加到队列
    queue.push({ waiting, fn });

    // 如果队列只有一个任务（刚添加的），说明没有正在执行的任务，开始执行
    if (queue.length === 1) {
      void this.processQueue(key);
    }

    return waiting;
  }

  /**
   * 处理指定 key 的队列
   */
  private async processQueue(key: string): Promise<void> {
    const queue = this.queues.get(key);
    if (!queue || queue.length === 0) {
      return;
    }

    while (queue.length > 0) {
      const { waiting, fn } = queue[0];
      try {
        const result = await fn();
        waiting.resolve(result);
      } catch (error) {
        waiting.reject(error as Error);
      }
      queue.shift();
    }
    this.queues.delete(key);
  }

  /** 获取指定 key 的所有任务(执行中和等待中)*/
  public getTasks(key: string): Array<Promise<unknown>> {
    return this.queues.get(key)?.map(({ waiting }) => waiting.asPromise()) ?? [];
  }

  /** 获取所有任务(执行中和等待中)*/
  public allTasks(): Array<Promise<unknown>> {
    const waitingTasks = this.queues.values().flatMap((queue) => queue.map(({ waiting }) => waiting.asPromise()));
    return [...waitingTasks];
  }

  /**
   * 获取指定 key 的队列长度
   */
  public getQueueLength(key: string): number {
    const queue = this.queues.get(key);
    return queue ? queue.length : 0;
  }

  /**
   * 检查指定 key 是否有正在执行的任务
   */
  public isRunning(key: string): boolean {
    const queue = this.queues.get(key);
    return queue ? queue.length > 0 : false;
  }
}
