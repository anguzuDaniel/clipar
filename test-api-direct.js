const axios = require('axios');

async function testApi() {
    const apiKey = "AIzaSyDFO-luTOX6ehHQrPr3pAgRBqG1pMoMdAY";
    const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: "Hi" }] }]
            });
            console.log(`✅ ${model} (v1beta) success:`, response.data.candidates[0].content.parts[0].text);
        } catch (err) {
            console.log(`❌ ${model} (v1beta) failed: ${err.response?.status} ${err.response?.statusText}`);

            // Try v1
            try {
                const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
                const response = await axios.post(url, {
                    contents: [{ parts: [{ text: "Hi" }] }]
                });
                console.log(`✅ ${model} (v1) success:`, response.data.candidates[0].content.parts[0].text);
            } catch (err2) {
                console.log(`❌ ${model} (v1) failed: ${err2.response?.status} ${err2.response?.statusText}`);
            }
        }
    }
}

testApi();
