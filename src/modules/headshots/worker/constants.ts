/**
 * Queue constants shared by the queue definition and the processor.
 *
 * Kept separate from `queue.ts` so the processor can read the retry budget
 * without importing the BullMQ queue — and therefore without opening a Redis
 * connection in unit tests.
 */
export const HEADSHOT_GENERATION_QUEUE_NAME = "headshot-generation";

/** Attempts configured on the queue; the processor uses it to detect its last try. */
export const HEADSHOT_GENERATION_MAX_ATTEMPTS = 3;

export interface HeadshotGenerationJobData {
  type: "generate-image";
  headshotImageId: string;
}
