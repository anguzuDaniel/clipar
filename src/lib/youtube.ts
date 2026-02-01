import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function downloadYouTubeVideo(url: string): Promise<string> {
    if (!fs.existsSync(CONFIG.TEMP_DIR)) {
        fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
    }

    let videoId = 'video_' + Date.now();
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.pathname.startsWith('/shorts/')) {
            videoId = urlObj.pathname.split('/')[2];
        } else {
            videoId = urlObj.searchParams.get('v') || videoId;
        }
    } catch {
        // Fallback to default videoId
    }
    const outputPath = path.join(CONFIG.TEMP_DIR, `${videoId}.mp4`);

    // If already exists, return it (simple cache for testing)
    if (fs.existsSync(outputPath)) {
        return outputPath;
    }

    // -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" to ensure mp4 format
    // Pass ffmpeg location to yt-dlp for merging
    const ffmpegPath = CONFIG.FFMPEG_PATH ? ` --ffmpeg-location "${CONFIG.FFMPEG_PATH}"` : '';
    const command = `"${CONFIG.YT_DLP_PATH}"${ffmpegPath} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${outputPath}" "${url}"`;

    console.log(`Downloading: ${command}`);

    try {
        const { stdout, stderr } = await execPromise(command);
        console.log(`Download finished: ${stdout}`);
        if (stderr) console.error(`Download stderr: ${stderr}`);
        return outputPath;
    } catch (error) {
        console.error(`Download error: ${error}`);
        throw new Error(`Failed to download video: ${error}`);
    }
}
