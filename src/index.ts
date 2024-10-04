import { APIResponseError, Client } from "@notionhq/client";
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";

type PropertyValue = string | number | boolean | Date | string[];

type NotionPropertyValue =
  | { title: Array<{ text: { content: string } }> }
  | { rich_text: Array<{ text: { content: string } }> }
  | { number: number }
  | { checkbox: boolean }
  | { date: { start: string } }
  | { multi_select: Array<{ name: string }> };

class NotionTable {
  private notion: Client;
  private databaseId: string;
  private databaseSchema: Record<string, { type: string; name: string }>;

  constructor(notion: Client, databaseId: string) {
    this.notion = notion;
    this.databaseId = databaseId;
    this.databaseSchema = {};
  }

  async initialize() {
    const response = await this.notion.databases.retrieve({
      database_id: this.databaseId,
    });
    this.databaseSchema = response.properties;
    console.log(
      "Database schema:",
      JSON.stringify(this.databaseSchema, null, 2)
    );
  }

  private convertToNotionFormat(
    properties: Record<string, PropertyValue>
  ): CreatePageParameters["properties"] {
    const result: Record<string, NotionPropertyValue> = {};
    // key: title, description, value: uuid(), desc uuid()
    for (const [key, value] of Object.entries(properties)) {
      const schemaKey = Object.keys(this.databaseSchema).find(
        (k) => k.toLowerCase() === key.toLowerCase()
      );

      if (!schemaKey) {
        console.warn(`Property ${key} not found in database schema. Skipping.`);
        continue;
      }

      const propertyType = this.databaseSchema[schemaKey].type;
      console.log(
        `Processing property: ${key} (${propertyType}), value:`,
        value
      );

      switch (propertyType) {
        case "title":
          result[schemaKey] = { title: [{ text: { content: String(value) } }] };
          break;
        case "rich_text":
          result[schemaKey] = {
            rich_text: [{ text: { content: String(value) } }],
          };
          break;
        case "number":
          result[schemaKey] = { number: Number(value) };
          break;
        case "checkbox":
          result[schemaKey] = { checkbox: Boolean(value) };
          break;
        // case "date":
        //   result[schemaKey] = {
        //     date: {
        //       start: (value instanceof Date
        //         ? value
        //         : new Date(value)
        //       ).toISOString(),
        //     },
        //   };
        //   break;
        case "multi_select":
          result[schemaKey] = {
            multi_select: Array.isArray(value)
              ? value.map((item) => ({ name: String(item) }))
              : [{ name: String(value) }],
          };
          break;
        default:
          console.warn(
            `Unsupported property type: ${propertyType} for ${key}. Treating as rich_text.`
          );
          result[schemaKey] = {
            rich_text: [{ text: { content: String(value) } }],
          };
      }
    }

    return result;
  }

  async insert(properties: Record<string, PropertyValue>): Promise<string> {
    if (!Object.keys(this.databaseSchema).length) {
      await this.initialize();
    }

    try {
      const convertedProperties = this.convertToNotionFormat(properties);

      console.log(
        "Final check before API call:",
        JSON.stringify(convertedProperties, null, 2)
      );

      const response = await this.notion.pages.create({
        parent: { type: "database_id", database_id: this.databaseId },
        properties: convertedProperties,
      });

      // no response here
      console.log("API response:", JSON.stringify(response, null, 2));
      return response.id;
    } catch (error) {
      console.error("Error inserting record:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      if (error instanceof APIResponseError) {
        console.error(
          "API error details:",
          error.code,
          error.status,
          JSON.stringify(error.body, null, 2)
        );
      }
      throw error;
    }
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
