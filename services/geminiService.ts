
import { GoogleGenAI, Type } from "@google/genai";
import { Waypoint, WalkMeta } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWalkStory = async (path: Waypoint[]): Promise<WalkMeta> => {
  const model = "gemini-3-flash-preview";
  
  const pathSummary = path.map(p => `(${p.lat.toFixed(4)}, ${p.lng.toFixed(4)})`).join(" -> ");

  const prompt = `
    私は以下の経路を散歩しました: ${pathSummary}。
    これらの座標と移動のシーケンスに基づいて、この散歩についての詩的で短い情緒的な説明を日本語で考えてください。
    レスポンスは必ず日本語で、指定されたJSON形式で返してください。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "散歩のクリエイティブなタイトル（日本語）" },
          description: { type: Type.STRING, description: "道中の様子や気分を表現した1〜2文の詩的な説明（日本語）" },
          vibe: { type: Type.STRING, description: "散歩の雰囲気を表す一言と絵文字（例：'爽やかな朝 🌿', '都会の夕暮れ 🌆'）" }
        },
        required: ["title", "description", "vibe"]
      }
    }
  });

  return JSON.parse(response.text);
};
