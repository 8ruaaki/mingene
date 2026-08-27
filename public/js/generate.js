/**
 * MinGene - 生成モード
 * 画面①: チーム名入力 → 画面②: 画像生成 → 画面③: ダウンロード
 */

const Generate = (() => {
  let teamName = '';
  let generatedImageData = null; // { base64, mimeType }

  function init() {
    // 画面① - 次へボタン
    document.getElementById('gen-next-1').addEventListener('click', handleTeamSubmit);
    document.getElementById('gen-team-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleTeamSubmit();
    });

    // 画面② - 画像切り替え
    document.getElementById('ref-img-btn1').addEventListener('click', () => switchRefImage(1));
    document.getElementById('ref-img-btn2').addEventListener('click', () => switchRefImage(2));

    // 画面② - 生成ボタン
    document.getElementById('btn-generate').addEventListener('click', handleGenerate);
    document.getElementById('prompt-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleGenerate();
    });

    // 画面② - 次へボタン
    document.getElementById('gen-next-2').addEventListener('click', handleGoToDownload);

    // 画面③ - ダウンロードボタン
    document.getElementById('btn-download').addEventListener('click', handleDownload);

    // 画面③ - ホームに戻る
    document.getElementById('gen-home').addEventListener('click', () => {
      resetState();
      App.goHome();
    });
  }

  /**
   * 画面① - チーム名を登録して画面②へ遷移
   */
  async function handleTeamSubmit() {
    const input = document.getElementById('gen-team-name');
    const name = input.value.trim();

    if (!name) {
      App.showToast('チーム名を入力してください。', 'warning');
      input.focus();
      return;
    }

    try {
      await App.apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ teamName: name }),
      });

      teamName = name;
      App.showToast(`チーム「${name}」を登録しました。`, 'success');
      App.showScreen('generate-screen2');
    } catch (error) {
      App.showToast(error.message, 'error');
    }
  }

  /**
   * 指定画像を切り替える
   * @param {number} num - 1 or 2
   */
  function switchRefImage(num) {
    document.getElementById('ref-img-btn1').classList.toggle('active', num === 1);
    document.getElementById('ref-img-btn2').classList.toggle('active', num === 2);
    document.getElementById('reference-image').src = `/images/reference${num}.png`;
  }

  /**
   * 画面② - Gemini APIで画像を生成
   */
  async function handleGenerate() {
    const input = document.getElementById('prompt-input');
    const prompt = input.value.trim();

    if (!prompt) {
      App.showToast('英語のプロンプトを入力してください。', 'warning');
      input.focus();
      return;
    }

    // UIフィードバック
    const generateBtn = document.getElementById('btn-generate');
    const spinner = document.getElementById('generating-spinner');
    const placeholder = document.getElementById('generated-placeholder');
    const generatedImg = document.getElementById('generated-image');

    generateBtn.disabled = true;
    spinner.style.display = 'flex';
    placeholder.style.display = 'none';

    try {
      const result = await App.apiRequest('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });

      // 生成結果を表示
      generatedImageData = {
        base64: result.imageBase64,
        mimeType: result.mimeType,
      };

      const src = `data:${result.mimeType};base64,${result.imageBase64}`;
      generatedImg.src = src;
      generatedImg.style.display = 'block';

      App.showToast('画像を生成しました！', 'success');
    } catch (error) {
      App.showToast(error.message, 'error');
      placeholder.style.display = 'flex';
    } finally {
      generateBtn.disabled = false;
      spinner.style.display = 'none';
    }
  }

  /**
   * 画面② → 画面③ へ遷移
   */
  function handleGoToDownload() {
    if (!generatedImageData) {
      App.showToast('まず画像を生成してください。', 'warning');
      return;
    }

    // ダウンロードプレビューに画像をセット
    const previewImg = document.getElementById('download-preview-img');
    previewImg.src = `data:${generatedImageData.mimeType};base64,${generatedImageData.base64}`;

    App.showScreen('generate-screen3');
  }

  /**
   * 画面③ - 画像をダウンロード
   */
  function handleDownload() {
    if (!generatedImageData) return;

    const ext = generatedImageData.mimeType.split('/')[1] || 'png';
    const fileName = `${teamName}_generated.${ext}`;

    // Base64 → Blob → Download
    const byteCharacters = atob(generatedImageData.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: generatedImageData.mimeType });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    App.showToast('画像をダウンロードしました。', 'success');
  }

  /**
   * 状態をリセット
   */
  function resetState() {
    teamName = '';
    generatedImageData = null;
    document.getElementById('gen-team-name').value = '';
    document.getElementById('prompt-input').value = '';
    document.getElementById('generated-image').src = '';
    document.getElementById('generated-image').style.display = 'none';
    document.getElementById('generated-placeholder').style.display = 'flex';
  }

  return { init };
})();
