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
    let rank = "CATASTROPHIQUE（惨劇）";
    if (score > 3000) rank = "LÉGENDAIRE（伝説級）";
    else if (score > 1500) rank = "EXCELLENT（一流）";
    else if (score > 800) rank = "ACCEPTABLE（普通）";
    else if (score > 300) rank = "MÉDIOCRE（凡庸）";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: `あなたはパリに本拠を置く、20年のキャリアを持つミシュランの覆面調査員です。
冷静沈着で辛辣、しかし知性的な日本語で批評を書きます。
今回のシェフのスコアは ${score} 点（評価ランク：${rank}）でした。

以下のルールを厳守してください：
- 文体は格調ある批評家口調（「〜であった」「〜と言わざるを得ない」など）
- 感嘆詞（え、あ、おっ など）や口語的な出だしは一切使わない
- スコアが低いほど辛辣に、高いほど渋々認める調子で
- フランス語の料理用語や格言を1つ自然に織り交ぜる
- 80〜120文字の日本語で1文のみ返答する`,
    });
    return response.text?.trim() || "料理とは記憶に残るものだが、今宵の皿は忘却に値する。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "料理とは記憶に残るものだが、今宵の皿は忘却に値する。";
  }
}
