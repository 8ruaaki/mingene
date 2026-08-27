/**
 * MinGene - メインアプリケーション
 * 画面遷移管理、モード切替、共通ユーティリティ
 */

const App = (() => {
  // 現在のモードと画面を管理
  let currentMode = 'generate';
  let currentScreen = 'generate-screen1';

  /**
   * 初期化
   */
  function init() {
    // モード切替ボタンのイベント設定
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        switchMode(mode);
      });
    });
  }

  /**
   * モードを切り替える
   * @param {string} mode - 'generate' | 'submit' | 'vote'
   */
  function switchMode(mode) {
    currentMode = mode;

    // ボタンのアクティブ状態を更新
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // 各モードの最初の画面を表示
    const firstScreenMap = {
      generate: 'generate-screen1',
      submit: 'submit-screen1',
      vote: 'vote-screen1',
    };

    showScreen(firstScreenMap[mode]);

    // 投票モードの場合は画像一覧をロード
    if (mode === 'vote') {
      Vote.loadSubmissions();
    }
  }

  /**
   * 画面を切り替える
   * @param {string} screenId - 表示する画面のID
   */
  function showScreen(screenId) {
    // 全画面を非表示にする
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // 対象画面を表示
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      currentScreen = screenId;
    }
  }

  /**
   * ホーム画面（現在のモードの最初の画面）に戻る
   */
  function goHome() {
    switchMode(currentMode);
  }

  /**
   * トースト通知を表示する
   * @param {string} message - メッセージ
   * @param {'success'|'error'|'warning'|'info'} type - 通知タイプ
   * @param {number} duration - 表示時間（ms）
   */
  function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);

    // 自動削除
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * 確認ダイアログを表示する
   * @param {string} title - ダイアログタイトル
   * @param {string} message - 確認メッセージ
   * @returns {Promise<boolean>} ユーザーの選択
   */
  function showConfirmDialog(title, message) {
    return new Promise(resolve => {
      const dialog = document.getElementById('confirm-dialog');
      document.getElementById('dialog-title').textContent = title;
      document.getElementById('dialog-message').textContent = message;
      dialog.style.display = 'flex';

      const confirmBtn = document.getElementById('dialog-confirm');
      const cancelBtn = document.getElementById('dialog-cancel');

      const cleanup = () => {
        dialog.style.display = 'none';
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
      };

      const onConfirm = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
    });
  }

  /**
   * アラートダイアログを表示する
   * @param {string} title
   * @param {string} message
   * @param {string} icon
   * @returns {Promise<void>}
   */
  function showAlertDialog(title, message, icon = '✅') {
    return new Promise(resolve => {
      const dialog = document.getElementById('alert-dialog');
      document.getElementById('alert-title').textContent = title;
      document.getElementById('alert-message').textContent = message;
      document.getElementById('alert-icon').textContent = icon;
      dialog.style.display = 'flex';

      const okBtn = document.getElementById('alert-ok');

      const cleanup = () => {
        dialog.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
      };

      const onOk = () => { cleanup(); resolve(); };
      okBtn.addEventListener('click', onOk);
    });
  }

  /**
   * API リクエストヘルパー
   * @param {string} url
   * @param {object} options
   * @returns {Promise<object>}
   */
  async function apiRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('サーバーに接続できません。');
      }
      throw error;
    }
  }

  // DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    init();
    Generate.init();
    Submit.init();
    Vote.init();
  });

  return {
    switchMode,
    showScreen,
    goHome,
    showToast,
    showConfirmDialog,
    showAlertDialog,
    apiRequest,
  };
})();
