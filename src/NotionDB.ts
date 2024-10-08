import { Client } from "@notionhq/client";
import NotionTable from "./NotionTable";

class NotionDB {
  private notion: Client;
  private databaseMap: Map<string, string> = new Map();

  constructor(apiKey: string) {
    this.notion = new Client({ auth: apiKey });
  }

  async initialize() {
    try {
      const response = await this.notion.search({
        filter: { property: "object", value: "database" },
      });

      response.results.forEach((database: any) => {
        this.databaseMap.set(database.title[0].plain_text, database.id);
      });

      console.log("Databases initialized:", this.databaseMap);
    } catch (error) {
      console.error("Error initializing databases:", error);
      throw error;
    }
  }

  from(databaseName: string): NotionTable {
    const databaseId = this.databaseMap.get(databaseName);
    if (!databaseId) {
      throw new Error(
        `Database ${databaseName} not found. Make sure to call initialize() this first and check the database name`
      );
    }
    return new NotionTable(this.notion, databaseId);
  }
}

export default NotionDB;
