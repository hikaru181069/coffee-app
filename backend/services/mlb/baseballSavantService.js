const fs   = require("fs");
const path = require("path");

const OAA_FILE              = path.join(__dirname, "../../data/oaa_2026.csv");
const SPRINT_SPEED_FILE     = path.join(__dirname, "../../data/sprint_speed_2026.csv");
const ARM_STRENGTH_FILE     = path.join(__dirname, "../../data/arm_strength_2006.csv");
// OAAは捕手の守備を評価しない(Baseball Savant側でも捕手はOAAの対象外)ため、
// 捕手の守備力は別指標のフレーミング(投球を受ける技術によるボール/ストライク損得)で評価する。
const CATCHER_FRAMING_FILE  = path.join(__dirname, "../../data/catcher_framing_2026.csv");

// 引用符を考慮したCSV行パーサー
// "last_name, first_name" のようにカンマを含むフィールドを正しく処理する
function parseCsvRow(line) {
  const fields = [];
  let current  = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// 起動時に1回だけ読み込んでメモリに保持する（更新は再起動で反映）
let oaaCache         = null;
let oaaPositionCache = null; // player_id → position ("SS", "CF" 等)

const _loadOaaCsv = () => {
  try {
    const text    = fs.readFileSync(OAA_FILE, "utf-8");
    const lines   = text.replace(/^﻿/, "").trim().split("\n"); // BOM除去
    const headers = parseCsvRow(lines[0]);

    const playerIdIdx = headers.indexOf("player_id");
    const oaaIdx      = headers.indexOf("outs_above_average");
    const posIdx      = headers.indexOf("primary_pos_formatted");

    if (playerIdIdx === -1 || oaaIdx === -1) {
      console.warn("[BaseballSavant] OAA CSV: required columns not found");
      oaaCache = {};
      oaaPositionCache = {};
      return;
    }

    const map    = {};
    const posMap = {};
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const fields = parseCsvRow(line);
      const id     = Number(fields[playerIdIdx]);
      const oaa    = parseFloat(fields[oaaIdx]);
      if (id && Number.isFinite(oaa)) {
        map[id] = oaa;
        if (posIdx !== -1 && fields[posIdx]) posMap[id] = fields[posIdx].trim();
      }
    }

    console.log(`[BaseballSavant] OAA loaded: ${Object.keys(map).length} players`);
    oaaCache         = map;
    oaaPositionCache = posMap;
  } catch (err) {
    console.warn(`[BaseballSavant] Failed to load OAA CSV: ${err.message}`);
    oaaCache         = {};
    oaaPositionCache = {};
  }
};

const getOaaMap = () => {
  if (!oaaCache) _loadOaaCsv();
  return oaaCache;
};

const getOaaPositionMap = () => {
  if (!oaaPositionCache) _loadOaaCsv();
  return oaaPositionCache;
};

// ── Sprint Speed ─────────────────────────────────────────────────────────────

let sprintSpeedCache = null;

const getSprintSpeedMap = () => {
  if (sprintSpeedCache) return sprintSpeedCache;
  try {
    const text    = fs.readFileSync(SPRINT_SPEED_FILE, "utf-8");
    const lines   = text.replace(/^﻿/, "").trim().split("\n");
    const headers = parseCsvRow(lines[0]);
    const idIdx   = headers.indexOf("player_id");
    const valIdx  = headers.indexOf("sprint_speed");
    if (idIdx === -1 || valIdx === -1) {
      console.warn("[BaseballSavant] Sprint speed CSV: required columns not found");
      return (sprintSpeedCache = {});
    }
    const map = {};
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const fields = parseCsvRow(line);
      const id  = Number(fields[idIdx]);
      const val = parseFloat(fields[valIdx]);
      if (id && Number.isFinite(val)) map[id] = val;
    }
    console.log(`[BaseballSavant] Sprint speed loaded: ${Object.keys(map).length} players`);
    return (sprintSpeedCache = map);
  } catch (err) {
    console.warn(`[BaseballSavant] Failed to load sprint speed CSV: ${err.message}`);
    return (sprintSpeedCache = {});
  }
};

// ── Arm Strength ──────────────────────────────────────────────────────────────

let armStrengthCache = null;

const getArmStrengthMap = () => {
  if (armStrengthCache) return armStrengthCache;
  try {
    const text    = fs.readFileSync(ARM_STRENGTH_FILE, "utf-8");
    const lines   = text.replace(/^﻿/, "").trim().split("\n");
    const headers = parseCsvRow(lines[0]);
    const idIdx   = headers.indexOf("player_id");
    const valIdx  = headers.indexOf("arm_overall");
    if (idIdx === -1 || valIdx === -1) {
      console.warn("[BaseballSavant] Arm strength CSV: required columns not found");
      return (armStrengthCache = {});
    }
    const map = {};
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const fields = parseCsvRow(line);
      const id  = Number(fields[idIdx]);
      const val = parseFloat(fields[valIdx]);
      if (id && Number.isFinite(val) && val > 0) map[id] = val;
    }
    console.log(`[BaseballSavant] Arm strength loaded: ${Object.keys(map).length} players`);
    return (armStrengthCache = map);
  } catch (err) {
    console.warn(`[BaseballSavant] Failed to load arm strength CSV: ${err.message}`);
    return (armStrengthCache = {});
  }
};

// ── Catcher Framing (rv_tot = 通算フレーミング失点抑制ランズ) ──────────────────

let catcherFramingCache = null;

const getCatcherFramingMap = () => {
  if (catcherFramingCache) return catcherFramingCache;
  try {
    const text    = fs.readFileSync(CATCHER_FRAMING_FILE, "utf-8");
    const lines   = text.replace(/^﻿/, "").trim().split("\n");
    const headers = parseCsvRow(lines[0]);
    const idIdx   = headers.indexOf("id");
    const valIdx  = headers.indexOf("rv_tot");
    if (idIdx === -1 || valIdx === -1) {
      console.warn("[BaseballSavant] Catcher framing CSV: required columns not found");
      return (catcherFramingCache = {});
    }
    const map = {};
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const fields = parseCsvRow(line);
      const id  = Number(fields[idIdx]);
      const val = parseFloat(fields[valIdx]);
      if (id && Number.isFinite(val)) map[id] = val;
    }
    console.log(`[BaseballSavant] Catcher framing loaded: ${Object.keys(map).length} players`);
    return (catcherFramingCache = map);
  } catch (err) {
    console.warn(`[BaseballSavant] Failed to load catcher framing CSV: ${err.message}`);
    return (catcherFramingCache = {});
  }
};

module.exports = { getOaaMap, getOaaPositionMap, getSprintSpeedMap, getArmStrengthMap, getCatcherFramingMap };
