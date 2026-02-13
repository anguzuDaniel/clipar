Here is the professional **README.md** file in Markdown format. You can copy this entire block and paste it directly into your project files using **github.dev** or your mobile code editor.

---

# # 🎬 Clipar

### AI-Powered Social Media Video Repurposing

**Clipar** is a full-stack SaaS platform designed to help creators turn long-form videos into viral short-form content for **TikTok, Instagram Reels, and YouTube Shorts**.

---

## ## 🚀 Features

* **AI Viral Extraction:** Uses **Gemini 1.5 Flash** to analyze video content and identify the most engaging highlights.
* **Auto-Reframing:** Automatically converts horizontal (16:9) video into vertical (9:16) masterpieces.
* **Dynamic Captions:** Burned-in, high-contrast captions (Hormozi-style) that stay within social media "safe zones."
* **Multi-Source Input:** Paste a **YouTube link** or **Upload** an MP4 file directly.
* **Fast Export:** Optimized FFmpeg rendering for quick downloads.

---

## ## 🛠️ Tech Stack

| Component | Technology |
| --- | --- |
| **Framework** | Next.js 14 (App Router) |
| **Styling** | Tailwind CSS |
| **Video Engine** | FFmpeg / Remotion |
| **Intelligence** | Google Gemini API (Multimodal) |
| **Deployment** | Google Cloud Run (Docker) |
| **Monetization** | Google AdSense |

---

## ## 📂 Project Structure

```text
├── app/               # Next.js Pages & Layouts
├── components/        # UI Components (Upload, Player, AdBanners)
├── public/            # Static Assets (Logo, Fonts)
├── utils/             # Core Logic
│   ├── gemini.ts      # AI Video Analysis
│   └── processor.ts   # FFmpeg Rendering Logic
├── Dockerfile         # Deployment Configuration
└── README.md          # Project Documentation

```

---

## ## ⚙️ Installation & Setup

1. **Clone the repo**
```bash
git clone https://github.com/Kenyiy/clipar.git

```


2. **Configure Environment Variables**
Create a `.env.local` file:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_key
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxx

```


3. **Run Development Server**
```bash
npm run dev

```



---

## ## 🚢 Deployment

Clipar is containerized and ready for **Google Cloud Run**. To deploy to the `europe-west1` region:

```bash
gcloud run deploy clipar --source . --region europe-west1 --allow-unauthenticated

```

---

## ## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Would you like me to create the `LICENSE` file text or a `Privacy Policy` to go along with this?**
