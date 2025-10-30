export class AsyncLock {
    private _locked: boolean;
    private _waitingResolvers: Array<(...args: any[]) => void>;

    constructor(config?: { lock?: boolean}) {

        const {
            lock = false
        } = config || {};

        this._locked = lock;
        this._waitingResolvers = [];
    }

    async wait() {
        if (this._locked) {
            // 如果被锁，则等待锁释放
            await new Promise(resolve => {
                this._waitingResolvers.push(resolve);
            });
        }
    }

    async acquire() {
        if (!this._locked) {
            // 如果没有被锁，直接锁上并返回
            this._locked = true;
            return;
        }

        // 否则等待前一个锁释放
        await new Promise(resolve => {
            this._waitingResolvers.push(resolve);
        });

        // 被唤醒后自动加锁
        this._locked = true;
    }

    release() {
        if (!this._locked) {
            throw new Error("Cannot release an unlocked lock");
        }

        if (this._waitingResolvers.length > 0) {
            // 唤醒下一个等待者
            const nextResolve = this._waitingResolvers.shift();
            if (nextResolve) {
                nextResolve();
            }
        } else {
            // 无等待者，释放锁
            this._locked = false;
        }
    }

    releaseAll() {
        if (!this._locked) {
            throw new Error("Cannot releaseAll an unlocked lock");
        }

        this._locked = false;
        this._waitingResolvers.forEach((resolve) => resolve());
        this._waitingResolvers = [];
    }
}