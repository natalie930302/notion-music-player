import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function parseLyrics(text) {
  if (!text) return []
  const trimmed = text.trim()
  if (/\d{2}:\d{2}:\d{2}[,.]\d+\s*-->/.test(trimmed)) {
    return trimmed.split(/\n\s*\n/)
      .map(block => {
        const lines = block.trim().split('\n')
        const timeLine = lines.find(l => l.includes('-->'))
        if (!timeLine) return null
        const startStr = timeLine.split('-->')[0].trim()
        const m = startStr.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d+)/)
        if (!m) return null
        const time = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 1000
        const lyricLines = lines.filter(l => l.trim() && !/^\d+$/.test(l.trim()) && !l.includes('-->'))
        const lyricText = lyricLines.join(' ').trim()
        return lyricText ? { time, text: lyricText } : null
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time)
  }
  return trimmed.split('\n')
    .map(line => {
      const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)/)
      if (!match) return null
      return { time: parseInt(match[1]) * 60 + parseFloat(match[2]), text: match[3].trim() }
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'notion-api-dev',
        configureServer(server) {
          server.middlewares.use('/api/get-songs', async (req, res) => {
            const NOTION_TOKEN = env.NOTION_TOKEN
            const DATABASE_ID = env.NOTION_DATABASE_ID

            res.setHeader('Content-Type', 'application/json')

            try {
              if (!NOTION_TOKEN || !DATABASE_ID) {
                throw new Error('環境變數缺失，請確認 .env 有 NOTION_TOKEN 和 NOTION_DATABASE_ID')
              }

              const notionRes = await fetch(
                `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${NOTION_TOKEN}`,
                    'Notion-Version': '2022-06-28',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({}),
                }
              )

              const data = await notionRes.json()

              if (!notionRes.ok) {
                throw new Error(data.message || 'Notion API 請求失敗')
              }

              const songs = await Promise.all(
                data.results.map(async (page) => {
                  const props = page.properties
                  const mp3File = props.File?.files?.[0]
                  const coverFile = props.Cover?.files?.[0]

                  let artistName = '未知歌手'
                  if (props.Artist?.multi_select?.length) {
                    artistName = props.Artist.multi_select.map((a) => a.name).join(', ')
                  } else if (props.Artist?.select) {
                    artistName = props.Artist.select.name
                  }

                  let lyrics = []
                  const lyricsFile = props.Lyrics?.files?.[0]
                  const lyricsUrl = lyricsFile?.file?.url || lyricsFile?.external?.url || ''
                  if (lyricsUrl) {
                    try {
                      const srtRes = await fetch(lyricsUrl)
                      const srtText = await srtRes.text()
                      lyrics = parseLyrics(srtText)
                    } catch (e) {}
                  }

                  return {
                    id: page.id,
                    title: props.Name?.title[0]?.plain_text || '未命名歌曲',
                    artist: artistName,
                    mp3Url: mp3File?.file?.url || mp3File?.external?.url || '',
                    coverUrl: coverFile?.file?.url || coverFile?.external?.url || '',
                    lyrics,
                  }
                })
              )

              res.end(JSON.stringify(songs.filter((s) => s.mp3Url)))
            } catch (error) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: error.message }))
            }
          })
        },
      },
    ],
  }
})