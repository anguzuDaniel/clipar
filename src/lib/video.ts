import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';

if (CONFIG.FFMPEG_PATH) {
    ffmpeg.setFfmpegPath(CONFIG.FFMPEG_PATH);
}

export interface ProcessingOptions {
    inputPath: string;
    outputPath: string;
    start: number;
    duration: number;
    aspectRatio?: '9:16';
    captionText?: string;
}

export async function processClip(options: ProcessingOptions): Promise<string> {
    const { inputPath, outputPath, start, duration, aspectRatio, captionText } = options;

    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(duration);

        // Vertical crop (9:16)
        // For a 16:9 video, we want to crop the center 9/16 width
        // crop=w:h:x:y
        // if input is 1920x1080 (16:9)
        // target height is 1080, target width is 1080 * (9/16) = 607.5 -> 608
        // x = (1920 - 608) / 2 = 656
        // Formula: crop=in_h*9/16:in_h:(in_w-in_h*9/16)/2:0

        let videoFilters = [];

        if (aspectRatio === '9:16') {
            videoFilters.push({
                filter: 'crop',
                options: 'ih*9/16:ih:(iw-ih*9/16)/2:0'
            });
        }

        if (captionText) {
            // Very basic captioning using drawtext
            // This requires FFmpeg to be built with libfreetype
            // Since we are using ffmpeg-static, it usually has it.
            // We'll place it at the bottom middle.
            // We need to escape special characters in captionText.
            const escapedCaption = captionText.replace(/'/g, "'\\''").replace(/:/g, '\\:');

            videoFilters.push({
                filter: 'drawtext',
                options: {
                    text: escapedCaption,
                    fontcolor: 'white',
                    fontsize: 48, // Adjust based on resolution
                    box: 1,
                    boxcolor: 'black@0.5',
                    boxborderw: 10,
                    x: '(w-text_w)/2',
                    y: 'h-th-100', // 100px from bottom
                }
            });
        }

        if (videoFilters.length > 0) {
            command.videoFilters(videoFilters);
        }

        command
            .output(outputPath)
            .on('start', (cmd: string) => console.log('FFmpeg started:', cmd))
            .on('end', () => {
                console.log('FFmpeg finished:', outputPath);
                resolve(outputPath);
            })
            .on('error', (err: Error) => {
                console.error('FFmpeg error:', err);
                reject(err);
            })
            .run();
    });
}
