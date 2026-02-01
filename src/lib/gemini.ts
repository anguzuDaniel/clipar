import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from 'fs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

export interface VideoHighlight {
    start: number;
    end: number;
    reason: string;
    transcription: string;
}

export async function analyzeVideoWithGemini(videoPath: string): Promise<VideoHighlight[]> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    console.log(`Uploading video to Gemini: ${videoPath}`);

    if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found for upload: ${videoPath}`);
    }

    // Upload the file to Gemini File API
    const uploadResponse = await fileManager.uploadFile(videoPath, {
        mimeType: "video/mp4",
        displayName: "Video for Clipping",
    });

    const name = uploadResponse.file.name;
    console.log(`Uploaded file ${name} to Gemini. Waiting for processing...`);

    // Wait for processing to complete
    let file = await fileManager.getFile(name);
    while (file.state === "PROCESSING") {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        file = await fileManager.getFile(name);
    }

    if (file.state === "FAILED") {
        throw new Error("Video processing failed in Gemini");
    }

    console.log("\nVideo is ready. Analyzing...");

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
    Analyze this video for social media (TikTok, Reels, Shorts).
    Identify 3-5 viral or high-interest segments.
    For each segment, provide:
    1. Start and end timestamps in seconds.
    2. A brief reason why it's viral.
    3. A transcription of the audio for captions.
    
    Format the output as a JSON array of objects with keys: "start", "end", "reason", "transcription".
    Example:
    [
      {"start": 10, "end": 25, "reason": "Funny punchline", "transcription": "So I told him, that's not a cat, that's my wife!"}
    ]
  `;

    const result = await model.generateContent([
        {
            fileData: {
                mimeType: file.mimeType,
                fileUri: file.uri,
            },
        },
        { text: prompt },
    ]);

    const responseText = result.response.text();
    console.log("Gemini Response:", responseText);

    // Clean up the response text (sometimes it includes markdown code blocks)
    const jsonString = responseText.replace(/```json\n?|\n?```/g, "").trim();

    try {
        const highlights: VideoHighlight[] = JSON.parse(jsonString);
        return highlights;
    } catch (error) {
        console.error("Failed to parse Gemini JSON:", error);
        throw new Error("Invalid response format from AI");
    } finally {
        // Optionally delete the file from Gemini
        // await fileManager.deleteFile(name);
    }
}
