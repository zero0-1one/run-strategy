import { retry } from './retry';
import ms from 'ms';
import { setTimeout } from 'timers/promises';

// Mock timers
jest.mock('timers/promises', () => ({
  setTimeout: jest.fn(),
}));

describe('retry', () => {
  const mockSetTimeout = jest.mocked(setTimeout);

  beforeEach(() => {
    jest.clearAllMocks();
    (mockSetTimeout as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('基本功能测试', () => {
    it('应该成功执行一次成功的函数', async () => {
      const fn = jest.fn().mockResolvedValue([true, 'success']);

      const result = await retry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('应该在第一次失败后重试并最终成功', async () => {
      const fn = jest.fn().mockResolvedValueOnce([false, 'first failure']).mockResolvedValue([true, 'success']);

      const result = await retry(fn, { maxRetries: 2 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(ms('1s'));
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fails'));

      await expect(retry(fn, { maxRetries: 3 })).rejects.toThrow('retry failed');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe('重试策略测试', () => {
    it('应该使用自定义重试间隔', async () => {
      const fn = jest.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValue([true, 'success']);

      await retry(fn, { interval: '2s', maxRetries: 2 });

      expect(mockSetTimeout).toHaveBeenCalledWith(ms('2s'));
    });

    it('应该应用间隔递增倍数', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(
        retry(fn, {
          maxRetries: 4,
          interval: '1s',
          intervalMultiplier: 2,
        }),
      ).rejects.toThrow('retry failed');

      expect(mockSetTimeout).toHaveBeenNthCalledWith(1, ms('1s'));
      expect(mockSetTimeout).toHaveBeenNthCalledWith(2, ms('2s'));
      expect(mockSetTimeout).toHaveBeenNthCalledWith(3, ms('4s'));
    });

    it('应该限制最大重试间隔', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(
        retry(fn, {
          maxRetries: 5,
          interval: '1s',
          intervalMultiplier: 2,
          maxInterval: '3s',
        }),
      ).rejects.toThrow('retry failed');

      expect(mockSetTimeout).toHaveBeenNthCalledWith(1, ms('1s'));
      expect(mockSetTimeout).toHaveBeenNthCalledWith(2, ms('2s'));
      expect(mockSetTimeout).toHaveBeenNthCalledWith(3, ms('3s')); // 限制在 3s
      expect(mockSetTimeout).toHaveBeenNthCalledWith(4, ms('3s')); // 限制在 3s
    });

    it('应该有限重试直到成功', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('failure 1'))
        .mockRejectedValueOnce(new Error('failure 2'))
        .mockResolvedValue([true, 'success']);

      const result = await retry(fn, { maxRetries: 5 }); // 设置有限重试次数

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe('错误处理测试', () => {
    it('应该调用 onError 回调函数', async () => {
      const fn = jest.fn().mockRejectedValueOnce(new Error('test error')).mockResolvedValue('success');

      const onError = jest.fn();

      await retry(fn, { maxRetries: 2 }, onError);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error), 0);
    });

    it('应该在多次重试时正确传递重试次数', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      const onError = jest.fn();

      await expect(retry(fn, { maxRetries: 3 }, onError)).rejects.toThrow('retry failed');

      expect(onError).toHaveBeenCalledTimes(3);
      expect(onError).toHaveBeenNthCalledWith(1, expect.any(Error), 0);
      expect(onError).toHaveBeenNthCalledWith(2, expect.any(Error), 1);
      expect(onError).toHaveBeenNthCalledWith(3, expect.any(Error), 2);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理 maxRetries 为 0 的情况', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(retry(fn, { maxRetries: 0 })).rejects.toThrow('retry failed');
      expect(fn).toHaveBeenCalledTimes(0);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it('应该处理 intervalMultiplier 为 1 的情况', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(
        retry(fn, {
          maxRetries: 4,
          interval: '1s',
          intervalMultiplier: 1,
        }),
      ).rejects.toThrow('retry failed');

      expect(mockSetTimeout).toHaveBeenNthCalledWith(1, ms('1s'));
      expect(mockSetTimeout).toHaveBeenNthCalledWith(2, ms('1s'));
      expect(mockSetTimeout).toHaveBeenNthCalledWith(3, ms('1s'));
    });

    it('应该处理 intervalMultiplier 小于 1 的情况', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(
        retry(fn, {
          maxRetries: 4,
          interval: '10s',
          intervalMultiplier: 0.5,
        }),
      ).rejects.toThrow('retry failed');

      expect(mockSetTimeout).toHaveBeenNthCalledWith(1, ms('10s'));
      expect(mockSetTimeout).toHaveBeenNthCalledWith(2, ms('5s'));
      expect(mockSetTimeout).toHaveBeenNthCalledWith(3, ms('2.5s'));
    });

    it('应该处理 maxInterval 小于初始 interval 的情况', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));

      await expect(
        retry(fn, {
          maxRetries: 4,
          interval: '10s',
          intervalMultiplier: 2,
          maxInterval: '5s',
        }),
      ).rejects.toThrow('retry failed');

      expect(mockSetTimeout).toHaveBeenNthCalledWith(1, ms('10s')); // 第一次使用原始间隔
      expect(mockSetTimeout).toHaveBeenNthCalledWith(2, ms('5s')); // 第二次被限制在 5s
      expect(mockSetTimeout).toHaveBeenNthCalledWith(3, ms('5s')); // 第三次被限制在 5s
    });
  });

  describe('默认参数测试', () => {
    it('应该使用默认参数', async () => {
      const fn = jest.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValue('success');

      await retry(fn);

      expect(mockSetTimeout).toHaveBeenCalledWith(ms('1s'));
    });

    it('应该使用默认的无限重试策略', async () => {
      const fn = jest
        .fn()
        .mockResolvedValueOnce([false, 'failure 1'])
        .mockRejectedValueOnce(new Error('failure 2'))
        .mockResolvedValue([true, 'success']);

      const result = await retry(fn, { maxRetries: 10 }); // 设置一个合理的重试次数

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(mockSetTimeout).toHaveBeenCalledTimes(2);
    });
  });

  describe('复杂场景测试', () => {
    it('应该处理异步函数中的复杂错误', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new TypeError('type error'))
        .mockRejectedValueOnce(new ReferenceError('reference error'))
        .mockResolvedValue([true, 'success']);

      const onError = jest.fn();

      const result = await retry(fn, { maxRetries: 3 }, onError);

      expect(result).toBe('success');
      expect(onError).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenNthCalledWith(1, expect.any(TypeError), 0);
      expect(onError).toHaveBeenNthCalledWith(2, expect.any(ReferenceError), 1);
    });

    it('应该处理返回 Promise 的复杂函数', async () => {
      const complexFn = jest
        .fn()
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => global.setTimeout(resolve, 10));
          throw new Error('async failure');
        })
        .mockResolvedValue([true, 'async success']);

      const result = await retry(complexFn, { maxRetries: 2 });

      expect(result).toBe('async success');
      expect(complexFn).toHaveBeenCalledTimes(2);
    });
  });
});
