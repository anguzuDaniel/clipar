import path from 'path';
import fs from 'fs';

interface WordTimestamp {
    word: string;
    start: number;
    end: number;
}

interface SubtitleEntry {
    index: number;
    startTime: string;
    endTime: string;
    text: string;
}

/**
 * Converts seconds to SRT timestamp format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Groups words into 1-3 word phrases with timing
 */
export function groupWordsIntoPhrases(words: WordTimestamp[], maxWordsPerPhrase: number = 3): SubtitleEntry[] {
    const subtitles: SubtitleEntry[] = [];
    let index = 1;

    for (let i = 0; i < words.length; i += maxWordsPerPhrase) {
        const phraseWords = words.slice(i, i + maxWordsPerPhrase);
        const text = phraseWords.map(w => w.word).join(' ').toUpperCase();
        const startTime = phraseWords[0].start;
        const endTime = phraseWords[phraseWords.length - 1].end;

        subtitles.push({
            index,
            startTime: formatSRTTime(startTime),
            endTime: formatSRTTime(endTime),
            text
        });

        index++;
    }

    return subtitles;
}

/**
 * Generates SRT subtitle file content from subtitle entries
 */
export function generateSRTContent(subtitles: SubtitleEntry[]): string {
    return subtitles.map(sub =>
        `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`
    ).join('\n');
}

/**
 * Creates an SRT file from word timestamps
 */
export async function createSRTFile(
    words: WordTimestamp[],
    outputPath: string,
    maxWordsPerPhrase: number = 3
): Promise<string> {
    const subtitles = groupWordsIntoPhrases(words, maxWordsPerPhrase);
    const srtContent = generateSRTContent(subtitles);

    await fs.promises.writeFile(outputPath, srtContent, 'utf-8');
    return outputPath;
}

/**
 * Fallback: Estimate word timings when timestamps aren't available
 * Distributes words evenly across the clip duration
 */
export function estimateWordTimings(transcription: string, clipDuration: number): WordTimestamp[] {
    const words = transcription.split(/\s+/).filter(w => w.trim().length > 0);
    const avgWordDuration = clipDuration / words.length;

    return words.map((word, index) => ({
        word,
        start: index * avgWordDuration,
        end: (index + 1) * avgWordDuration
    }));
}
