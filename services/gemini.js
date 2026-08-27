const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor() {
    this.client = null;
  }

  initialize() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[Gemini] GEMINI_API_KEY が設定されていません。画像生成機能は無効です。');
      return;
    }
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('[Gemini] 初期化完了');
  }

  /**
   * 英語プロンプトから画像を生成する
   * - 文章として成立していない箇所（単語のみ等）は無視
   * - 文法ミスや語法ミスは許容して画像を生成
   * @param {string} prompt - 学習者が入力した英語プロンプト
   * @param {object} [previousImage] - 前回の生成画像 {base64, mimeType}
   * @returns {Promise<{imageBase64: string, mimeType: string}>}
   */
  async generateImage(prompt, previousImage) {
    if (!this.client) {
      throw new Error('Gemini API が初期化されていません。GEMINI_API_KEY を .env に設定してください。');
    }

    let instructionExtras = "";
    if (previousImage && previousImage.base64) {
      instructionExtras = "\n5. You are provided with a reference image. Use this image as a base and modify it according to the user's new prompt, keeping the style and context similar unless explicitly told otherwise.";
    }

    const systemInstruction = `You are an image generation assistant for English language learners.
Your task is to generate an image based on the user's English prompt.

IMPORTANT RULES:
1. If the prompt contains parts that are NOT complete sentences (e.g., isolated words, fragments), IGNORE those parts and only use the meaningful sentences for image generation.
2. DO accept and work with prompts that have grammar mistakes or incorrect word usage - generate the image based on the intended meaning.
3. Generate a high-quality, detailed image that matches the meaningful parts of the prompt.
4. If the entire prompt consists only of isolated words with no sentence structure, still attempt to create a coherent image combining those concepts.${instructionExtras}`;

    let requestContents = prompt;
    if (previousImage && previousImage.base64 && previousImage.mimeType) {
      requestContents = [
        {
          inlineData: {
            data: previousImage.base64,
            mimeType: previousImage.mimeType,
          },
        },
        prompt
      ];
    }

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: requestContents,
        config: {
          systemInstruction: systemInstruction,
          responseModalities: ['IMAGE'],
        },
      });

      const candidate = response.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error('画像の生成に失敗しました。別のプロンプトをお試しください。');
      }

      const imagePart = candidate.content.parts.find(part => part.inlineData);
      if (!imagePart) {
        throw new Error('画像データが取得できませんでした。プロンプトを変更してお試しください。');
      }

      return {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png',
      };
    } catch (error) {
      if (error.message.includes('SAFETY')) {
        throw new Error('安全性の観点から、この内容の画像は生成できません。別のプロンプトをお試しください。');
      }
      throw error;
    }
  }
}

module.exports = new GeminiService();
