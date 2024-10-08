import { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";

export type PropertyValue = string | number | boolean | Date | string[];

export type NotionPropertyValue =
  | { title: Array<{ text: { content: string } }> }
  | { rich_text: Array<{ text: { content: string } }> }
  | { number: number }
  | { checkbox: boolean }
  | { date: { start: string } }
  | { multi_select: Array<{ name: string }> };

export type DatabaseSchema = Record<string, { type: string; name: string }>;

export type ConvertedProperties = CreatePageParameters["properties"];

export type FilterCondition = {
  equals?: any;
  does_not_equal?: any;
  greater_than?: number | string;
  less_than?: number | string;
  greater_than_or_equal_to?: number | string;
  less_than_or_equal_to?: number | string;
  contains?: string;
};

export type Filter = Record<string, FilterCondition>;
