import { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
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

    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        start: { type: SchemaType.NUMBER, description: "Start time in seconds" },
                        end: { type: SchemaType.NUMBER, description: "End time in seconds" },
                        reason: { type: SchemaType.STRING },
                        transcription: { type: SchemaType.STRING }
                    },
                    required: ["start", "end", "reason", "transcription"]
                }
            }
        },
        safetySettings: [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ],
    });

    const prompt = `
    Analyze this video for social media (TikTok, Reels, Shorts).
    Identify 3-5 viral or high-interest segments.
    For each segment, provide the start and end timestamps in seconds (as numbers), 
    a brief reason why it's viral, and a transcription of the audio.
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

    let responseText = "";
    try {
        responseText = result.response.text();
        console.log("Gemini Response:", responseText);
    } catch (e: any) {
        console.error("Gemini response was blocked:", e);
        const errorMessage = e.message || String(e);
        if (errorMessage.includes("PROHIBITED_CONTENT") ||
            errorMessage.includes("SAFETY") ||
            errorMessage.includes("OTHER") ||
            errorMessage.includes("blocked")) {
            throw new Error("This video content was flagged by AI safety filters or cannot be processed. Please try a different video or a shorter segment.");
        }
        throw e;
    }

    try {
        // With responseSchema, the output should already be valid JSON
        let highlights: any[] = JSON.parse(responseText);

        // Robust mapping to ensure types are correct
        const processedHighlights: VideoHighlight[] = highlights.map(h => ({
            start: typeof h.start === 'string' ? parseTimestamp(h.start) : Number(h.start),
            end: typeof h.end === 'string' ? parseTimestamp(h.end) : Number(h.end),
            reason: String(h.reason),
            transcription: String(h.transcription)
        }));

        return processedHighlights;
    } catch (error) {
        console.error("Failed to parse Gemini JSON:", error);

        // Fallback: Try a more aggressive cleanup if traditional JSON.parse fails
        try {
            const jsonString = responseText.replace(/```json\n?|\n?```/g, "").trim();
            const highlights: any[] = JSON.parse(jsonString);
            return highlights.map(h => ({
                start: typeof h.start === 'string' ? parseTimestamp(h.start) : Number(h.start),
                end: typeof h.end === 'string' ? parseTimestamp(h.end) : Number(h.end),
                reason: String(h.reason),
                transcription: String(h.transcription)
            }));
        } catch (innerError) {
            throw new Error("Invalid response format from AI");
        }
    } finally {
        // Optionally delete the file from Gemini
        // await fileManager.deleteFile(name);
    }
}

/**
 * Parses timestamps in formats like "4:45", "01:04:45" or "285" into total seconds.
 */
function parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    return Number(timestamp) || 0;
}
