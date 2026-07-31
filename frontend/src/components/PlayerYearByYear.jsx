// 選手の年度別成績テーブル
// 打者・投手で表示する指標を変える。データが無ければ何も表示しない。

import { useEffect, useState } from "react";
import { getPlayerYearByYear } from "../services/api/playerStatsApi";

// 表示する列（打者 / 投手）
const HITTER_COLS = [
  { key: "gamesPlayed",    label: "G"   },
  { key: "avg",            label: "AVG" },
  { key: "homeRuns",       label: "HR"  },
  { key: "rbi",            label: "RBI" },
  { key: "ops",            label: "OPS" },
];
const PITCHER_COLS = [
  { key: "gamesPlayed",   label: "G"   },
  { key: "wins",          label: "W"   },
  { key: "losses",        label: "L"   },
  { key: "era",           label: "ERA" },
  { key: "strikeOuts",    label: "SO"  },
];

function PlayerYearByYear({ playerId, playerType }) {
  const [data, setData] = useState({ hitting: [], pitching: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getPlayerYearByYear(playerId);
        if (active) setData(result);
      } catch {
        if (active) setData({ hitting: [], pitching: [] });
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [playerId]);

  // 投手なら投球成績、それ以外は打撃成績を優先
  const isPitcher = playerType === "pitcher";
  const rows = isPitcher ? data.pitching : data.hitting;
  const cols = isPitcher ? PITCHER_COLS : HITTER_COLS;

  if (loading) return (
    <div className="yby-table-wrap">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div className="skeleton-block" style={{ height: 14, width: 40, borderRadius: 3 }} />
          <div className="skeleton-block" style={{ height: 14, width: 60, borderRadius: 3 }} />
          {Array.from({ length: 5 }, (__, j) => (
            <div key={j} className="skeleton-block" style={{ height: 14, width: 36, borderRadius: 3 }} />
          ))}
        </div>
      ))}
    </div>
  );
  if (!rows || rows.length === 0) return null;

  return (
    <div className="yby-table-wrap">
      <table className="yby-table">
        <thead>
          <tr>
            <th className="yby-year-col">Year</th>
            <th className="yby-team-col">Team</th>
            {cols.map((c) => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.season}-${i}`}>
              <td className="yby-year-col">{row.season}</td>
              <td className="yby-team-col">{row.teamName}</td>
              {cols.map((c) => (
                <td key={c.key}>{row.stat?.[c.key] ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PlayerYearByYear;
