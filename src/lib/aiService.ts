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
  pros: string[]; // [UPDATE] New field
  cons: string[]; // [UPDATE] New field
  scoreRationale?: string[]; // Optional/Derived
  qcWarnings: string[];
  suggestions: string[]; 
  riskFlags: RiskFlags;
  composition: CompositionStats;
}

export const aiService = {
  // --- TRENDS FORECASTING SERVICE ---
  async getStockTrends(customTopic?: string): Promise<TrendItem[]> {
    try {
      const apiKey = process.env.API_KEY;
      
      // [DEV GUARD]
      if (!apiKey || apiKey === 'dummy-key-for-ui-dev' || apiKey === '') {
        console.warn("No valid API_KEY found. Falling back to simulation mode.");
        await new Promise(resolve => setTimeout(resolve, 800));
        return getMockTrends(customTopic);
      }

      const ai = new GoogleGenAI({ apiKey });
      const today = new Date();
      
      const monthNames = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(today);
        d.setMonth(today.getMonth() + i);
        monthNames.push(d.toLocaleString('en-US', { month: 'long' }));
      }
      
      const targetYear = new Date(today.getFullYear(), today.getMonth() + 3).getFullYear();
      const windowString = `${monthNames.join(', ')} ${targetYear}`;

      let systemInstruction = "You are the Head of Content Strategy for a top-tier microstock agency.";
      let userPrompt = "";

      if (customTopic) {
        userPrompt = `DEEP DIVE: "${customTopic}". Analyze commercial viability for ${windowString}. Identify 9 high-selling variations.`;
      } else {
        userPrompt = `MARKET FORECAST: ${windowString}. Generate 9 High-Commercial-Value Stock Trends distributed across these 3 months.`;
      }

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

      try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: userPrompt,
            config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.8, 
            systemInstruction: systemInstruction
            }
        });
        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text) as TrendItem[];
      } catch (err) {
        console.debug("Gemini 3 Trends failed, falling back to Flash Latest...");
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
  async generateImage(prompt: string): Promise<string | null> {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === 'dummy-key-for-ui-dev' || apiKey === '') return null;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt + " high quality stock photography, 8k" }] },
        config: { imageConfig: { aspectRatio: "4:3" } }
      });
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Image Generation Error:", error);
      return null;
    }
  },

  // --- MAIN ANALYSIS FUNCTION ---
  async analyzeStockPhoto(imageBlob: Blob): Promise<StockAnalysisResult | null> {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'dummy-key-for-ui-dev' || apiKey === '') {
      console.warn("No API Key. Skipping real analysis.");
      return null; 
    }

    try {
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

      const BANNED_WORDS = [
        "iphone", "ipad", "macbook", "apple", "samsung", "sony", "canon", "nikon", "coca cola", "pepsi",
        "nike", "adidas", "gucci", "lv", "chanel", "starbucks", "mcdonalds",
        "facebook", "instagram", "twitter", "tiktok", "youtube", "google",
        "red cross", "olympics", "nba", "fifa", "oscar",
        "bangkok hospital", "bumrungrad", "sririraj" 
      ];

      // [PROMPT UPDATE] Requested by user: Detailed 5 Pros / 5 Cons
      const systemInstruction = `
        You are a Senior Stock-Photo Auditor for a premium agency.
        Your job is to provide a BRUTALLY HONEST commercial assessment.
        
        CRITERIA:
        1. **Commercial Value**: Who buys this? Why? (Ads, Blogs, UI backgrounds).
        2. **Technical Quality**: Focus, Noise, Lighting, Artifacts.
        3. **Stock Usability**: Copy space, generic vs specific, authenticity.
        
        SCORING (0-100):
        - <50: Reject (Blur, Noise, Bad Light, Trademarks).
        - 50-70: Average (Good enough but boring or cluttered).
        - 71-89: High Potential (Good tech, clear concept).
        - 90+: Best Seller (Perfect tech + Strong Trend + Great Copy Space).
      `;

      const prompt = `
        Analyze this image. Output JSON only.

        1. **Pros (5 points)**: List EXACTLY 5 specific strong points (e.g., "Excellent copy space on top right", "Natural authentic smile", "Sharp focus on eyes").
        2. **Cons (5 points)**: List EXACTLY 5 specific weak points or risks (e.g., "Slight noise in shadows", "Brand logo visible on shoe", "Cluttered background").
        3. **Keywords**: 40 distinct keywords sorted by relevance.
        4. **Score**: Calculate strictly.
        5. **Banned Words**: Avoid ${BANNED_WORDS.join(", ")}.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          category: { type: Type.STRING },
          sellScore: { type: Type.NUMBER },
          // [UPDATE] New Schema for Pros/Cons
          pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 5 strong commercial points" },
          cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 5 weak points or risks" },
          
          qcWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
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
              copySpace: { type: Type.STRING },
              backgroundCleanliness: { type: Type.STRING }
            },
            required: ["orientation", "copySpace", "backgroundCleanliness"]
          }
        },
        required: ["title", "keywords", "category", "sellScore", "pros", "cons", "riskFlags", "qcWarnings", "suggestions"]
      };

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
          if (model === modelsToTry[modelsToTry.length - 1]) break;
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

function getMockTrends(topic?: string): TrendItem[] {
  const base = topic ? `Concept for ${topic}` : "Trending Concept";
  return Array.from({ length: 9 }).map((_, i) => ({
    title: `${base} ${i + 1}`,
    description: "Simulation Mode: API Key missing or Quota exceeded. Connect a valid Gemini API Key to see real-time market data.",
    keywords: ["simulation", "mock-data", "demo", "placeholder", "concept"],
    visualPrompt: `conceptual stock photo of ${base} ${i+1}, studio lighting, 8k resolution`
  }));
}