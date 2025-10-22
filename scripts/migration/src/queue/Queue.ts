import Bull from "bull";

export abstract class Queue<T> {
    protected readonly queue: Bull.Queue<T>;

    protected constructor(name: string, options: Bull.QueueOptions) {
        this.queue = new Bull(name, options);
    }

    /**
     *
     * @param msg
     * @param level
     */
    protected log(msg: string, level: "log" | "error" | "warn" = "log") {
        console[level](`[${this.queue.name}] ${msg}`);
    }

    /**
     *
     * @param params
     */
    async add(params: T) {
        return this.queue.add(params);
    }

    /**
     *
     */
    async process() {
        this.log(`starting consumer`);
        await this.queue.process(async (job) => {
            this.log(`processing job ${job.id} with data ${JSON.stringify(job.data)}`);
            try {
                await this._process(job);
            } catch (e) {
                this.log(`error processing job ${job.id}: ${e}`, "error");
                throw e;
            }
        });
    }

    abstract _process(job: Bull.Job<T>): Promise<void>;
}
