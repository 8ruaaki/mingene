/**
 * MinGene - 提出モード
 * 画面①: チーム名入力 → 画面②: 画像アップロード
 */

const Submit = (() => {
  let teamName = '';
  let selectedFile = null;

  function init() {
    // 画面① - 次へボタン
    document.getElementById('sub-next-1').addEventListener('click', handleTeamSubmit);
    document.getElementById('sub-team-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleTeamSubmit();
    });

    // 画面② - ドロップゾーン
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input');

    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // ファイル選択ボタン
    document.getElementById('btn-file-select').addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', e => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    // ファイル削除ボタン
    document.getElementById('btn-remove-file').addEventListener('click', removeFile);

    // アップロードボタン
    document.getElementById('btn-upload').addEventListener('click', handleUpload);

    // ホームに戻る
    document.getElementById('sub-home').addEventListener('click', () => {
      resetState();
      App.goHome();
    });
  }

  /**
   * 画面① - チーム名を確認・登録して画面②へ
   */
  async function handleTeamSubmit() {
    const input = document.getElementById('sub-team-name');
    const name = input.value.trim();

    if (!name) {
      App.showToast('チーム名を入力してください。', 'warning');
      input.focus();
      return;
    }

    try {
      // チーム名をスプレッドシートに登録（既存の場合はスキップ）
      const result = await App.apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ teamName: name }),
      });

      teamName = name;

      if (result.isNew) {
        App.showToast(`チーム「${name}」を新規登録しました。`, 'success');
      } else {
        App.showToast(`チーム「${name}」で画像を提出します。`, 'info');
      }

      // チーム名を画面②に表示
      document.getElementById('sub-team-display').textContent = `チーム: ${name}`;

      App.showScreen('submit-screen2');
    } catch (error) {
      App.showToast(error.message, 'error');
    }
  }

  /**
   * ファイル選択時の処理
   * @param {File} file
   */
  function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
      App.showToast('画像ファイルのみアップロードできます。', 'warning');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      App.showToast('ファイルサイズは10MB以下にしてください。', 'warning');
      return;
    }

    selectedFile = file;

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('upload-preview-img').src = e.target.result;
      document.getElementById('dropzone-content').style.display = 'none';
      document.getElementById('dropzone-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);

    // アップロードボタンを有効化
    document.getElementById('btn-upload').disabled = false;
  }

  /**
   * ファイルを削除してUIをリセット
   */
  function removeFile() {
    selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('dropzone-content').style.display = 'flex';
    document.getElementById('dropzone-preview').style.display = 'none';
    document.getElementById('btn-upload').disabled = true;
  }

  /**
   * 画像をアップロード
   */
  async function handleUpload() {
    if (!selectedFile || !teamName) return;

    const uploadBtn = document.getElementById('btn-upload');
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="btn-icon">⏳</span> アップロード中...';

    try {
      // まず上書き確認チェック（overwrite なしでリクエスト）
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('teamName', teamName);

      const response = await fetch('/api/submit', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.needsConfirmation) {
        // 上書き確認ダイアログを表示
        const confirmed = await App.showConfirmDialog(
          '上書き確認',
          'このチームには既に画像が提出されています。上書きしてもよろしいですか？'
        );

        if (confirmed) {
          // 上書きで再送信
          const formData2 = new FormData();
          formData2.append('file', selectedFile);
          formData2.append('teamName', teamName);
          formData2.append('overwrite', 'true');

          const response2 = await fetch('/api/submit', {
            method: 'POST',
            body: formData2,
          });

          const result2 = await response2.json();
          if (result2.success) {
            App.showToast(result2.message, 'success');
            removeFile();
          } else {
            throw new Error(result2.error || 'アップロードに失敗しました。');
          }
        } else {
          App.showToast('アップロードをキャンセルしました。', 'info');
        }
      } else if (result.success) {
        App.showToast(result.message, 'success');
        removeFile();
      } else {
        throw new Error(result.error || 'アップロードに失敗しました。');
      }
    } catch (error) {
      App.showToast(error.message, 'error');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '<span class="btn-icon">📤</span> アップロード';
    }
  }

  /**
   * 状態をリセット
   */
  function resetState() {
    teamName = '';
    selectedFile = null;
    document.getElementById('sub-team-name').value = '';
    removeFile();
  }

  return { init };
})();
