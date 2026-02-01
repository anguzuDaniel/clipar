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
            // Save local file
            if (!fs.existsSync(CONFIG.TEMP_DIR)) {
                fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
            }
            inputPath = path.join(CONFIG.TEMP_DIR, `upload_${Date.now()}.mp4`);
            const buffer = Buffer.from(await file.arrayBuffer());
            fs.writeFileSync(inputPath, buffer);
        } else {
            return NextResponse.json({ error: 'No video source provided' }, { status: 400 });
        }

        // Step 2: AI Analysis
        const highlights = await analyzeVideoWithGemini(inputPath);

        // Step 3: Video Processing (Parallel)
        const processedClips = await Promise.all(
            highlights.map(async (highlight, index) => {
                const outputFilename = `clip_${Date.now()}_${index}.mp4`;
                const outputPath = path.join(CONFIG.OUTPUT_DIR, outputFilename);

                await processClip({
                    inputPath,
                    outputPath,
                    start: highlight.start,
                    duration: highlight.end - highlight.start,
                    aspectRatio: '9:16',
                    captionText: highlight.transcription,
                });

                return {
                    id: index,
                    url: `/outputs/${outputFilename}`,
                    reason: highlight.reason,
                    transcription: highlight.transcription,
                    start: highlight.start,
                    end: highlight.end,
                };
            })
        );

        return NextResponse.json({ clips: processedClips });
    } catch (error: any) {
        console.error('API Process Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
