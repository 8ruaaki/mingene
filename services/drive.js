const fs = require('fs');
const path = require('path');

class DriveService {
  constructor() {
    this.uploadsDir = null;
    this.baseUrl = null;
  }

  async initialize() {
    // ローカルのuploadsディレクトリを使用
    this.uploadsDir = path.join(__dirname, '..', 'uploads');
    this.baseUrl = '/uploads';

    // uploadsディレクトリが存在しなければ作成
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }

    console.log('[Drive] 初期化完了（ローカルストレージモード）');
  }

  /**
   * 画像ファイルをローカルに保存する
   * @param {Buffer} fileBuffer - ファイルのバッファ
   * @param {string} fileName - ファイル名
   * @param {string} mimeType - MIMEタイプ
   * @returns {Promise<{fileId: string, webViewLink: string, webContentLink: string}>}
   */
  async uploadFile(fileBuffer, fileName, mimeType) {
    if (!this.uploadsDir) {
      throw new Error('Drive サービスが初期化されていません。');
    }

    // ファイル名をサニタイズ
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.\-\u3000-\u9FFF]/g, '_');
    const filePath = path.join(this.uploadsDir, safeFileName);

    // ファイルを保存
    fs.writeFileSync(filePath, fileBuffer);
    console.log(`[Drive] ファイル保存: ${safeFileName}`);

    const webViewLink = `${this.baseUrl}/${safeFileName}`;

    return {
      fileId: safeFileName,
      webViewLink: webViewLink,
      webContentLink: webViewLink,
    };
  }

  /**
   * 既存ファイルを削除して新しいファイルで置き換える（上書き）
   * @param {string} existingLink - 既存ファイルのリンク
   * @param {Buffer} fileBuffer - 新しいファイルのバッファ
   * @param {string} fileName - ファイル名
   * @param {string} mimeType - MIMEタイプ
   * @returns {Promise<{fileId: string, webViewLink: string, webContentLink: string}>}
   */
  async replaceFile(existingLink, fileBuffer, fileName, mimeType) {
    if (!this.uploadsDir) {
      throw new Error('Drive サービスが初期化されていません。');
    }

    // 既存ファイルを削除
    const existingFileName = this.extractFileId(existingLink);
    if (existingFileName) {
      const existingPath = path.join(this.uploadsDir, existingFileName);
      try {
        if (fs.existsSync(existingPath)) {
          fs.unlinkSync(existingPath);
          console.log(`[Drive] 既存ファイル削除: ${existingFileName}`);
        }
      } catch (error) {
        console.warn(`[Drive] 既存ファイル削除失敗: ${error.message}`);
      }
    }

    // 新しいファイルをアップロード
    return this.uploadFile(fileBuffer, fileName, mimeType);
  }

  /**
   * ローカルURLからファイル名を抽出する
   * @param {string} link
   * @returns {string|null}
   */
  extractFileId(link) {
    if (!link) return null;
    // ローカルURL: /uploads/filename
    const match = link.match(/\/uploads\/(.+)$/);
    if (match) return decodeURIComponent(match[1]);

    // Google Drive リンク（旧データ互換）
    const driveMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                       link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return driveMatch ? driveMatch[1] : null;
  }
}

module.exports = new DriveService();
