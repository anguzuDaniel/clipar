const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const apiKey = "AIzaSyDFO-luTOX6ehHQrPr3pAgRBqG1pMoMdAY";
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("Fetching models...");
        // Note: The SDK might not have a direct listModels on genAI in all versions, 
        // but we can try to fetch it via the v1beta endpoint manually if needed.
        // However, let's try to just generate a simple response first with a known model.

        const models = [
            "gemini-2.0-flash",
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest"
        ];

        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("test");
                console.log(`✅ Model ${modelName} is available and working.`);
                break;
            } catch (err) {
                console.log(`❌ Model ${modelName} failed: ${err.message}`);
            }
        }
    } catch (error) {
        console.error("General Error:", error);
    }
}

listModels();
