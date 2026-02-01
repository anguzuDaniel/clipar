'use client';

import { useState } from 'react';
import { Upload, Link as LinkIcon, Scissors, Check, Download, Loader2, Sparkles, Video } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import AdBanner from '@/components/AdBanner';

interface Clip {
  id: number;
  url: string;
  reason: string;
  transcription: string;
  start: number;
  end: number;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState('');

  const handleProcess = async () => {
    if (!url && !file) {
      setError('Please provide a YouTube URL or upload an MP4 file.');
      return;
    }
    if (file && file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 500MB limit. Please upload a smaller video.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setClips([]);
    setProgress('Initializing...');

    const formData = new FormData();
    if (url) formData.append('url', url);
    if (file) formData.append('file', file);

    try {
      setProgress('Processing video... This may take a few minutes.');
      const response = await axios.post('/api/process', formData);
      setClips(response.data.clips);
      setProgress('');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to process video. Please check your API key and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold gradient-text flex items-center gap-2">
            <Scissors className="text-primary" /> Clipar
          </h1>
          <p className="text-slate-400 mt-2">AI-Powered Social Media Video Clipper</p>
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-2 glass rounded-full text-sm font-medium border border-white/5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" /> Powered by Gemini
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Input Section */}
        <div className="space-y-8">
          <section className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Video className="w-24 h-24" />
            </div>

            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" /> Video Input
            </h2>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LinkIcon className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Paste YouTube URL..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
                  suppressHydrationWarning
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setFile(null);
                  }}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10"></div>
                <span className="text-xs text-slate-500 font-medium">OR</span>
                <div className="h-px flex-1 bg-white/10"></div>
              </div>

              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <Check className="w-10 h-10 text-green-500 mb-2" />
                      <p className="text-sm text-slate-300 font-medium">{file.name}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-500 mb-2" />
                      <p className="text-sm text-slate-400">Click to upload MP4</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="video/mp4"
                  suppressHydrationWarning
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) {
                      if (selectedFile.size > MAX_FILE_SIZE) {
                        setError('File size exceeds 500MB limit.');
                        setFile(null);
                        return;
                      }
                      setFile(selectedFile);
                      setUrl('');
                      setError('');
                    }
                  }}
                />
              </label>
            </div>

            <AdBanner
              dataAdSlot="xxxxxxxxxx"
              dataAdFormat="horizontal"
              className="mt-6 rounded-xl border border-white/5 bg-white/5 p-2"
            />

            <button
              onClick={handleProcess}
              disabled={isProcessing || (!url && !file)}
              className="w-full mt-8 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Analyze & Clip
                </>
              )}
            </button>

            {progress && (
              <p className="text-sm text-center mt-4 text-primary animate-pulse">{progress}</p>
            )}

            {error && (
              <p className="text-sm text-center mt-4 text-accent">{error}</p>
            )}
          </section>

          {/* Tips Section */}
          <section className="p-6 rounded-3xl border border-white/5 bg-white/5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">How it works</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] mt-0.5">1</div>
                <span>Upload a video or paste a link.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] mt-0.5">2</div>
                <span>Gemini AI identifies the most viral moments.</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] mt-0.5">3</div>
                <span>Clips are automatically cropped for social media.</span>
              </li>
            </ul>

            <AdBanner
              dataAdSlot="yyyyyyyyyy"
              dataAdFormat="vertical"
              className="mt-8 rounded-3xl border border-white/5 bg-white/5 p-4 min-h-[400px] flex items-center justify-center text-slate-500 text-xs"
            />
          </section>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" /> Generated Clips
          </h2>

          <div className="space-y-6 min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {clips.length > 0 ? (
                clips.map((clip) => (
                  <motion.div
                    key={clip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass p-6 rounded-3xl border border-white/5 flex flex-col md:flex-row gap-6 group"
                  >
                    <div className="relative aspect-[9/16] w-full md:w-32 bg-black rounded-xl overflow-hidden shadow-2xl">
                      <video src={clip.url} className="w-full h-full object-cover" controls />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                            Clip #{clip.id + 1}
                          </span>
                          <span className="text-xs text-slate-500">
                            {Math.floor(clip.start)}s - {Math.floor(clip.end)}s
                          </span>
                        </div>
                        <h4 className="font-medium text-sm text-slate-100 mb-2 line-clamp-2">{clip.reason}</h4>
                        <p className="text-xs text-slate-400 italic line-clamp-3">"{clip.transcription}"</p>
                      </div>

                      <a
                        href={clip.url}
                        download={`clip_${clip.id}.mp4`}
                        className="mt-4 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-medium text-sm py-3 rounded-xl transition-all"
                      >
                        <Download className="w-4 h-4" /> Download MP4
                      </a>
                    </div>
                  </motion.div>
                ))
              ) : isProcessing ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 opacity-20" />
                  <p className="animate-pulse">Analyzing viral potential...</p>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 border-2 border-dashed border-white/5 rounded-3xl">
                  <Video className="w-12 h-12 mb-4 opacity-10" />
                  <p>Your clips will appear here</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="mt-24 py-8 border-t border-white/5 text-center text-slate-600 text-sm">
        &copy; 2026 Clipar AI. All rights reserved.
      </footer>
    </div>
  );
}
