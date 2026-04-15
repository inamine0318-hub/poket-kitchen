import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getDailySpecial() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "You are a world-class French chef. Invent a creative name for a 'Daily Special' dish for a small bistro. Return only the name of the dish in French and its short description in Japanese.",
    });
    return response.text || "Chef's Surprise - 本日のシェフお任せ料理";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Chef's Surprise - 本日のシェフお任せ料理";
  }
}

export async function getMichelinReview(score: number) {
  try {
    // 評価基準を厳しく設定 (以前の2倍)
    let rank = "酷評";
    if (score > 3000) rank = "伝説";
    else if (score > 1500) rank = "一流";
    else if (score > 800) rank = "並";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `あなたは世界一厳格で、かつウィットに富んだ皮肉を愛するフランスの料理批評家です。
シェフが${score}点（ランク：${rank}）という成績でシフトを終えました。
この結果に対して、冷酷で、かつウィットに富んだ皮肉を交えた日本語の評価文を1つ送ってください。
特に低スコアの場合は容赦なく、高スコアでもどこか鼻につくような言い回しを好みます。
例：「この料理を犬に与えたら、犬が自分で料理を始めたよ」「君のキッチンにはシェフではなく、迷子が一人いるようだね」
100文字以内で、非常に辛口にお願いします。`,
    });
    return response.text || "君の料理を食べるくらいなら、空腹で死ぬ方を選ぶよ。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "評価に値しない。";
  }
}
