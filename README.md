# MY-PLAYER

串接 Notion 資料庫的音樂播放器網站,含歌詞同步顯示功能,部署於 Vercel。

## 運作方式

- `api/get-songs.js` — Vercel Serverless Function,從 Notion 資料庫讀取歌曲清單(標題、音檔連結、歌詞檔),並解析 SRT 格式歌詞為時間軸資料
- `src/App.jsx` — 播放器主介面,播放音樂並同步顯示歌詞

## 技術棧

React + Vite + Notion API(`@notionhq/client`)+ Framer Motion(動畫)+ Tailwind CSS,部署在 Vercel。

## 環境設定

需在 `.env` 設定 Notion API 金鑰與資料庫 ID(參考 `.env` 範例欄位)。

```bash
npm install
npm run dev
```
