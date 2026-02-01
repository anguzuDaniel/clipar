import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../lib/config';

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

/**
 * Splits text into lines of maximum characters to fit video frame width.
 */
function wrapText(text: string, maxCharsPerLine: number = 25): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length <= maxCharsPerLine) {
            currentLine += (currentLine ? ' ' : '') + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    });
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
}

export async function processClip(options: ProcessingOptions): Promise<string> {
    const { inputPath, outputPath, start, duration, aspectRatio, captionText } = options;

    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    const fontPath = path.join(process.cwd(), 'public/fonts/Montserrat-Bold.ttf').replace(/\\/g, '/');

    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(duration);

        let videoFilters = [];

        // 1. Vertical crop (9:16)
        if (aspectRatio === '9:16') {
            videoFilters.push({
                filter: 'crop',
                options: 'ih*9/16:ih:(iw-ih*9/16)/2:0'
            });
        }

        // 2. Advanced Stylized Captions
        if (captionText) {
            const wrappedText = wrapText(captionText.toUpperCase(), 30);
            // Escape special characters for FFmpeg
            const escapedText = wrappedText
                .replace(/'/g, "'\\''")
                .replace(/:/g, '\\:')
                .replace(/,/g, '\\,');

            videoFilters.push({
                filter: 'drawtext',
                options: {
                    text: escapedText,
                    fontfile: fontPath,
                    fontcolor: '#FFFF00', // Yellow
                    fontsize: 48,
                    borderw: 3,           // Bold outline
                    bordercolor: 'black',
                    shadowcolor: 'black@0.6',
                    shadowx: 3,
                    shadowy: 3,
                    x: '(w-text_w)/2',    // Center horizontally
                    y: 'h*0.7',           // Lower-middle third
                    fix_bounds: 1,        // Stay within frame
                    line_spacing: 10
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
