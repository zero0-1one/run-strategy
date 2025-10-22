const DEFAULT_MAX_COUNT = 500;

export class BatchRun {
  /**
   * 批量运行异步任务，限制同时并发数
   * @param tasks 异步任务列表（未执行的方法）
   * @param maxCount 最大并发数, 默认 500
   * @returns 执行结果列表
   */
  public static async run<T>(tasks: Array<() => Promise<T>>, maxCount: number = DEFAULT_MAX_COUNT): Promise<T[]> {
    return BatchRun.map(tasks, (task) => task(), maxCount);
  }

  public static async map<T, U>(
    args: Array<T>,
    fn: (arg: T) => Promise<U>,
    maxCount: number = DEFAULT_MAX_COUNT,
  ): Promise<U[]> {
    if (args.length <= maxCount) {
      return Promise.all(args.map(fn));
    }

    const results = new Array<U>(args.length);
    let nextIndex = 0;
    let isTerminated = false; // 是否中终止， 有一个异常后， 不再执行后续任务
    let firstError: unknown;

    const executeTask = async () => {
      if (isTerminated || nextIndex >= args.length) {
        return;
      }
      const index = nextIndex++;
      try {
        results[index] = await fn(args[index]);
        return executeTask();
      } catch (error) {
        if (!isTerminated) {
          isTerminated = true;
          firstError = error;
        }
      }
    };

    const initialTasks: Promise<void>[] = [];
    for (let i = 0; i < maxCount; i++) {
      initialTasks.push(executeTask());
    }

    await Promise.all(initialTasks);
    // 这里判断 isTerminated 因为 firstError 可能为 undefined
    if (isTerminated) {
      throw firstError;
    }
    return results;
  }
}
