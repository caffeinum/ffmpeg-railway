import { Hono } from "hono";
import { FFmpegOptions, presets, processMedia } from "./ffmpeg";

const app = new Hono();

// Helper to validate and parse FFmpeg options
const parseFFmpegOptions = (formData: FormData): FFmpegOptions | null => {
  const options: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (key !== "file" && typeof value === "string") {
      options[key] = value;
    }
  });

  if (!options.outputFormat) return null;
  return options as unknown as FFmpegOptions;
};

// Generic conversion endpoint that accepts FFmpeg options
app.post("/convert", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const options = parseFFmpegOptions(formData);

    if (!file) return c.json({ error: "No file provided" }, 400);
    if (!options) return c.json({ error: "Output format is required" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await processMedia(buffer, options);

    c.header(
      "Content-Type",
      `${file.type.split("/")[0]}/${options.outputFormat}`
    );
    c.header(
      "Content-Disposition",
      `attachment; filename="converted-${Date.now()}.${options.outputFormat}"`
    );
    return c.body(outputBuffer);
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Failed to process media" }, 500);
  }
});

// Convenience endpoints for common operations
app.post("/extract-audio", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const format = (formData.get("format") as "mp3" | "aac" | "wav") || "mp3";

    if (!file) return c.json({ error: "No file provided" }, 400);
    if (!file.type.startsWith("video/"))
      return c.json({ error: "Invalid file type" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await processMedia(
      buffer,
      presets.extractAudio(format)
    );

    c.header("Content-Type", `audio/${format}`);
    c.header(
      "Content-Disposition",
      `attachment; filename="audio-${Date.now()}.${format}"`
    );
    return c.body(outputBuffer);
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Failed to extract audio" }, 500);
  }
});

app.post("/compress-video", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const quality =
      (formData.get("quality") as "low" | "medium" | "high") || "medium";

    if (!file) return c.json({ error: "No file provided" }, 400);
    if (!file.type.startsWith("video/"))
      return c.json({ error: "Invalid file type" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await processMedia(
      buffer,
      presets.compressVideo(quality)
    );

    c.header("Content-Type", "video/mp4");
    c.header(
      "Content-Disposition",
      `attachment; filename="compressed-${Date.now()}.mp4"`
    );
    return c.body(outputBuffer);
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Failed to compress video" }, 500);
  }
});

app.post("/create-gif", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const fps = Number(formData.get("fps")) || 10;

    if (!file) return c.json({ error: "No file provided" }, 400);
    if (!file.type.startsWith("video/"))
      return c.json({ error: "Invalid file type" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await processMedia(buffer, presets.createGif(fps));

    c.header("Content-Type", "image/gif");
    c.header(
      "Content-Disposition",
      `attachment; filename="animation-${Date.now()}.gif"`
    );
    return c.body(outputBuffer);
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Failed to create GIF" }, 500);
  }
});

app.post("/thumbnail", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const time = (formData.get("time") as string) || "00:00:01";
    const width = Number(formData.get("width")) || undefined;
    const height = Number(formData.get("height")) || undefined;

    if (!file) return c.json({ error: "No file provided" }, 400);
    if (!file.type.startsWith("video/"))
      return c.json({ error: "Invalid file type" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const outputBuffer = await processMedia(
      buffer,
      presets.thumbnail(time, { width, height })
    );

    c.header("Content-Type", "image/jpeg");
    c.header(
      "Content-Disposition",
      `attachment; filename="thumbnail-${Date.now()}.jpg"`
    );
    return c.body(outputBuffer);
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Failed to create thumbnail" }, 500);
  }
});

app.get("/", (c) =>
  c.json({
    status: "ok",
    endpoints: {
      "/convert": "Generic conversion with custom FFmpeg options",
      "/extract-audio": "Extract audio from video (MP3, AAC, WAV)",
      "/compress-video": "Compress video with quality presets",
      "/create-gif": "Convert video to GIF",
      "/thumbnail": "Generate video thumbnail",
    },
  })
);

const server = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  fetch: app.fetch,
};

export default server;
