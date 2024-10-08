// insert / update / delete
import dotenv from "dotenv";
import { describe } from "node:test";
import { v4 as uuidv4 } from "uuid";
import NotionDB from "../../src/index";
import { equal } from "assert";

dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY must be set in .env file");
}

//insert test
describe("NotionDB insert Method Integration Tests", () => {
  let notionDB: NotionDB;

  beforeAll(async () => {
    notionDB = new NotionDB(NOTION_API_KEY);
    await notionDB.initialize();
  });

  // test("NotionDBのblogsテーブルの中に1レコード追加する", async () => {
  //   const testTitle = `Sample Title 3`;

  //   const newRecordId = await notionDB.from("blogs").insert({
  //     title: testTitle,
  //     description: "This is a sample description 3",
  //   });

  //   expect(newRecordId).toBeTruthy();
  //   expect(typeof newRecordId).toBe("string");
  // });

  test("存在しないデータベースへのアクセス時にエラーをスローする", async () => {
    try {
      await notionDB.from("non_existent_db").insert({
        title: "Test",
      });
      // もしここまで到達したら、エラーがスローされなかったということなのでテストを失敗させる
      fail("Expected an error to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /Database non_existent_db not found/
      );
    }
  });
});

describe("NotionDB select method test", () => {
  let notionDB: NotionDB;

  beforeAll(async () => {
    notionDB = new NotionDB(NOTION_API_KEY);
    await notionDB.initialize();
  });

  test("全レコードを取得する", async () => {
    const testTitle = "Sample Title 3";

    const { data, error } = await notionDB.from("blogs").select();

    console.log(data);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].title).toBe(testTitle);
  });
});
