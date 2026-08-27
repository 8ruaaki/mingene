/**
 * MinGene - 投票モード
 * 画面①: 提出画像一覧表示 → ラジオボタン選択 → 投票
 */

const Vote = (() => {
  let selectedTeam = null;

  function init() {
    // 投票ボタン
    document.getElementById('btn-vote').addEventListener('click', handleVote);


    // リロードボタン
    const reloadBtn = document.getElementById('btn-reload-votes');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        loadSubmissions();
      });
    }
  }

  /**
   * 提出済み画像一覧を取得して表示
   */
  async function loadSubmissions() {
    const loadingEl = document.getElementById('vote-loading');
    const emptyEl = document.getElementById('vote-empty');
    const formEl = document.getElementById('vote-form');
    const voteBtnEl = document.getElementById('btn-vote');

    // リセット
    loadingEl.style.display = 'flex';
    emptyEl.style.display = 'none';
    formEl.style.display = 'none';
    formEl.innerHTML = '';
    voteBtnEl.disabled = true;
    selectedTeam = null;

    try {
      const data = await App.apiRequest('/api/submissions');
      const submissions = data.submissions || [];

      loadingEl.style.display = 'none';

      if (submissions.length === 0) {
        emptyEl.style.display = 'block';
        return;
      }

      // カードを生成
      submissions.forEach((sub, index) => {
        const card = document.createElement('label');
        card.className = 'vote-card';
        card.setAttribute('for', `vote-radio-${index}`);

        // Google Drive のリンクからサムネイルURLを生成
        const imageUrl = convertDriveLink(sub.imageLink);

        card.innerHTML = `
          <input type="radio" name="vote-selection" id="vote-radio-${index}"
                 class="vote-radio" value="${escapeHtml(sub.teamName)}">
          <img class="vote-card-image" src="${imageUrl}" alt="${escapeHtml(sub.teamName)}の提出画像"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23111827%22 width=%22400%22 height=%22300%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%2364748b%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2216%22>画像を読み込めません</text></svg>'">
          <div class="vote-card-info">
            <span class="vote-card-team">${escapeHtml(sub.teamName)}</span>
            <span class="vote-card-votes">${sub.votes} 票</span>
          </div>
        `;

        // ラジオボタンの選択イベント
        const radio = card.querySelector('input[type="radio"]');
        radio.addEventListener('change', () => {
          selectedTeam = sub.teamName;
          voteBtnEl.disabled = false;

          // カードの選択状態を更新
          document.querySelectorAll('.vote-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        });

        formEl.appendChild(card);
      });

      formEl.style.display = 'grid';
    } catch (error) {
      loadingEl.style.display = 'none';
      App.showToast(error.message, 'error');
    }
  }

  /**
   * 投票を実行
   */
  async function handleVote() {
    if (!selectedTeam) {
      App.showToast('投票する画像を選択してください。', 'warning');
      return;
    }

    const voteBtn = document.getElementById('btn-vote');
    voteBtn.disabled = true;

    try {
      const result = await App.apiRequest('/api/vote', {
        method: 'POST',
        body: JSON.stringify({ teamName: selectedTeam }),
      });

      App.showToast(
        `「${selectedTeam}」に投票しました！`,
        'success'
      );

      // アラート表示
      await App.showAlertDialog(
        '投票完了！',
        `「${selectedTeam}」への投票が完了しました！\n（現在 ${result.newCount} 票）`,
        '🎉'
      );

      // 画面をリロード
      await loadSubmissions();
    } catch (error) {
      App.showToast(error.message, 'error');
      voteBtn.disabled = false;
    }
  }

  /**
   * Google DriveリンクをプレビューURLに変換
   * @param {string} link - Google Drive の webViewLink
   * @returns {string} 直接表示可能なURL
   */
  function convertDriveLink(link) {
    if (!link) return '';

    // /file/d/{id}/view → /uc?export=view&id={id}
    const match = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    // id= パラメータ
    const match2 = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) {
      return `https://drive.google.com/uc?export=view&id=${match2[1]}`;
    }

    return link;
  }

  /**
   * HTMLエスケープ
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, loadSubmissions };
})();
