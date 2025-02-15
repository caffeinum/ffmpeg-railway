import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";
import { join } from "path";

export async function extractAudioFromVideo(
  videoBuffer: Buffer
): Promise<Buffer> {
  const inputPath = join(tmpdir(), `${randomUUID()}.mp4`);
  const outputPath = join(tmpdir(), `${randomUUID()}.mp3`);

  try {
    await Bun.write(inputPath, videoBuffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("mp3")
        .audioCodec("libmp3lame")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    return Buffer.from(await Bun.file(outputPath).arrayBuffer());
  } finally {
    // Cleanup
    try {
      await Promise.all([
        Bun.file(inputPath).delete(),
        Bun.file(outputPath).delete(),
      ]);
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }
}
