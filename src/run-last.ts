import { Waiting } from './waiting';

export type RunLastResult<T> =
  | {
      state: 'success';
      result: T;
    }
  | {
      state: 'ignore';
    }
  | {
      state: 'timeout';
    };

type RunWaiting = Waiting<RunLastResult<unknown>>;

/**
 * 只执行最后一个任务， 如果有正在执行中的任务，则等待其完成。
 * 等待过程中如果有新任务提交，则等待中的任务被放弃。
 */
export class RunLast {
  private running: RunWaiting | null = null;

  private last: { waiting: RunWaiting; timeout?: number; fn: () => Promise<unknown> } | null = null;

  public constructor(
    /**
     * 默认执行任务的超时时间， 如果为 0，则不设置超时时间
     */
    private defaultTimeout = 0,
  ) {}

  public async run<T>(fn: () => Promise<T>, timeout?: number): Promise<RunLastResult<T>> {
    if (this.last) {
      this.last.waiting.resolve({ state: 'ignore' });
      this.last = null;
    }
    const waiting = new Waiting<RunLastResult<T>>();
    this.last = { waiting, timeout, fn };
    void this.runLast();
    return waiting.catch((error) => {
      if (waiting.isTimeout) {
        return { state: 'timeout' };
      }
      throw error;
    });
  }

  private async runLast() {
    if (this.running || !this.last) {
      return;
    }
    const { waiting, timeout, fn } = this.last;
    this.last = null;
    this.running = waiting;
    waiting.setTimeout(timeout ?? this.defaultTimeout);
    waiting
      .catch(() => {}) // 这里忽略
      .finally(() => {
        this.running = null;
        void this.runLast();
      });

    try {
      const result = await fn();
      waiting.resolve({ state: 'success', result });
    } catch (error) {
      waiting.reject(error as Error);
    }
  }
}
