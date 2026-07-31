function StatsTable({ title, rows }) {
  return (
    <div className="stats-table-block">
      <p className="stats-table-title">{title}</p>
      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              {rows.map(({ label }) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {rows.map(({ label, value }) => (
                <td key={label}>
                  {value != null && value !== "" ? value : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerStats({ player }) {
  const h = player.hitterStats || player.seasonStats;
  const p = player.pitcherStats || player.seasonStats;

  if (player.playerType === "hitter" && h) {
    return (
      <StatsTable
        title="Batting"
        rows={[
          { label: "G",   value: h.gamesPlayed },
          { label: "H",   value: h.hits },
          { label: "HR",  value: h.homeRuns },
          { label: "RBI", value: h.rbis },
          { label: "AVG", value: h.battingAverage },
          { label: "OBP", value: h.obp },
          { label: "SLG", value: h.slg },
          { label: "OPS", value: h.ops },
        ]}
      />
    );
  }

  if (player.playerType === "pitcher" && p) {
    return (
      <StatsTable
        title="Pitching"
        rows={[
          { label: "G",    value: p.gamesPlayed },
          { label: "W",    value: p.wins },
          { label: "L",    value: p.losses },
          { label: "IP",   value: p.inningsPitched },
          { label: "SO",   value: p.strikeouts },
          { label: "BB",   value: p.baseOnBalls },
          { label: "ERA",  value: p.era },
          { label: "WHIP", value: p.whip },
        ]}
      />
    );
  }

  return <p className="text-ctp-subtext0 text-sm">No stats available.</p>;
}

export default PlayerStats;
