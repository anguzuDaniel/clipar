import { NextRequest, NextResponse } from 'next/server';
import { downloadYouTubeVideo } from '@/lib/youtube';
import { analyzeVideoWithGemini } from '@/lib/gemini';
import { processClip } from '@/utils/videoProcessor';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '@/lib/config';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const url = formData.get('url') as string;
        const file = formData.get('file') as File;

        let inputPath = '';

        if (url) {
            inputPath = await downloadYouTubeVideo(url);
        } else if (file) {
            // Backend Size Limit: 500MB
            if (file.size > 500 * 1024 * 1024) {
                return NextResponse.json({ error: 'File size exceeds 500MB limit' }, { status: 400 });
            }

            // Save local file with streaming to avoid memory issues
            if (!fs.existsSync(CONFIG.TEMP_DIR)) {
                fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
            }
            inputPath = path.join(CONFIG.TEMP_DIR, `upload_${Date.now()}.mp4`);

            const writeStream = fs.createWriteStream(inputPath);
            const reader = file.stream().getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    writeStream.write(Buffer.from(value));
                }
            } finally {
                writeStream.end();
            }

            // Wait for write stream to finish
            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', () => resolve());
                writeStream.on('error', (err) => reject(err));
            });
        } else {
            return NextResponse.json({ error: 'No video source provided' }, { status: 400 });
        }

        // Step 2: AI Analysis
        const highlights = await analyzeVideoWithGemini(inputPath);

        // Filter out clips that are too short (minimum 20 seconds for social media)
        const validHighlights = highlights.filter(h => {
            const duration = h.end - h.start;
            if (duration < 20) {
                console.log(`Skipping short clip: ${duration}s (${h.start}-${h.end})`);
                return false;
            }
            return true;
        });

        if (validHighlights.length === 0) {
            throw new Error('No valid clips found. The video segments identified were too short (minimum 20 seconds required).');
        }

        // Step 3: Video Processing (Sequential to avoid CPU saturation)
        const processedClips = [];
        for (let i = 0; i < validHighlights.length; i++) {
            const highlight = validHighlights[i];
            const outputFilename = `clip_${Date.now()}_${i}.mp4`;
            const outputPath = path.join(CONFIG.OUTPUT_DIR, outputFilename);

            await processClip({
                inputPath,
                outputPath,
                start: highlight.start,
                duration: highlight.end - highlight.start,
                aspectRatio: '9:16',
                captionText: highlight.transcription,
            });

            processedClips.push({
                id: i,
                url: `/outputs/${outputFilename}`,
                reason: highlight.reason,
                transcription: highlight.transcription,
                start: highlight.start,
                end: highlight.end,
            });
        }

        // Cleanup input file after processing
        if (inputPath && fs.existsSync(inputPath)) {
            try {
                fs.unlinkSync(inputPath);
            } catch (cleanupErr) {
                console.error('Cleanup Error:', cleanupErr);
            }
        }

        return NextResponse.json({ clips: processedClips });
    } catch (error: any) {
        console.error('API Process Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
