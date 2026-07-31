/**
 * services/mlb/playerFormatter.js のユニットテスト。
 *
 * MLB Stats APIのレスポンス(statsは group.displayName で hitting/pitching が
 * 混ざった配列で返ってくる)を、アプリ内で扱いやすい形に整形するロジック。
 * DBにも外部APIにも依存しない純粋な変換関数なので、モック無しでテストできる。
 */

const {
  formatExternalStats,
  formatRecentGames,
} = require("../services/mlb/playerFormatter");

describe("formatExternalStats", () => {
  test("hittingグループがあればhitterStatsを組み立てる", () => {
    const stats = [
      {
        group: { displayName: "hitting" },
        splits: [
          {
            stat: {
              gamesPlayed: 100,
              homeRuns: 20,
              rbi: 60,
              avg: ".300",
              ops: ".900",
            },
          },
        ],
      },
    ];

    const result = formatExternalStats(stats);

    expect(result.hitterStats).toMatchObject({
      gamesPlayed: 100,
      homeRuns: 20,
      rbis: 60,
      battingAverage: ".300",
      ops: ".900",
    });
    expect(result.pitcherStats).toBeUndefined();
  });

  test("pitchingグループがあればpitcherStatsを組み立てる", () => {
    const stats = [
      {
        group: { displayName: "pitching" },
        splits: [
          {
            stat: {
              era: "2.50",
              whip: "1.00",
              strikeOuts: 150,
              wins: 12,
            },
          },
        ],
      },
    ];

    const result = formatExternalStats(stats);

    expect(result.pitcherStats).toMatchObject({
      era: "2.50",
      whip: "1.00",
      strikeouts: 150,
      wins: 12,
    });
    expect(result.hitterStats).toBeUndefined();
  });

  test("statsが空配列なら両方undefinedを返す", () => {
    const result = formatExternalStats([]);

    expect(result.hitterStats).toBeUndefined();
    expect(result.pitcherStats).toBeUndefined();
  });
});

describe("formatRecentGames", () => {
  const buildGameStats = (playerType) => [
    {
      group: { displayName: playerType === "pitcher" ? "pitching" : "hitting" },
      splits: [
        { date: "2026-06-01", opponent: { name: "Team A" }, stat: { summary: "1-4" }, isWin: true },
        { date: "2026-06-05", opponent: { name: "Team B" }, stat: { summary: "0-3" }, isWin: false },
        { date: "2026-06-03", opponent: { name: "Team C" }, stat: { summary: "2-4" }, isWin: true },
      ],
    },
  ];

  test("日付の新しい順に並び替える", () => {
    const games = formatRecentGames(buildGameStats("hitter"), "hitter");

    expect(games.map((g) => g.date)).toEqual([
      "2026-06-05",
      "2026-06-03",
      "2026-06-01",
    ]);
  });

  test("最大5件までに絞る", () => {
    const manyGames = [
      {
        group: { displayName: "hitting" },
        splits: Array.from({ length: 10 }, (_, i) => ({
          date: `2026-06-${String(i + 1).padStart(2, "0")}`,
          opponent: { name: "Team" },
          stat: { summary: "1-4" },
          isWin: true,
        })),
      },
    ];

    const games = formatRecentGames(manyGames, "hitter");

    expect(games).toHaveLength(5);
  });

  test("isWinの真偽値をW/Lに変換する", () => {
    const games = formatRecentGames(buildGameStats("hitter"), "hitter");

    // 2026-06-05 は isWin: false のゲーム
    const lossGame = games.find((g) => g.date === "2026-06-05");
    expect(lossGame.result).toBe("L");

    // 2026-06-01 は isWin: true のゲーム
    const winGame = games.find((g) => g.date === "2026-06-01");
    expect(winGame.result).toBe("W");
  });
});
