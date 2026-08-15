import User from "../models/User.js";
import CoffeeRecord from "../models/CoffeeRecord.js";
import Origin from "../models/Origin.js";
import Variety from "../models/Variety.js";
import Process from "../models/Process.js";
import RoastLevel from "../models/RoastLevel.js";
import Flavor from "../models/Flavor.js";
import { normalizeName } from "../utils/normalizeName.js";
import { seedMasterData } from "./seedMasterData.js";
import { demoRecords } from "./data/demoRecords.js";

/**
 * デモ用ユーザーとコーヒー記録の投入（prompts/06 の「demo seed」）。
 *
 * 面接・ポートフォリオ閲覧者が「まず何もない状態から記録する」体験と、
 * 「記録が育った後の知識グラフ」の両方を見せたいため、
 * 空の状態を壊さない別ユーザーとしてデモデータを用意する。
 *
 * このパスワードは公開情報として扱ってよい（README にも記載する）。
 * 実運用のアカウントではなく、閲覧専用のデモアカウントのため。
 */
const DEMO_USER_EMAIL = "demo@coffee-app.example";
const DEMO_USER_PASSWORD = "coffeedemo123";
const DEMO_USER_NAME = "Demo User";

const findOrCreateDemoUser = async () => {
  const existing = await User.findOne({ email: DEMO_USER_EMAIL });
  if (existing) return { user: existing, created: false };

  // ハッシュ化はUser.js（pre-saveフック）が行う
  const user = await User.create({
    name: DEMO_USER_NAME,
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
  });

  return { user, created: true };
};

/**
 * マスターデータを名前からIDへ変換する。
 *
 * demoRecords.js は可読性のため名前（"Ethiopia" など）で書いており、
 * ObjectIdはDBの状態（seed順序）に依存するため持たせていない。
 * 正規化した名前で引くのは、通常の登録と同じ経路（normalizeName）を
 * 通すことで、表記揺れが無い前提を保証するため。
 */
const resolveId = async (Model, name) => {
  if (!name) return null;
  const doc = await Model.findOne({ normalizedName: normalizeName(name) }, { _id: 1 });
  return doc?._id ?? null;
};

const resolveIds = async (Model, names) => {
  if (!names || names.length === 0) return [];
  const ids = await Promise.all(names.map((name) => resolveId(Model, name)));
  return ids.filter(Boolean);
};

/** roastLevelだけ normalizedName を持たず key で引く（models/RoastLevel.js） */
const resolveRoastLevelId = async (key) => {
  if (!key) return null;
  const doc = await RoastLevel.findOne({ key }, { _id: 1 });
  return doc?._id ?? null;
};

const toCoffeeRecordDocument = async (record, userId) => ({
  userId,
  title: record.title,
  consumedAt: new Date(record.consumedAt),
  recordType: record.recordType,
  rating: record.rating ?? null,
  notes: record.notes ?? "",
  cafeName: record.cafeName ?? "",
  roasterName: record.roasterName ?? "",
  farmName: record.farmName ?? "",
  originId: await resolveId(Origin, record.origin),
  varietyIds: await resolveIds(Variety, record.varieties),
  processId: await resolveId(Process, record.process),
  roastLevelId: await resolveRoastLevelId(record.roastLevel),
  flavorIds: await resolveIds(Flavor, record.flavors),
});

/**
 * デモユーザーとその記録を投入する。
 *
 * 冪等性: デモユーザーがすでに記録を持っていれば何もしない。
 * 実行のたびに記録が増え続けたり、手動で編集したデモデータが
 * 上書きされたりしないようにするため。
 */
export const seedDemoData = async () => {
  // マスターデータが無いと参照が全部nullになってしまうため、依存として実行する。
  // 既に投入済みなら何もしない（seedMasterData自体が冪等）
  await seedMasterData();

  const { user, created: userCreated } = await findOrCreateDemoUser();

  const existingCount = await CoffeeRecord.countDocuments({ userId: user._id });
  if (existingCount > 0) {
    return {
      email: DEMO_USER_EMAIL,
      password: DEMO_USER_PASSWORD,
      userCreated,
      recordsInserted: 0,
      recordsExisting: existingCount,
    };
  }

  const documents = await Promise.all(
    demoRecords.map((record) => toCoffeeRecordDocument(record, user._id)),
  );

  const created = await CoffeeRecord.create(documents);

  return {
    email: DEMO_USER_EMAIL,
    password: DEMO_USER_PASSWORD,
    userCreated,
    recordsInserted: created.length,
    recordsExisting: 0,
  };
};
