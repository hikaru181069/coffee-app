import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PlayerCard from "../components/PlayerCard";
import PageHeader from "../components/PageHeader";
import { getPlayersByArchetype } from "../services/api/archetypeApi";

// "power-hitter" → "Power Hitter"
const slugToTitle = (slug) =>
  slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

// slugToTitle だけでは正しく表示できないタイトルの上書き("future-mvp" → "Future Mvp" になってしまう等)
const TITLE_OVERRIDES = {
  "power-hitter":      "Power Hitters",
  "speedster":         "Speed Demons",
  "elite-defender":    "Elite Defenders",
  "future-mvp":        "Future MVP",
  "japanese-players":  "Japanese Players",
};

// アーキタイプごとの説明文
const ARCHETYPE_DESCRIPTIONS = {
  "Five-Tool Threat": "Power, speed, and contact — these players do it all.",
  "Power Hitter":     "Elite home run production and slugging ability.",
  "Power Hitters":    "Elite home run production and slugging ability.",
  "Speedster":        "Elite stolen base ability and speed on the bases.",
  "Speed Demons":     "Elite stolen base ability and speed on the bases.",
  "Contact Hitter":   "High batting average with consistent contact.",
  "Elite Defender":   "Elite Outs Above Average — the best gloves in the league.",
  "Elite Defenders":  "Elite Outs Above Average — the best gloves in the league.",
  "All-Around":       "Balanced contributors across all offensive categories.",
  "Ace":              "Elite ERA and strikeout ability — the staff cornerstone.",
  "Power Pitcher":    "High strikeout rates with overpowering stuff.",
  "Control Artist":   "Exceptional command with minimal walks.",
  "Workhorse":        "Durable innings-eaters who take the ball every five days.",
  "Future MVP":       "Age 24 or younger, already producing elite numbers in the majors.",
  "Japanese Players": "MLB players born in Japan.",
};

function ArchetypePage() {
  const { type } = useParams();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const title = TITLE_OVERRIDES[type] || slugToTitle(type);
  const description = ARCHETYPE_DESCRIPTIONS[title] || "";

  useEffect(() => {
    setLoading(true);
    getPlayersByArchetype(type)
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <div className="app-screen">
      <PageHeader
        title={title}
        subtitle={description}
        kicker={!loading ? `${players.length} players` : ""}
        backTo="/"
        backLabel="Home"
      />

      <div className="screen-body px-6 py-6 w-full">
        {loading ? (
          <div className="player-list arch-player-list">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="player-card animate-pulse">
                <div className="rounded-lg bg-ctp-surface1" style={{ height: "200px" }} />
              </div>
            ))}
          </div>
        ) : players.length > 0 ? (
          <div className="player-list arch-player-list">
            {players.map((p) => (
              <PlayerCard key={p.mlbPlayerId} player={p} />
            ))}
          </div>
        ) : (
          <div className="home-empty-state">
            <img
              src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg"
              alt=""
              width={36}
              height={36}
              style={{ opacity: 0.5 }}
            />
            <p className="empty-state-title">No players found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchetypePage;
