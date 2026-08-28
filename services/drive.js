class ImgBBService {
  constructor() {
    this.apiKey = null;
  }

  async initialize() {
    this.apiKey = process.env.IMGBB_API_KEY;
    if (!this.apiKey) {
      console.warn('[Storage] IMGBB_API_KEY が設定されていません。');
    } else {
      console.log('[Storage] 初期化完了 (ImgBB API モード)');
    }
  }

  /**
   * 画像ファイルをImgBBに保存する
   * @param {Buffer} fileBuffer - ファイルのバッファ
   * @param {string} fileName - ファイル名
   * @param {string} mimeType - MIMEタイプ
   * @returns {Promise<{fileId: string, webViewLink: string, webContentLink: string}>}
   */
  async uploadFile(fileBuffer, fileName, mimeType) {
    if (!this.apiKey) {
      throw new Error('ImgBB APIキーが設定されていません。.env を確認してください。');
    }

    try {
      console.log(`[Storage] ImgBBへのアップロード開始: ${fileName}`);
      
      const base64Image = fileBuffer.toString('base64');
      
      const formData = new URLSearchParams();
      formData.append('image', base64Image);
      // 拡張子を除いたファイル名を指定
      formData.append('name', fileName.split('.')[0]);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${this.apiKey}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'ImgBBアップロード失敗');
      }

      console.log(`[Storage] アップロード完了: ${result.data.url}`);

      return {
        fileId: result.data.id,
        webViewLink: result.data.url, // 直接画像のURL
        webContentLink: result.data.url,
      };
    } catch (error) {
      console.error('[Storage] アップロードエラー:', error.message);
      throw error;
    }
  }

  /**
   * 既存ファイルがある場合の上書き処理
   * ImgBBは上書きという概念がないため、単に新しくアップロードして新しいURLを返す
   */
  async replaceFile(existingLink, fileBuffer, fileName, mimeType) {
    // 古い画像はそのまま放置（ImgBB側で管理）し、新しい画像をアップロードします
    return this.uploadFile(fileBuffer, fileName, mimeType);
  }
}

module.exports = new ImgBBService();
