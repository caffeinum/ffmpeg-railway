import { Hono } from "hono";
import { extractAudioFromVideo } from "./ffmpeg";

const app = new Hono();

app.post("/convert", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return c.json({ error: "No file provided" }, 400);
    if (!file.type.startsWith("video/"))
      return c.json({ error: "Invalid file type" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const audioBuffer = await extractAudioFromVideo(buffer);

    c.header("Content-Type", "audio/mpeg");
    c.header(
      "Content-Disposition",
      `attachment; filename="audio-${Date.now()}.mp3"`
    );
    return c.body(audioBuffer);
  } catch (error) {
    console.error("Error:", error);
    return c.json({ error: "Failed to process video" }, 500);
  }
});

app.get("/", (c) => c.json({ status: "ok" }));

const server = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  fetch: app.fetch,
};

export default server;
