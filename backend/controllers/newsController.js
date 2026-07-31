// ニュースコントローラー
// MLB公式RSSフィード（無料・認証不要）をバックエンドで取得・パースして返す。
// フロントが直接XMLを扱わなくて済むよう、JSONに整形して返す。

const { fetchMlbResponse } = require("../services/mlb/mlbClient");

const MLB_RSS_URL = "https://www.mlb.com/feeds/news/rss.xml";

/**
 * RSSのXMLをパースして記事リストに変換する（軽量正規表現ベース）
 * xmlパーサーライブラリなしで実装するため、シンプルな正規表現を使用。
 */
const parseRssItems = (xml, limit = 20) => {
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return itemMatches.slice(0, limit).map((item) => {
    const get = (tag) => {
      const cdataMatch = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[(.*?)\\]\\]>`, "s"));
      if (cdataMatch) return cdataMatch[1].trim();
      const plainMatch = item.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`));
      return plainMatch ? plainMatch[1].trim() : "";
    };
    const imgMatch = item.match(/<image[^>]+href="([^"]+)"/);
    const pubDate = get("pubDate");
    return {
      title:   get("title"),
      link:    get("link"),
      author:  get("dc:creator"),
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      image:   imgMatch ? imgMatch[1] : null,
    };
  });
};

/**
 * GET /api/news?limit=20
 * MLB全般ニュースを返す
 */
const getNews = async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  try {
    const response = await fetchMlbResponse(MLB_RSS_URL);
    if (!response.ok) return res.status(502).json({ message: "Failed to fetch MLB news." });
    const xml = await response.text();
    const items = parseRssItems(xml, limit);
    return res.json({ items });
  } catch (error) {
    console.error("News error:", error.message);
    return res.status(500).json({ message: "Failed to fetch news." });
  }
};

/**
 * GET /api/news/team/:teamId?limit=10
 * チーム関連ニュース（RSSからチーム名でフィルタ）
 * MLB公式にチーム別フィルタはないため、タイトルと著者でキーワード絞り込みする。
 */
const getTeamNews = async (req, res) => {
  const { teamId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 10, 30);

  // teamId→チーム名の簡易マップ（フィルタ用）
  const TEAM_KEYWORDS = {
    108:"Angels",109:"Diamondbacks",110:"Orioles",111:"Red Sox",
    112:"Cubs",113:"Reds",114:"Guardians",115:"Rockies",116:"Tigers",
    117:"Astros",118:"Royals",119:"Dodgers",120:"Nationals",121:"Mets",
    133:"Athletics",134:"Pirates",135:"Padres",136:"Mariners",137:"Giants",
    138:"Cardinals",139:"Rays",140:"Rangers",141:"Blue Jays",142:"Twins",
    143:"Phillies",144:"Braves",145:"White Sox",146:"Marlins",147:"Yankees",158:"Brewers",
  };
  const keyword = TEAM_KEYWORDS[Number(teamId)];

  try {
    const response = await fetchMlbResponse(MLB_RSS_URL);
    if (!response.ok) return res.status(502).json({ message: "Failed to fetch news." });
    const xml = await response.text();
    const all = parseRssItems(xml, 50);
    const filtered = keyword
      ? all.filter((item) => item.title.includes(keyword) || item.author?.includes(keyword))
      : all;
    return res.json({ teamId: Number(teamId), items: filtered.slice(0, limit) });
  } catch (error) {
    console.error("Team news error:", error.message);
    return res.status(500).json({ message: "Failed to fetch team news." });
  }
};

module.exports = { getNews, getTeamNews };
