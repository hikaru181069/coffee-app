/**
 * /api/diagnosis の HTTPレベルのテスト。
 *
 * diagnosisBuilder.test.js が「archetype判定ロジック」を見るのに対し、
 * こちらは「自分の記録だけから正しく生成されるか」「Insight・Statsが
 * そのまま束ねられているか」というDB込みの振る舞いを見る
 * （tests/insightApi.test.js と同じ方針）。
 */

import request from "supertest";

import app from "../app.js";
import RoastLevel from "../models/RoastLevel.js";
import Flavor from "../models/Flavor.js";
import Process from "../models/Process.js";
import Variety from "../models/Variety.js";
import {
  connectTestDb,
  closeTestDb,
  clearTestDb,
  createTestUser,
  createRecordFor,
  seedTestMasterData,
} from "./helpers/testDb.js";

const DIAGNOSIS_ENDPOINT = "/api/diagnosis";

let alice;
let bob;

beforeAll(connectTestDb);
afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  alice = await createTestUser({ name: "Alice" });
  bob = await createTestUser({ name: "Bob" });
});

describe("認証", () => {
  test("トークン無しは401", async () => {
    const res = await request(app).get(DIAGNOSIS_ENDPOINT);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/diagnosis", () => {
  test("記録が無ければarchetypeはnull、insightsは空配列", async () => {
    const res = await request(app).get(DIAGNOSIS_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.archetype).toBeNull();
    expect(res.body.data.insights).toEqual([]);
    expect(res.body.data.stats.overview.recordCount).toBe(0);
  });

  test("自分の記録だけからarchetypeを判定する（他ユーザーを含めない）", async () => {
    await seedTestMasterData();
    const light = await RoastLevel.findOne({ key: "light" });
    const berry = await Flavor.findOne({ normalizedName: "berry" });

    // Aliceはlight×fruityの組み合わせを3件持つが、Bobの記録は混ざらない
    for (let i = 0; i < 3; i += 1) {
      await createRecordFor(alice.user._id, { roastLevelId: light._id, flavorIds: [berry._id] });
    }
    await createRecordFor(bob.user._id, { roastLevelId: light._id, flavorIds: [berry._id] });

    const res = await request(app).get(DIAGNOSIS_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body.data.archetype).toEqual({
      type: "lightFruity",
      roastSampleSize: 3,
      categorySampleSize: 3,
      dominantProcess: null,
      dominantVariety: null,
      tasteProfile: {
        tasteSweetness: null,
        tasteBitterness: null,
        tasteAcidity: null,
        tasteBody: null,
        tasteAroma: null,
        tasteAftertaste: null,
      },
    });
  });

  test("精製方法・品種が3件とも同じなら補足情報として返す", async () => {
    await seedTestMasterData();
    const light = await RoastLevel.findOne({ key: "light" });
    const berry = await Flavor.findOne({ normalizedName: "berry" });
    const natural = await Process.findOne({ normalizedName: "natural" });
    const geisha = await Variety.findOne({ normalizedName: "geisha" });

    for (let i = 0; i < 3; i += 1) {
      await createRecordFor(alice.user._id, {
        roastLevelId: light._id,
        flavorIds: [berry._id],
        processId: natural._id,
        varietyIds: [geisha._id],
      });
    }

    const res = await request(app).get(DIAGNOSIS_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body.data.archetype.dominantProcess).toEqual({ label: natural.name, count: 3 });
    expect(res.body.data.archetype.dominantVariety).toEqual({ label: geisha.name, count: 3 });
  });
});
