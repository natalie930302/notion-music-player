// api/get-songs.js

function parseLyrics(text) {
  if (!text) return [];
  const trimmed = text.trim();

  // SRT format: blocks separated by blank lines, timestamps like 00:00:14,000 --> ...
  if (/\d{2}:\d{2}:\d{2}[,.]\d+\s*-->/.test(trimmed)) {
    return trimmed.split(/\n\s*\n/)
      .map(block => {
        const lines = block.trim().split('\n');
        const timeLine = lines.find(l => l.includes('-->'));
        if (!timeLine) return null;
        const startStr = timeLine.split('-->')[0].trim();
        const m = startStr.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d+)/);
        if (!m) return null;
        const time = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 1000;
        const lyricLines = lines.filter(l => l.trim() && !/^\d+$/.test(l.trim()) && !l.includes('-->'));
        const lyricText = lyricLines.join(' ').trim();
        return lyricText ? { time, text: lyricText } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);
  }

  // LRC format: [0:14.32] lyric text
  return trimmed.split('\n')
    .map(line => {
      const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)/);
      if (!match) return null;
      return { time: parseInt(match[1]) * 60 + parseFloat(match[2]), text: match[3].trim() };
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

export default async function handler(req, res) {
  // 設定跨網域 Header
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.NOTION_DATABASE_ID;

  try {
    if (!NOTION_TOKEN || !DATABASE_ID) {
      throw new Error("環境變數缺失，請檢查 Vercel 或 .env 設定");
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), 
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Notion API 請求失敗");
    }

    // 解析資料，過濾掉沒有 mp3 的歌曲
    const songs = await Promise.all(
      data.results.map(async (page) => {
        const props = page.properties;
        const mp3File = props.File?.files?.[0];
        const coverFile = props.Cover?.files?.[0];

        let artistName = "未知歌手";
        if (props.Artist?.multi_select?.length) {
          artistName = props.Artist.multi_select.map((a) => a.name).join(", ");
        } else if (props.Artist?.select) {
          artistName = props.Artist.select.name;
        }

        // Lyrics 是 Files & media 欄位，下載 .srt 檔內容來解析
        let lyrics = [];
        const lyricsFile = props.Lyrics?.files?.[0];
        const lyricsUrl = lyricsFile?.file?.url || lyricsFile?.external?.url || '';
        if (lyricsUrl) {
          try {
            const srtRes = await fetch(lyricsUrl);
            const srtText = await srtRes.text();
            lyrics = parseLyrics(srtText);
          } catch (e) {
            // 沒有歌詞就跳過
          }
        }

        return {
          id: page.id,
          title: props.Name?.title[0]?.plain_text || "未命名歌曲",
          artist: artistName,
          mp3Url: mp3File?.file?.url || mp3File?.external?.url || "",
          coverUrl: coverFile?.file?.url || coverFile?.external?.url || "",
          lyrics,
        };
      })
    );

    const filteredSongs = songs.filter((song) => song.mp3Url);

    return res.status(200).json(filteredSongs);
  } catch (error) {
    console.error("後端錯誤:", error.message);
    return res.status(500).json({ error: error.message });
  }
}