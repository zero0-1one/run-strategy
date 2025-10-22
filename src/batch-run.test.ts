import { BatchRun } from './batch-run';

describe('BatchRun', () => {
  describe('map', () => {
    it('当参数数量小于最大并发数时应该执行所有任务', async () => {
      const args = [1, 2, 3];
      const fn = jest.fn().mockImplementation((arg: number) => Promise.resolve(arg * 2));

      const result = await BatchRun.map(args, fn, 5);

      expect(result).toEqual([2, 4, 6]);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('当参数数量等于最大并发数时应该执行所有任务', async () => {
      const args = [1, 2, 3];
      const fn = jest.fn().mockImplementation((arg: number) => Promise.resolve(arg * 2));

      const result = await BatchRun.map(args, fn, 3);

      expect(result).toEqual([2, 4, 6]);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('当参数数量超过最大并发数时应该限制并发执行', async () => {
      const args = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const fn = jest.fn().mockImplementation((arg: number) => Promise.resolve(arg * 2));

      const result = await BatchRun.map(args, fn, 3);

      expect(result).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
      expect(fn).toHaveBeenCalledTimes(10);
    });

    it('应该处理空参数数组', async () => {
      const args: number[] = [];
      const fn = jest.fn().mockImplementation((arg: number) => Promise.resolve(arg * 2));

      const result = await BatchRun.map(args, fn, 3);

      expect(result).toEqual([]);
      expect(fn).not.toHaveBeenCalled();
    });

    it('应该处理混合成功和失败的场景', async () => {
      const args = [1, 2, 3, 4, 5];
      const fn = jest.fn().mockImplementation((arg: number) => {
        if (arg === 3) {
          throw new Error('Task failed');
        }
        return Promise.resolve(arg * 2);
      });

      await expect(BatchRun.map(args, fn, 2)).rejects.toThrow('Task failed');
      expect(fn.mock.calls.length).toBeLessThan(5);
    });

    it('不同的执行时间也应该保持结果顺序', async () => {
      const args = Array.from({ length: 20 }, (_, i) => i);
      // 正在执行的任务数
      let executing = 0;

      const fn = jest.fn().mockImplementation(async (arg: number) => {
        executing++;
        expect(executing).toBeLessThanOrEqual(3);
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));
        executing--;
        return arg * 2;
      });

      const result = await BatchRun.map(args, fn, 3);
      expect(result).toEqual(Array.from({ length: 20 }, (_, i) => i * 2));
      expect(fn).toHaveBeenCalledTimes(20);
    });

    it('应该处理最大并发数为1的情况（串行执行）', async () => {
      const args = [1, 2, 3, 4, 5];
      const fn = jest.fn().mockImplementation(async (arg: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return arg * 2;
      });

      const startTime = Date.now();
      const result = await BatchRun.map(args, fn, 1);
      const endTime = Date.now();

      expect(result).toEqual([2, 4, 6, 8, 10]);
      expect(fn).toHaveBeenCalledTimes(5);
      expect(endTime - startTime).toBeGreaterThanOrEqual(50);
    });
  });

  describe('run', () => {
    it('简单验证，内部调用的 map', async () => {
      const tasks = Array.from({ length: 1000 }, (_, i) => () => Promise.resolve(i));
      const result = await BatchRun.run(tasks);
      expect(result).toEqual(Array.from({ length: 1000 }, (_, i) => i));
    });
  });
});
