import path from 'path';
import ffmpegStatic from 'ffmpeg-static';

const getFfmpegPath = () => {
  if (!ffmpegStatic) return null;

  // Handle Next.js/Turbopack \ROOT placeholder
  let cleanPath = ffmpegStatic;
  if (cleanPath.startsWith('\\ROOT')) {
    cleanPath = cleanPath.replace('\\ROOT', '');
  }

  // Resolve to absolute path
  return path.isAbsolute(cleanPath) ? cleanPath : path.join(process.cwd(), cleanPath);
};

export const CONFIG = {
  YT_DLP_PATH: 'C:\\Users\\kenyi\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe',
  FFMPEG_PATH: getFfmpegPath(),
  TEMP_DIR: path.join(process.cwd(), 'temp'),
  OUTPUT_DIR: path.join(process.cwd(), 'public', 'outputs'),
};
