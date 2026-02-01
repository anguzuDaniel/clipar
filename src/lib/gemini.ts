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
    let uploadResponse;
    try {
        uploadResponse = await fileManager.uploadFile(videoPath, {
            mimeType: "video/mp4",
            displayName: "Video for Clipping",
        });
    } catch (error: any) {
        console.error("Gemini Upload Error:", error);
        const errorMessage = error.message || String(error);
        if (errorMessage.includes("fetch failed")) {
            throw new Error("Failed to upload video to Gemini. This may be due to a timeout with a large file or a network issue. Please try a smaller video or check your internet connection.");
        }
        if (errorMessage.includes("429") || errorMessage.includes("quota")) {
            throw new Error("Gemini API quota exceeded. Please wait a moment or check your Google AI Studio billing/plan.");
        }
        throw new Error(`Failed to upload video: ${errorMessage}`);
    }

    const name = uploadResponse.file.name;
    console.log(`Uploaded file ${name} to Gemini. Waiting for processing...`);

    // Wait for processing to complete
    let file;
    try {
        file = await fileManager.getFile(name);
        while (file.state === "PROCESSING") {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            file = await fileManager.getFile(name);
        }
    } catch (error: any) {
        console.error("Gemini Processing Check Error:", error);
        throw new Error(`Error checking video status: ${error.message}`);
    }

    if (file.state === "FAILED") {
        throw new Error("Video processing failed in Gemini. The video might be in an unsupported format or too long.");
    }

    console.log("\nVideo is ready. Analyzing...");

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
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
    Identify 3-5 viral or high-interest segments that are ENGAGING and COMPLETE.
    
    IMPORTANT: Each segment MUST be between 30-60 seconds long to be suitable for social media.
    Do NOT select segments shorter than 30 seconds.
    
    For each segment, provide:
    - start: The start timestamp in seconds (as a number)
    - end: The end timestamp in seconds (as a number) - ensure end - start >= 30
    - reason: A brief explanation of why this segment is viral-worthy
    - transcription: A transcription of the key audio/dialogue in this segment
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

        // Check for token limit errors
        if (errorMessage.includes("token count exceeds") || errorMessage.includes("1048576")) {
            throw new Error("This video is too long to process. Please try a video under 45 minutes or use a shorter segment.");
        }

        // Check for content safety blocks
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
