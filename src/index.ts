import { Client } from "@notionhq/client";

type PropertyValue = string | number | boolean | Date | string[];

class NotionTable {
  private notion: Client;
  private databaseId: string;

  constructor(notion: Client, databaseId: string) {
    this.notion = notion;
    this.databaseId = databaseId;
  }
}

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
}

export default NotionDB;
