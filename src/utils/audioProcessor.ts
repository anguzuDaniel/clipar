import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../lib/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "");

interface WordTimestamp {
    word: string;
    start: number;
    end: number;
}

/**
 * Extracts audio from a video clip
 */
export async function extractAudio(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .output(outputPath)
            .audioCodec('libmp3lame')
            .noVideo()
            .on('end', () => {
                console.log('Audio extraction complete:', outputPath);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Audio extraction error:', err);
                reject(err);
            })
            .run();
    });
}

/**
 * Transcribes audio using Gemini API and attempts to get word-level timestamps
 */
export async function transcribeAudioWithTimestamps(
    audioPath: string,
    clipDuration: number
): Promise<WordTimestamp[]> {
    console.log(`Transcribing audio: ${audioPath}`);

    // Upload audio file to Gemini
    const uploadResponse = await fileManager.uploadFile(audioPath, {
        mimeType: "audio/mpeg",
    });

    const name = uploadResponse.file.name;
    console.log(`Uploaded audio ${name} to Gemini`);

    // Wait for processing
    let file = await fileManager.getFile(name);
    while (file.state === "PROCESSING") {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await fileManager.getFile(name);
    }

    if (file.state === "FAILED") {
        throw new Error("Audio processing failed in Gemini");
    }

    console.log("\nAudio ready. Transcribing with timestamps...");

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
    });

    const prompt = `
    Transcribe this audio and provide word-level timestamps.
    
    For each word, provide:
    - word: the spoken word
    - start: start time in seconds (as a number)
    - end: end time in seconds (as a number)
    
    Return the result as a JSON array of objects with these fields.
    Be as accurate as possible with the timing.
    `;

    try {
        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri,
                },
            },
            { text: prompt },
        ]);

        const response = result.response.text();
        console.log("Gemini transcription response:", response);

        // Try to parse JSON response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const words = JSON.parse(jsonMatch[0]) as WordTimestamp[];
            return words;
        } else {
            // Fallback: extract plain text and estimate timings
            console.warn("Could not parse word timestamps, using fallback estimation");
            const text = response.replace(/```json|```/g, '').trim();
            return estimateWordTimings(text, clipDuration);
        }
    } catch (error) {
        console.error("Transcription error:", error);
        throw error;
    } finally {
        // Cleanup uploaded file
        try {
            await fileManager.deleteFile(name);
        } catch (e) {
            console.warn("Could not delete uploaded audio file:", e);
        }
    }
}

/**
 * Fallback: Estimate word timings when precise timestamps aren't available
 */
function estimateWordTimings(transcription: string, clipDuration: number): WordTimestamp[] {
    const words = transcription.split(/\s+/).filter(w => w.trim().length > 0);
    const avgWordDuration = clipDuration / words.length;

    return words.map((word, index) => ({
        word: word.replace(/[^\w\s]/g, ''), // Remove punctuation
        start: index * avgWordDuration,
        end: (index + 1) * avgWordDuration
    }));
}
