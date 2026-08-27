require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const geminiService = require('./services/gemini');
const sheetsService = require('./services/sheets');
const driveService = require('./services/drive');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer設定（メモリストレージ）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB上限
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です。'));
    }
  },
});

// ミドルウェア
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== API エンドポイント =====

/**
 * POST /api/teams - チーム名を登録
 * body: { teamName: string }
 */
app.post('/api/teams', async (req, res) => {
  try {
    const { teamName } = req.body;
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: 'チーム名を入力してください。' });
    }
    const result = await sheetsService.addTeam(teamName.trim());
    res.json({
      success: true,
      teamName: teamName.trim(),
      row: result.row,
      isNew: result.isNew,
    });
  } catch (error) {
    console.error('[API] チーム登録エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teams - 全チーム一覧を取得
 */
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await sheetsService.getTeams();
    res.json({ success: true, teams });
  } catch (error) {
    console.error('[API] チーム取得エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate - Gemini APIで画像を生成
 * body: { prompt: string }
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, teamName, previousImage } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'プロンプトを入力してください。' });
    }
    const result = await geminiService.generateImage(prompt.trim(), previousImage);

    if (teamName) {
      try {
        await sheetsService.addPrompt(teamName.trim(), prompt.trim());
      } catch (err) {
        console.error('[API] プロンプト保存エラー:', err);
      }
    }

    res.json({
      success: true,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
    });
  } catch (error) {
    console.error('[API] 画像生成エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/submit - 画像をGoogleドライブにアップロード
 * multipart: file (画像ファイル), teamName (チーム名)
 */
app.post('/api/submit', upload.single('file'), async (req, res) => {
  try {
    const { teamName, overwrite } = req.body;
    const file = req.file;

    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: 'チーム名を入力してください。' });
    }
    if (!file) {
      return res.status(400).json({ error: '画像ファイルを選択してください。' });
    }

    // 既存画像の確認
    const existingLink = await sheetsService.getExistingImageLink(teamName.trim());

    if (existingLink && overwrite !== 'true') {
      return res.json({
        success: false,
        needsConfirmation: true,
        message: 'このチームには既に画像が提出されています。上書きしますか？',
      });
    }

    let uploadResult;
    const fileName = `${teamName.trim()}_${Date.now()}.${file.mimetype.split('/')[1]}`;

    if (existingLink) {
      // 上書き
      uploadResult = await driveService.replaceFile(
        existingLink, file.buffer, fileName, file.mimetype
      );
    } else {
      // 新規アップロード
      uploadResult = await driveService.uploadFile(
        file.buffer, fileName, file.mimetype
      );
    }

    // スプレッドシートB列を更新
    await sheetsService.updateImageLink(teamName.trim(), uploadResult.webViewLink);

    res.json({
      success: true,
      link: uploadResult.webViewLink,
      message: existingLink ? '画像を上書きしました。' : '画像をアップロードしました。',
    });
  } catch (error) {
    console.error('[API] 画像提出エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/submissions - 提出済み画像一覧を取得（投票用）
 */
app.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await sheetsService.getSubmissions();
    res.json({ success: true, submissions });
  } catch (error) {
    console.error('[API] 提出画像取得エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/vote - 投票（C列を+1）
 * body: { teamName: string }
 */
app.post('/api/vote', async (req, res) => {
  try {
    const { teamName } = req.body;
    if (!teamName || !teamName.trim()) {
      return res.status(400).json({ error: 'チーム名を指定してください。' });
    }
    const result = await sheetsService.addVote(teamName.trim());
    res.json({
      success: true,
      teamName: teamName.trim(),
      newCount: result.newCount,
    });
  } catch (error) {
    console.error('[API] 投票エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/check-submission - 既存画像の有無を確認
 * body: { teamName: string }
 */
app.post('/api/check-submission', async (req, res) => {
  try {
    const { teamName } = req.body;
    const existingLink = await sheetsService.getExistingImageLink(teamName.trim());
    res.json({
      success: true,
      hasExisting: !!existingLink,
    });
  } catch (error) {
    console.error('[API] 提出確認エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// SPA フォールバック
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('[Server] エラー:', err);
  res.status(500).json({ error: err.message || 'サーバーエラーが発生しました。' });
});

// サーバー起動
async function startServer() {
  // サービス初期化
  geminiService.initialize();
  await sheetsService.initialize();
  await driveService.initialize();

  app.listen(PORT, () => {
    console.log(`\n🚀 MinGene サーバー起動: http://localhost:${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error('サーバー起動エラー:', err);
  process.exit(1);
});
