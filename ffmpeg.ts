import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";
import { join } from "path";

export interface FFmpegOptions {
  inputFormat?: string;
  outputFormat: string;
  videoCodec?: string;
  audioCodec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  fps?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  audioChannels?: number;
  audioFrequency?: number;
  startTime?: string;
  duration?: string;
  seek?: string;
  filters?: string[];
}

export async function processMedia(
  inputBuffer: Buffer,
  options: FFmpegOptions
): Promise<Buffer> {
  const inputPath = join(
    tmpdir(),
    `${randomUUID()}.${options.inputFormat || "mp4"}`
  );
  const outputPath = join(tmpdir(), `${randomUUID()}.${options.outputFormat}`);

  try {
    await Bun.write(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      let command = ffmpeg(inputPath).toFormat(options.outputFormat);

      if (options.videoCodec) command = command.videoCodec(options.videoCodec);
      if (options.audioCodec) command = command.audioCodec(options.audioCodec);
      if (options.videoBitrate)
        command = command.videoBitrate(options.videoBitrate);
      if (options.audioBitrate)
        command = command.audioBitrate(options.audioBitrate);
      if (options.fps) command = command.fps(options.fps);
      if (options.width || options.height) {
        command = command.size(
          `${options.width || "?"}x${options.height || "?"}`
        );
      }
      if (options.aspectRatio) command = command.aspect(options.aspectRatio);
      if (options.audioChannels)
        command = command.audioChannels(options.audioChannels);
      if (options.audioFrequency)
        command = command.audioFrequency(options.audioFrequency);
      if (options.startTime) command = command.setStartTime(options.startTime);
      if (options.duration) command = command.setDuration(options.duration);
      if (options.seek) command = command.seek(options.seek);

      if (options.filters && options.filters.length > 0) {
        options.filters.forEach((filter) => {
          command = command.complexFilter(filter);
        });
      }

      command
        .on("start", (commandLine: string) =>
          console.log("Started FFmpeg with command:", commandLine)
        )
        .on("progress", (progress: { percent: number }) =>
          console.log("Processing:", progress.percent, "% done")
        )
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

// Common preset functions
export const presets = {
  compressVideo: (quality: 'low' | 'medium' | 'high' = 'medium'): FFmpegOptions => ({
    outputFormat: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    videoBitrate: quality === 'low' ? '500k' : quality === 'medium' ? '1000k' : '2000k',
    audioBitrate: quality === 'low' ? '64k' : quality === 'medium' ? '128k' : '192k',
  }),
  
  createGif: (fps: number = 10): FFmpegOptions => ({
    outputFormat: 'gif',
    fps,
    filters: ['split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse']
  }),
  
  extractAudio: (format: 'mp3' | 'aac' | 'wav' = 'mp3'): FFmpegOptions => ({
    outputFormat: format,
    audioCodec: format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : 'pcm_s16le',
    audioBitrate: '192k'
  }),
  
  thumbnail: (time: string = '00:00:01', size: { width?: number; height?: number } = {}): FFmpegOptions => ({
    outputFormat: 'jpg',
    seek: time,
    duration: '1',
    ...size
  })
};
