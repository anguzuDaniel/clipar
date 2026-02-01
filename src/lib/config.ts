import path from 'path';
import ffmpegStatic from 'ffmpeg-static';

const getFfmpegPath = () => {
  if (!ffmpegStatic) return null;

  let cleanPath = ffmpegStatic;

  // Handle Next.js/Turbopack \ROOT placeholder
  if (cleanPath.startsWith('\\ROOT')) {
    cleanPath = cleanPath.replace('\\ROOT', '');
  }

  // On Windows, if the path starts with a backslash but not a drive letter,
  // it's relative to the drive root. We want it relative to process.cwd().
  if (cleanPath.startsWith('\\') && !cleanPath.startsWith('\\\\') && !/^[a-zA-Z]:/.test(cleanPath)) {
    cleanPath = path.join(process.cwd(), cleanPath);
  }

  // Final resolution
  const resolvedPath = path.isAbsolute(cleanPath) ? cleanPath : path.join(process.cwd(), cleanPath);
  console.log(`Resolved FFmpeg Path: ${resolvedPath}`);
  return resolvedPath;
};

export const CONFIG = {
  YT_DLP_PATH: 'C:\\Users\\kenyi\\AppData\\Local\\Programs\\Python\\Python312\\Scripts\\yt-dlp.exe',
  FFMPEG_PATH: getFfmpegPath(),
  TEMP_DIR: path.join(process.cwd(), 'temp'),
  OUTPUT_DIR: path.join(process.cwd(), 'public', 'outputs'),
};
