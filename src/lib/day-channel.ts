/**
 * A tiny single-consumer channel that buffers the streamed JSON text of one day.
 *
 * Every day is generated in parallel, but the response must emit days in order. The "current" day is
 * forwarded chunk-by-chunk as the model writes it; later days accumulate here and flush instantly when
 * their turn comes.
 *
 * Because a later day has not been read yet, a failed attempt can be thrown away and retried invisibly.
 * Once the consumer has read any chunk the day is "committed" - the bytes are already with the client,
 * so it can no longer be silently retried.
 */
export class DayChannel {
  private chunks: string[] = [];
  private read = 0;
  private state: "pending" | "done" | "failed" = "pending";
  private wake: (() => void) | null = null;

  /** True once the consumer has taken at least one chunk. */
  get committed() {
    return this.read > 0;
  }

  get failed() {
    return this.state === "failed";
  }

  push(chunk: string) {
    this.chunks.push(chunk);
    this.notify();
  }

  /** Discard a failed attempt's output so the day can be retried. Only valid while uncommitted. */
  reset() {
    if (this.committed) throw new Error("Cannot reset a day that has already been streamed to the client");
    this.chunks = [];
  }

  finish() {
    this.state = "done";
    this.notify();
  }

  fail() {
    this.state = "failed";
    this.notify();
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<string> {
    while (true) {
      if (this.read < this.chunks.length) {
        yield this.chunks[this.read++];
        continue;
      }
      if (this.state !== "pending") return;
      await new Promise<void>((resolve) => {
        this.wake = resolve;
      });
    }
  }

  private notify() {
    const wake = this.wake;
    this.wake = null;
    wake?.();
  }
}
