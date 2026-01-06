import { GoogleGenAI, Type } from "@google/genai";
import { Analysis, RiskFlags, CompositionStats } from "./types";

export interface TrendItem {
  title: string;
  description: string;
  keywords: string[];
  visualPrompt: string;
}

// Updated Result Interface matching the strict schema
export interface StockAnalysisResult {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  sellScore: number;
  scoreRationale: string[];
  qcWarnings: string[];
  suggestions: string[]; // mapped from suggested_edits_before_upload
  riskFlags: RiskFlags;
  composition: CompositionStats;
}

export const aiService = {
  // --- TRENDS FORECASTING SERVICE ---
  // ใช้ AI วิเคราะห์ตลาดล่วงหน้า 3 เดือน (Buying Cycle)
  async getStockTrends(customTopic?: string): Promise<TrendItem[]> {
    try {
      const apiKey = process.env.API_KEY;
      
      // [DEV GUARD] ถ้าไม่มี Key ให้ใช้ Mock Data เพื่อไม่ให้ App พัง
      if (!apiKey || apiKey === 'dummy-key-for-ui-dev' || apiKey === '') {
        console.warn("No valid API_KEY found. Falling back to simulation mode.");
        await new Promise(resolve => setTimeout(resolve, 800));
        return getMockTrends(customTopic);
      }

      const ai = new GoogleGenAI({ apiKey });
      const today = new Date();
      
      // Calculate future window (Next 3 Months)
      const monthNames = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(today);
        d.setMonth(today.getMonth() + i);
        monthNames.push(d.toLocaleString('en-US', { month: 'long' }));
      }
      
      const targetYear = new Date(today.getFullYear(), today.getMonth() + 3).getFullYear();
      const windowString = `${monthNames.join(', ')} ${targetYear}`;

      // [PROMPT ENGINEERING] Persona & Task
      let systemInstruction = "You are the Head of Content Strategy for a top-tier microstock agency.";
      let userPrompt = "";

      if (customTopic) {
        userPrompt = `DEEP DIVE: "${customTopic}". Analyze commercial viability for ${windowString}. Identify 9 high-selling variations.`;
      } else {
        userPrompt = `MARKET FORECAST: ${windowString}. Generate 9 High-Commercial-Value Stock Trends distributed across these 3 months.`;
      }

      // JSON Schema Enforcement
      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            visualPrompt: { type: Type.STRING }
          },
          required: ["title", "description", "keywords", "visualPrompt"]
        }
      };

      // Improved Trend Fallback: Try Gemini 3 -> Flash Latest
      try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: userPrompt,
            config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.8, // Creative temperature
            systemInstruction: systemInstruction
            }
        });
        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as TrendItem[];
      } catch (err) {
        console.debug("Gemini 3 Trends failed, falling back to Flash Latest...");
        // Fallback Logic
        const response = await ai.models.generateContent({
            model: "gemini-flash-latest", 
            contents: userPrompt,
            config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.8, 
            systemInstruction: systemInstruction
            }
        });
        const text = response.text;
        if (!text) throw new Error("No response from backup model");
        return JSON.parse(text) as TrendItem[];
      }

    } catch (error) {
      console.warn("AI Trends Service Error (Switching to Mock):", error);
      return getMockTrends(customTopic);
    }
  },

  // --- IMAGE GENERATION (VISUALIZATION) ---
  // ใช้ Gemini 2.5 Flash Image เพื่อสร้างภาพตัวอย่างของ Trend
  async generateImage(prompt: string): Promise<string | null> {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === 'dummy-key-for-ui-dev' || apiKey === '') {
        return null;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt + " high quality stock photography, 8k" }] },
        config: { imageConfig: { aspectRatio: "4:3" } }
      });
      // Extract Base64 from response
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image Generation Error:", error);
      return null; // Fail gracefully (Show gradient instead)
    }
  },

  // --- MAIN ANALYSIS FUNCTION ---
  // หัวใจหลักของ App: วิเคราะห์รูปเพื่อหาคุณภาพและความเสี่ยง
  async analyzeStockPhoto(imageBlob: Blob): Promise<StockAnalysisResult | null> {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'dummy-key-for-ui-dev' || apiKey === '') {
      console.warn("No API Key. Skipping real analysis.");
      return null; // Triggers mock fallback
    }

    try {
      // Convert Blob to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });

      const ai = new GoogleGenAI({ apiKey });

      // [COMPLIANCE] Banned Words List
      // รายชื่อแบรนด์ที่ห้ามมีใน Keywords เด็ดขาด เพื่อป้องกันการโดนฟ้องลิขสิทธิ์
      const BANNED_WORDS = [
        "iphone", "ipad", "macbook", "apple", "samsung", "sony", "canon", "nikon", "coca cola", "pepsi",
        "nike", "adidas", "gucci", "lv", "chanel", "starbucks", "mcdonalds",
        "facebook", "instagram", "twitter", "tiktok", "youtube", "google",
        "red cross", "olympics", "nba", "fifa", "oscar",
        "bangkok hospital", "bumrungrad", "sririraj" 
      ];

      // [PROMPT ENGINEERING] Multi-Phase Analysis
      // Updated to focus on Commercial Viability (Who will buy this?)
      const systemInstruction = `
        You are a Senior Stock-Photo Editor & Commercial Strategist at a major agency (Shutterstock/Adobe Stock).
        Your goal is to evaluate images not just for "beauty", but for **COMMERCIAL VIABILITY**.

        --- PHASE 1: COMMERCIAL VALUE & USABILITY (CRITICAL) ---
        Evaluate "Who will buy this and what for?":
        1.  **Copy Space:** Is there a clean area for designers to place text/logos? (High value).
        2.  **Concept Clarity:** Does it communicate a clear concept (e.g., "Remote work", "Success", "Sustainability")?
        3.  **Versatility:** Is it generic enough to be used in multiple contexts, but specific enough to be useful?
        4.  **Authenticity:** Does it look natural/candid (High trend) or staged/fake (Low trend)?

        --- PHASE 2: TECHNICAL & AESTHETIC ---
        - **Lighting:** Balanced exposure suitable for ads? (No harsh shadows blocking faces).
        - **Composition:** Rule of thirds, straight horizons.
        - **Noise/Focus:** Must be sharp at 100%.

        --- PHASE 3: VISUAL RISK SCAN ---
        - Scan for Logos/Trademarks: Even small icons on shirts, shoes, phones, cars.
        - Scan for Identifiable People: If a face is visible, a Model Release is REQUIRED.

        --- SCORING LOGIC (0-100) ---
        - **90-100 (Best Seller):** Perfect technicals + Strong Concept + Great Copy Space + Trending Style (Authentic).
        - **70-89 (Solid Stock):** Good technicals, clear subject, usable.
        - **50-69 (Snapshot/Average):** Technically okay but "boring", cluttered background, no copy space, or looks too "staged".
        - **0-49 (Reject):** Blurry, noise, heavy trademark issues, or poor lighting.

        OUTPUT FORMAT: JSON ONLY.
      `;

      const prompt = `
        Analyze this image for Stock Photo commercial potential.
        
        1. **Assess Usability**: specifically look for 'Copy Space' and 'Background Cleanliness'.
        2. **Assess Concept**: What is the story? (e.g. 'Business growth', 'Family love').
        3. **Calculate Sell Score**: Be strict. A beautiful photo with no commercial use should get a LOWER score than a simple photo with great copy space.
        4. **Score Rationale**: Explain the score based on *buying potential* (e.g., "Good for banner ads due to copy space", "Hard to use due to clutter").
        5. **Banned Words**: Do NOT use: ${BANNED_WORDS.join(", ")}.
        
        Return valid JSON.
      `;

      // JSON Schema for Strict Output Control
      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Commercial title, e.g., 'Happy family running on beach with copy space'" },
          description: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 40 keywords sorted by relevance" },
          category: { type: Type.STRING, description: "One of: Animals, Architecture, Business, Food, Nature, People, Tech, Travel, General" },
          sellScore: { type: Type.NUMBER, description: "0-100 commercial value" },
          scoreRationale: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Reasons focused on usability and market demand" },
          qcWarnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Technical rejections (Blur, Noise, Trademarks)" },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actionable edits to increase value" },
          riskFlags: {
            type: Type.OBJECT,
            properties: {
              containsLogoOrText: { type: Type.BOOLEAN },
              containsRecognizablePerson: { type: Type.BOOLEAN },
              requiresModelRelease: { type: Type.BOOLEAN },
              requiresPropertyRelease: { type: Type.BOOLEAN },
              editorialRecommended: { type: Type.BOOLEAN }
            },
            required: ["containsLogoOrText", "containsRecognizablePerson", "requiresModelRelease", "requiresPropertyRelease", "editorialRecommended"]
          },
          composition: {
            type: Type.OBJECT,
            properties: {
              orientation: { type: Type.STRING },
              copySpace: { type: Type.STRING, description: "None, Low, Medium, High (Critical for ads)" },
              backgroundCleanliness: { type: Type.STRING, description: "Cluttered, Busy, Clean, Isolated" }
            },
            required: ["orientation", "copySpace", "backgroundCleanliness"]
          }
        },
        required: ["title", "keywords", "category", "sellScore", "riskFlags", "qcWarnings", "suggestions"]
      };

      // [FALLBACK STRATEGY] Model Cascade
      // ลองใช้ Model ที่ดีที่สุดก่อน ถ้าพัง ให้ถอยไปใช้ Model รองลงมา
      // 1. gemini-3-flash-preview: Best quality, low quota.
      // 2. gemini-2.0-flash-exp: New fast model, good quota.
      // 3. gemini-flash-latest: Stable standard (1.5 Flash).
      const modelsToTry = [
          "gemini-3-flash-preview", 
          "gemini-2.0-flash-exp",
          "gemini-flash-latest"
      ];
      
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: model,
            contents: {
              parts: [
                { inlineData: { mimeType: imageBlob.type || 'image/jpeg', data: base64Data } },
                { text: prompt }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.4,
              systemInstruction: systemInstruction
            }
          });

          const text = response.text;
          if (!text) throw new Error(`Empty response from ${model}`);
          
          return JSON.parse(text) as StockAnalysisResult;

        } catch (error: any) {
          lastError = error;
          console.debug(`Model ${model} failed, attempting switch...`, error.message);

          // If this was the last model, stop and throw
          if (model === modelsToTry[modelsToTry.length - 1]) {
             break;
          }
          // Continue to next model immediately
          continue;
        }
      }
      
      throw lastError;

    } catch (error) {
      console.warn("Real Analysis Failed (All Models Exhausted):", error);
      throw error;
    }
  }
};

// [TESTING] Mock Data Fallback
// ใช้เมื่อระบบหลักล่ม หรือไม่มี API Key
function getMockTrends(topic?: string): TrendItem[] {
  const base = topic ? `Concept for ${topic}` : "Trending Concept";
  return Array.from({ length: 9 }).map((_, i) => ({
    title: `${base} ${i + 1}`,
    description: "Simulation Mode: API Key missing or Quota exceeded. Connect a valid Gemini API Key to see real-time market data.",
    keywords: ["simulation", "mock-data", "demo", "placeholder", "concept"],
    visualPrompt: `conceptual stock photo of ${base} ${i+1}, studio lighting, 8k resolution`
  }));
}