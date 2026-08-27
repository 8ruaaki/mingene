const { google } = require('googleapis');
const path = require('path');

class SheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = null;
    this.sheetName = 'シート1';
  }

  async initialize() {
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';

    if (!this.spreadsheetId) {
      console.warn('[Sheets] SPREADSHEET_ID が設定されていません。スプレッドシート連携は無効です。');
      return;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: path.resolve(credentialsPath),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('[Sheets] 初期化完了');
    } catch (error) {
      console.warn('[Sheets] 認証エラー:', error.message);
    }
  }

  /**
   * A列の全チーム名を取得する
   * @returns {Promise<Array<{row: number, teamName: string}>>}
   */
  async getTeams() {
    if (!this.sheets) throw new Error('Sheets API が初期化されていません。');

    const result = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A:C`,
    });

    const rows = result.data.values || [];
    return rows.map((row, index) => ({
      row: index + 1,
      teamName: row[0] || '',
      imageLink: row[1] || '',
      votes: parseInt(row[2] || '0', 10),
    }));
  }

  /**
   * チーム名をA列に追加する
   * 既に存在する場合は追加しない
   * @param {string} teamName
   * @returns {Promise<{row: number, isNew: boolean}>}
   */
  async addTeam(teamName) {
    if (!this.sheets) throw new Error('Sheets API が初期化されていません。');

    const teams = await this.getTeams();
    const existing = teams.find(
      t => t.teamName.toLowerCase() === teamName.toLowerCase()
    );

    if (existing) {
      return { row: existing.row, isNew: false };
    }

    const nextRow = teams.length + 1;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!A${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[teamName]],
      },
    });

    // C列（投票数）を0で初期化
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!C${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['0']],
      },
    });

    return { row: nextRow, isNew: true };
  }

  /**
   * B列（画像リンク）を更新する
   * @param {string} teamName
   * @param {string} imageLink
   * @returns {Promise<{hasExisting: boolean}>}
   */
  async updateImageLink(teamName, imageLink) {
    if (!this.sheets) throw new Error('Sheets API が初期化されていません。');

    const teams = await this.getTeams();
    const team = teams.find(
      t => t.teamName.toLowerCase() === teamName.toLowerCase()
    );

    if (!team) {
      throw new Error(`チーム "${teamName}" が見つかりません。`);
    }

    const hasExisting = !!team.imageLink;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!B${team.row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[imageLink]],
      },
    });

    return { hasExisting };
  }

  /**
   * C列（投票数）を +1 加算する
   * @param {string} teamName
   * @returns {Promise<{newCount: number}>}
   */
  async addVote(teamName) {
    if (!this.sheets) throw new Error('Sheets API が初期化されていません。');

    const teams = await this.getTeams();
    const team = teams.find(
      t => t.teamName.toLowerCase() === teamName.toLowerCase()
    );

    if (!team) {
      throw new Error(`チーム "${teamName}" が見つかりません。`);
    }

    const newCount = team.votes + 1;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.sheetName}!C${team.row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newCount.toString()]],
      },
    });

    return { newCount };
  }

  /**
   * 投票用：提出済み画像があるチーム一覧を取得
   * @returns {Promise<Array<{teamName: string, imageLink: string, votes: number}>>}
   */
  async getSubmissions() {
    if (!this.sheets) throw new Error('Sheets API が初期化されていません。');

    const teams = await this.getTeams();
    return teams.filter(t => t.imageLink).map(t => ({
      teamName: t.teamName,
      imageLink: t.imageLink,
      votes: t.votes,
    }));
  }

  /**
   * 特定チームの既存画像リンクを取得
   * @param {string} teamName
   * @returns {Promise<string|null>}
   */
  async getExistingImageLink(teamName) {
    if (!this.sheets) throw new Error('Sheets API が初期化されていません。');

    const teams = await this.getTeams();
    const team = teams.find(
      t => t.teamName.toLowerCase() === teamName.toLowerCase()
    );

    return team?.imageLink || null;
  }
}

module.exports = new SheetsService();
