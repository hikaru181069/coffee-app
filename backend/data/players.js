const players = [
  {
    name: "Shohei Ohtani",
    team: "Dodgers",
    position: "Designated Hitter",
    image: "/images/IMG_5201.jpg",
    playerType: "hitter",
    hitterStats: {
      battingAverage: ".310",
      homeRuns: 44,
      rbis: 95,
    },
  },
  {
    name: "Mookie Betts",
    team: "Dodgers",
    position: "Shortstop",
    image: "/images/betts.jpg",
    playerType: "hitter",
    hitterStats: {
      battingAverage: ".289",
      homeRuns: 39,
      rbis: 107,
    },
  },
  {
    name: "Yoshinobu Yamamoto",
    team: "Dodgers",
    position: "Pitcher",
    image: "/images/yamamoto.jpg",
    playerType: "pitcher",
    pitcherStats: {
      era: "3.00",
      strikeouts: 180,
      inningsPitched: "160.0",
    },
  },
];

module.exports = players;
