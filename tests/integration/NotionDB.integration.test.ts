// insert / update / delete
import dotenv from "dotenv";
import { describe } from "node:test";
import { v4 as uuidv4 } from "uuid";
import NotionDB from "../../src/index";

dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TEST_DATABASE_NAME = "blogs"; // テスト用のデータベース名を指定

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY must be set in .env file");
}

describe("NotionDB Integration Tests", () => {
  let notionDB: NotionDB;

  beforeAll(async () => {
    notionDB = new NotionDB(NOTION_API_KEY);
    await notionDB.initialize();
  });

  test("NotionDBのblogsテーブルの中に1レコード追加する", async () => {
    const table = notionDB.from(TEST_DATABASE_NAME);

    const testId = uuidv4();
    const testTitle = `Sample Title`;

    const newRecordId = await table.insert({
      id: testId,
      title: testTitle,
      description: "This is a sample description",
    });

    expect(newRecordId).toBeTruthy();
    expect(typeof newRecordId).toBe("string");
  });
});
