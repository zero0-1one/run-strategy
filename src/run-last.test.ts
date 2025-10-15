import { RunLast } from './run-last';

describe('RunLast', () => {
  describe('没有默认超时时间', () => {
    let runLast: RunLast;
    beforeEach(() => {
      runLast = new RunLast();
    });

    test('run 没有传入超时时间', async () => {
      const results = await Promise.all([
        runLast.run(() => Promise.resolve(1)),
        runLast.run(() => Promise.resolve(2)),
        runLast.run(() => Promise.resolve(3)),
      ]);

      expect(results).toEqual([
        {
          state: 'success',
          result: 1,
        },
        {
          state: 'ignore',
        },
        {
          state: 'success',
          result: 3,
        },
      ]);
    });

    test('run 传入超时时间', async () => {
      const results = await Promise.all([
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 1;
        }, 30),
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 70));
          return 2;
        }, 50),
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return 3;
        }, 0),
      ]);

      expect(results).toEqual([
        {
          state: 'timeout',
        },
        {
          state: 'ignore',
        },
        {
          state: 'success',
          result: 3,
        },
      ]);
    });
  });

  describe('有默认超时时间', () => {
    let runLast: RunLast;
    beforeEach(() => {
      runLast = new RunLast(50);
    });

    test('run 没有传入超时时间', async () => {
      const results = await Promise.all([
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 1;
        }),
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 2;
        }),
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 70));
          return 3;
        }),
      ]);

      expect(results).toEqual([
        {
          state: 'success',
          result: 1,
        },
        {
          state: 'ignore',
        },
        {
          state: 'timeout',
        },
      ]);
    });

    test('run 传入超时时间', async () => {
      const results = await Promise.all([
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 1;
        }, 50),
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 2;
        }),
        runLast.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return 3;
        }, 0),
      ]);

      expect(results).toEqual([
        {
          state: 'success',
          result: 1,
        },
        {
          state: 'ignore',
        },
        {
          state: 'success',
          result: 3,
        },
      ]);
    });
  });
});
