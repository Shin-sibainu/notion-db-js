import { Client, APIResponseError } from "@notionhq/client";
import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { PropertyValue, NotionPropertyValue, FilterCondition } from "./types";

class NotionTable {
  private notion: Client;
  private databaseId: string;
  private databaseSchema: Record<string, { type: string; name: string }>;
  private filter: any = {};
  private sorts: any[] = [];
  private limitValue: number | null = null;
  private selectProperties: string[] | null = null;

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
  }

  async insert(properties: Record<string, PropertyValue>): Promise<string> {
    if (!Object.keys(this.databaseSchema).length) {
      await this.initialize();
    }

    try {
      const convertedProperties = this.convertToNotionFormat(properties);

      const response = await this.notion.pages.create({
        parent: { type: "database_id", database_id: this.databaseId },
        properties: convertedProperties,
      });

      return response.id;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error message:", error.message);
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

  async select(
    ...props: string[]
  ): Promise<{ data: any[] | null; error: Error | null }> {
    this.selectProperties = props.length > 0 ? props : null;
    return this.executeQuery();
  }

  eq(column: string, value: any): this {
    this.filter[column] = { equals: value };
    return this;
  }

  neq(column: string, value: any): this {
    this.filter[column] = { does_not_equal: value };
    return this;
  }

  gt(column: string, value: number | string): this {
    this.filter[column] = { greater_than: value };
    return this;
  }

  gte(column: string, value: number | string): this {
    this.filter[column] = { greater_than_or_equal_to: value };
    return this;
  }

  lt(column: string, value: number | string): this {
    this.filter[column] = { less_than: value };
    return this;
  }

  lte(column: string, value: number | string): this {
    this.filter[column] = { less_than_or_equal_to: value };
    return this;
  }

  contains(column: string, value: string): this {
    this.filter[column] = { contains: value };
    return this;
  }
  order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.sorts.push({
      property: column,
      direction: ascending ? "ascending" : "descending",
    });
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  private async executeQuery(): Promise<{
    data: any[] | null;
    error: Error | null;
  }> {
    try {
      let hasMore = true;
      let startCursor: string | undefined;
      let results: any[] = [];

      while (hasMore) {
        const response = await this.notion.databases.query({
          database_id: this.databaseId,
          filter: this.buildFilter(),
          sorts: this.sorts,
          start_cursor: startCursor,
          page_size: this.limitValue || 100,
        });

        results.push(...response.results);
        hasMore = response.has_more;
        startCursor = response.next_cursor as string | undefined;

        if (this.limitValue && results.length >= this.limitValue) {
          results = results.slice(0, this.limitValue);
          hasMore = false;
        }
      }

      const formattedResults = this.formatResults(results);

      // リセット
      this.filter = {};
      this.sorts = [];
      this.limitValue = null;
      this.selectProperties = null;

      return { data: formattedResults, error: null };
    } catch (error) {
      console.error("Error in query execution:", error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  private buildFilter(): any {
    if (Object.keys(this.filter).length === 0) {
      return undefined;
    }

    return {
      and: Object.entries(this.filter).map(([key, value]) => {
        const condition = value as FilterCondition;
        const filterType = Object.keys(condition)[0] as keyof FilterCondition;
        const filterValue = condition[filterType];

        return {
          property: key,
          [filterType]: filterValue,
        };
      }),
    };
  }

  private formatResults(results: any[]): any[] {
    return results.map((page) => {
      const formattedPage: any = {
        id: page.id,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
      };

      Object.entries(page.properties).forEach(([key, value]: [string, any]) => {
        switch (value.type) {
          case "title":
          case "rich_text":
            formattedPage[key] = value[value.type][0]?.plain_text || "";
            break;
          case "number":
            formattedPage[key] = value.number;
            break;
          case "select":
            formattedPage[key] = value.select?.name || "";
            break;
          case "multi_select":
            formattedPage[key] = value.multi_select.map(
              (item: any) => item.name
            );
            break;
          case "date":
            formattedPage[key] = value.date?.start || "";
            break;
          case "checkbox":
            formattedPage[key] = value.checkbox;
            break;
          default:
            formattedPage[key] = value[value.type];
        }
      });

      return formattedPage;
    });
  }

  private convertToDateProperty(value: PropertyValue): { start: string } {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string" || typeof value === "number") {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      } else {
        console.warn(`Invalid date value: ${value}. Using current date.`);
        date = new Date();
      }
    } else {
      console.warn(
        `Unsupported date value type: ${typeof value}. Using current date.`
      );
      date = new Date();
    }

    return { start: date.toISOString() };
  }

  private convertToNotionFormat(
    properties: Record<string, PropertyValue>
  ): CreatePageParameters["properties"] {
    const result: Record<string, NotionPropertyValue> = {};
    for (const [key, value] of Object.entries(properties)) {
      const schemaKey = Object.keys(this.databaseSchema).find(
        (k) => k.toLowerCase() === key.toLowerCase()
      );

      if (!schemaKey) {
        console.warn(`Property ${key} not found in database schema. Skipping.`);
        continue;
      }

      const propertyType = this.databaseSchema[schemaKey].type;

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
        case "date":
          result[schemaKey] = {
            date: this.convertToDateProperty(value),
          };
          break;
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
}

export default NotionTable;
