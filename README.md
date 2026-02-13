🎬 Clipar: AI-Powered Social Media Clipping Tool
Clipar is a high-performance web application designed to transform long-form video content (YouTube links or local uploads) into viral-ready clips for TikTok, Instagram Reels, and YouTube Shorts.

By leveraging Gemini 1.5 Pro/Flash for video intelligence and FFmpeg/Remotion for precise rendering, Clipar automates the tedious parts of content creation.

🚀 Features
Smart Viral Detection: Uses AI to "watch" your video and identify the most engaging moments based on speech and action.

Auto-Reframe (9:16): Intelligent cropping of horizontal videos into the vertical format required for mobile platforms.

Viral Captions: Automatically generates high-contrast, "Hormozi-style" captions that stay within the social media "safe zones."

Dual Input: Support for direct MP4 uploads or instant processing via YouTube URL.

One-Click Export: Fast server-side rendering with direct download links.

🛠️ Tech Stack
Frontend: Next.js 14 (App Router), Tailwind CSS

Backend: Node.js, FFmpeg for video manipulation

AI Engine: Google Gemini 1.5 Flash (Multimodal Video Analysis)

Deployment: Google Cloud Run (Containerized via Docker)

Video Framework: Remotion

📂 Project Structure
Plaintext
├── app/                # Next.js App Router (UI Components)
├── public/             # Static assets (Logo, Fonts)
├── utils/
│   ├── gemini.ts       # AI Analysis logic
│   └── processor.ts    # FFmpeg/Remotion rendering logic
├── components/         # Reusable UI (Video Player, AdBanners)
├── Dockerfile          # Configuration for Google Cloud deployment
└── .env.example        # Environment variable template
⚙️ Getting Started
Prerequisites
Node.js 18+

FFmpeg installed on your local machine

A Google AI Studio API Key

Installation
Clone the repository:

Bash
git clone https://github.com/your-username/clipar.git
cd clipar
Install dependencies:

Bash
npm install
Set up environment variables:
Create a .env.local file and add:

Code snippet
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
NEXT_PUBLIC_ADSENSE_CLIENT_ID=your_adsense_id
Run the development server:

Bash
npm run dev
🚢 Deployment
This project is optimized for Google Cloud Run. To deploy, ensure you have the Google Cloud CLI installed and run:

Bash
gcloud run deploy clipar --source . --region europe-west1
⚖️ License
Distributed under the MIT License. See LICENSE for more information.
