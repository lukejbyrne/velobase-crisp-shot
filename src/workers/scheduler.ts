import type { JobsOptions, Queue } from "bullmq";
import type { Logger } from "pino";
import type { SchedulerContribution } from "./types";

type DataQueue<T> = Queue<T, unknown, string, T, unknown, string>;

interface RepeatableSchedulerOptions<T> {
  id: string;
  queue: Queue<T>;
  jobName: string;
  data: T;
  options: JobsOptions;
  logger: Logger;
  readyMessage: string;
}

export function defineRepeatableScheduler<T>({
  id,
  queue,
  jobName,
  data,
  options,
  logger,
  readyMessage,
}: RepeatableSchedulerOptions<T>): SchedulerContribution {
  return {
    id,
    queue: queue as Queue,
    async register() {
      const typedQueue = queue as DataQueue<T>;
      await typedQueue.add(jobName, data, options);
      logger.info(readyMessage);
    },
    async remove() {
      const repeatableJobs = await queue.getRepeatableJobs();
      const jobId = options.jobId;
      const removed: string[] = [];

      for (const job of repeatableJobs) {
        if (job.id !== jobId && job.name !== jobName) continue;

        await queue.removeRepeatableByKey(job.key);
        removed.push(job.key);
      }

      if (removed.length > 0) {
        logger.info(
          { scheduler: id, queue: queue.name, removed },
          "Removed disabled repeatable scheduler jobs",
        );
      }
    },
  };
}
