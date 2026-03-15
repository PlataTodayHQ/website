import { z } from "zod";
import { CATEGORY_LIST } from "@plata-today/shared";

const categoryEnum = z.enum(CATEGORY_LIST as [string, ...string[]]);

export const triageSchema = z.object({
  argentina_relevant: z.boolean(),
  importance: z.number().min(1).max(100),
  category: categoryEnum,
  secondary_categories: z.array(z.string()).optional(),
  subcategory: z.string().optional(),
  reasoning: z.string(),
});

export const draftSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  meta_description: z.string().min(1),
  body: z.string().min(1),
});

export const reviewSchema = z.object({
  approved: z.boolean(),
  feedback: z.string(),
  checks: z.object({
    hallucination: z.string(),
    tone: z.string(),
    completeness: z.string(),
    style: z.string(),
    seo: z.string(),
    source_attribution: z.string().optional(),
  }).optional(),
  corrected_title: z.string(),
  corrected_body: z.string(),
  corrected_meta_description: z.string(),
});

export const rewriteSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  meta_description: z.string().min(1),
  body: z.string().min(1),
  lang: z.string().optional(),
});

export const validateRewriteSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  corrected_title: z.string().optional(),
  corrected_body: z.string().optional(),
  corrected_meta_description: z.string().optional(),
});
