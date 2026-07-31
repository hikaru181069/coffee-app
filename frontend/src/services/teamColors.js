// 球団のプライマリーカラー（teamId → HEX）
// ヘッダーのアクセントやバナーで「チームらしさ」を出すために使う。
// MLB公式のチームカラーを参考にした代表色。

export const teamColors = {
  108: "#BA0021", // Los Angeles Angels
  109: "#A71930", // Arizona Diamondbacks
  110: "#DF4601", // Baltimore Orioles
  111: "#BD3039", // Boston Red Sox
  112: "#0E3386", // Chicago Cubs
  113: "#C6011F", // Cincinnati Reds
  114: "#0C2340", // Cleveland Guardians
  115: "#33006F", // Colorado Rockies
  116: "#0C2340", // Detroit Tigers
  117: "#002D62", // Houston Astros
  118: "#004687", // Kansas City Royals
  119: "#005A9C", // Los Angeles Dodgers
  120: "#AB0003", // Washington Nationals
  121: "#002D72", // New York Mets
  133: "#003831", // Athletics
  134: "#FDB827", // Pittsburgh Pirates
  135: "#2F241D", // San Diego Padres
  136: "#0C2C56", // Seattle Mariners
  137: "#FD5A1E", // San Francisco Giants
  138: "#C41E3A", // St. Louis Cardinals
  139: "#092C5C", // Tampa Bay Rays
  140: "#003278", // Texas Rangers
  141: "#134A8E", // Toronto Blue Jays
  142: "#002B5C", // Minnesota Twins
  143: "#E81828", // Philadelphia Phillies
  144: "#CE1141", // Atlanta Braves
  145: "#27251F", // Chicago White Sox
  146: "#00A3E0", // Miami Marlins
  147: "#003087", // New York Yankees
  158: "#12284B", // Milwaukee Brewers
};

// 見つからない場合はアプリのデフォルトアクセント（sapphire）を返す
export const getTeamColor = (teamId) =>
  teamColors[Number(teamId)] || "#74c7ec";
