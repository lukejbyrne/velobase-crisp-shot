/**
 * Source portrait upload.
 *
 * The framework's presigned-URL flow only works when S3-compatible storage is
 * configured, and it performs no server-side validation. Headshot uploads go
 * through the server instead so that type and size are enforced where they
 * cannot be bypassed, and so local development keeps working on the filesystem
 * storage fallback.
 */
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createLogger } from "@/lib/logger";
import { putObject } from "@/server/storage";
import {
  buildSourceStorageKey,
  headshotConfig,
} from "@/modules/headshots/server/config";

const logger = createLogger("headshots-upload");

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart form upload" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const contentType = file.type.split(";")[0]?.toLowerCase() ?? "";
  if (
    !(headshotConfig.acceptedUploadTypes as readonly string[]).includes(
      contentType,
    )
  ) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, WebP or HEIC." },
      { status: 415 },
    );
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (file.size > headshotConfig.maxUploadBytes) {
    return NextResponse.json(
      {
        error: `Image must be smaller than ${Math.round(
          headshotConfig.maxUploadBytes / (1024 * 1024),
        )}MB`,
      },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // The browser-declared type is untrusted, so the real bytes decide.
  if (!looksLikeSupportedImage(buffer)) {
    return NextResponse.json(
      { error: "That file does not look like a supported image" },
      { status: 415 },
    );
  }

  const extension = EXTENSION_BY_TYPE[contentType] ?? "png";
  const storageKey = buildSourceStorageKey(
    session.user.id,
    randomUUID(),
    extension,
  );

  try {
    const stored = await putObject(buffer, storageKey, contentType);

    logger.info(
      { userId: session.user.id, storageKey, byteLength: buffer.length },
      "Stored headshot source portrait",
    );

    return NextResponse.json({
      storageKey: stored.storageKey,
      publicUrl: stored.publicUrl,
      contentType,
      byteLength: buffer.length,
    });
  } catch (error) {
    logger.error(
      { err: error, userId: session.user.id },
      "Failed to store headshot source portrait",
    );
    return NextResponse.json(
      { error: "Could not store the photo. Please try again." },
      { status: 500 },
    );
  }
}

/** Magic-number sniffing for the formats the product accepts. */
function looksLikeSupportedImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, index) => buffer[index] === byte)) return true;

  // RIFF....WEBP and ftyp-based HEIC/HEIF share an offset-4 brand marker.
  const riff = buffer.toString("ascii", 0, 4);
  const brand = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && brand === "WEBP") return true;
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    return ["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(
      brand.toLowerCase(),
    );
  }

  return false;
}
