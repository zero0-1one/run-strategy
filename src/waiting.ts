/**
 * 扩展 Promise， 是 Waiting 具备 Promise 的特性
 */
export class Waiting<T = void> {
  private promise: Promise<T>;
  public resolve!: (value: T) => void;
  public reject!: (reason: Error) => void;
  public setTimeout!: (timeout: number) => void;
  private timeout?: ReturnType<typeof setTimeout>;
  private _state: 'pending' | 'resolved' | 'rejected' | 'timeout' = 'pending';

  public static call<T>(fn: () => Promise<T>, timeout?: number): Waiting<T> {
    const waiting = new Waiting<T>(timeout);
    void fn().then(waiting.resolve).catch(waiting.reject);
    return waiting;
  }

  public constructor(timeout?: number) {
    const clearTimer = () => {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = undefined;
      }
    };

    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = (arg) => {
        clearTimer();
        if (this._state === 'pending') {
          this._state = 'resolved';
          resolve(arg);
        }
      };

      this.reject = (error) => {
        clearTimer();
        if (this._state === 'pending') {
          this._state = 'rejected';
          reject(error);
        }
      };

      this.setTimeout = (timeout?: number) => {
        if (this._state !== 'pending') {
          throw new Error('waiting is not pending');
        }
        clearTimer();
        if (timeout && timeout > 0) {
          this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this._state = 'timeout';
            reject(new Error('waiting timeout'));
          }, timeout);
        }
      };

      if (timeout && timeout > 0) {
        this.setTimeout(timeout);
      }
    });
  }

  public get isTimeout() {
    return this._state === 'timeout';
  }

  public get state() {
    return this._state;
  }

  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  public catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this.promise.catch(onrejected);
  }

  public finally(onfinally?: (() => void) | null): Promise<T> {
    return this.promise.finally(onfinally);
  }
}
