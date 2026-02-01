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

export async function processClip(options: ProcessingOptions): Promise<string> {
    const { inputPath, outputPath, start, duration, aspectRatio, captionText } = options;

    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    return new Promise(async (resolve, reject) => {
        try {
            // Ensure temporary directory exists for audio and subtitle files
            if (!fs.existsSync(CONFIG.TEMP_DIR)) {
                fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
            }

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

            // 2. Timed Subtitles (if caption text provided)
            let subtitlePath: string | null = null;
            if (captionText) {
                try {
                    // Import utilities dynamically to avoid circular dependencies
                    const { extractAudio, transcribeAudioWithTimestamps } = await import('./audioProcessor');
                    const { createSRTFile } = await import('./subtitleGenerator');

                    // Extract audio from the clip
                    const audioPath = path.join(CONFIG.TEMP_DIR, `audio_${Date.now()}.mp3`);
                    await extractAudio(inputPath, audioPath);

                    // Transcribe audio to get word-level timestamps
                    const words = await transcribeAudioWithTimestamps(audioPath, duration);

                    // Generate SRT subtitle file
                    subtitlePath = path.join(CONFIG.TEMP_DIR, `subtitles_${Date.now()}.srt`);
                    await createSRTFile(words, subtitlePath, 3); // 3 words per phrase

                    // Clean up audio file
                    if (fs.existsSync(audioPath)) {
                        fs.unlinkSync(audioPath);
                    }

                    // Add subtitle filter with custom styling
                    const escapedSubPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
                    videoFilters.push({
                        filter: 'subtitles',
                        options: {
                            filename: escapedSubPath,
                            force_style: 'FontName=Montserrat-Bold,FontSize=43,PrimaryColour=&H00FFFF,OutlineColour=&H000000,BorderStyle=1,Outline=2,Alignment=2,MarginV=150'
                        }
                    });

                    console.log('Subtitle file created:', subtitlePath);
                } catch (error) {
                    console.error('Subtitle generation error:', error);
                    // Continue without subtitles if there's an error
                }
            }

            if (videoFilters.length > 0) {
                command.videoFilters(videoFilters);
            }

            command
                .output(outputPath)
                .videoCodec('libx264')
                .addOption('-preset', 'veryfast')
                .addOption('-crf', '28')
                .size('720x1280') // Normalize resolution for speed and social media format
                .on('start', (cmd: string) => console.log('FFmpeg started:', cmd))
                .on('end', () => {
                    console.log('FFmpeg finished:', outputPath);

                    // Cleanup subtitle file
                    if (subtitlePath && fs.existsSync(subtitlePath)) {
                        try {
                            fs.unlinkSync(subtitlePath);
                        } catch (e) {
                            console.warn('Could not delete subtitle file:', e);
                        }
                    }

                    resolve(outputPath);
                })
                .on('error', (err: Error) => {
                    console.error('FFmpeg error:', err);

                    // Cleanup subtitle file on error
                    if (subtitlePath && fs.existsSync(subtitlePath)) {
                        try {
                            fs.unlinkSync(subtitlePath);
                        } catch (e) {
                            console.warn('Could not delete subtitle file:', e);
                        }
                    }

                    reject(err);
                })
                .run();
        } catch (error) {
            reject(error);
        }
    });
}
