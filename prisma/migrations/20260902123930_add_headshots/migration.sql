-- CreateEnum
CREATE TYPE "HeadshotBatchStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "HeadshotImageStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HeadshotCreditState" AS ENUM ('NONE', 'FROZEN', 'CONSUMED', 'UNFROZEN');

-- CreateTable
CREATE TABLE "headshot_batches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "style_key" TEXT NOT NULL,
    "source_image_url" TEXT NOT NULL,
    "source_storage_key" TEXT NOT NULL,
    "status" "HeadshotBatchStatus" NOT NULL DEFAULT 'QUEUED',
    "requested_count" INTEGER NOT NULL DEFAULT 4,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "credits_per_image" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "headshot_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "headshot_images" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "HeadshotImageStatus" NOT NULL DEFAULT 'QUEUED',
    "credit_state" "HeadshotCreditState" NOT NULL DEFAULT 'NONE',
    "credit_amount" INTEGER NOT NULL DEFAULT 1,
    "image_generation_task_id" TEXT,
    "image_url" TEXT,
    "storage_key" TEXT,
    "content_type" TEXT,
    "byte_length" INTEGER,
    "error_message" TEXT,
    "forced_failure" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "headshot_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "headshot_batches_user_id_created_at_idx" ON "headshot_batches"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "headshot_batches_status_created_at_idx" ON "headshot_batches"("status", "created_at");

-- CreateIndex
CREATE INDEX "headshot_images_user_id_status_created_at_idx" ON "headshot_images"("user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "headshot_images_batch_id_idx" ON "headshot_images"("batch_id");

-- CreateIndex
CREATE INDEX "headshot_images_status_created_at_idx" ON "headshot_images"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "headshot_images_batch_id_position_key" ON "headshot_images"("batch_id", "position");

-- AddForeignKey
ALTER TABLE "headshot_batches" ADD CONSTRAINT "headshot_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "headshot_images" ADD CONSTRAINT "headshot_images_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "headshot_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "headshot_images" ADD CONSTRAINT "headshot_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
