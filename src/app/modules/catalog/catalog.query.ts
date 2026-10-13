
import { z } from "zod";

const catalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).default(""),
});

export function parseCatalogQuery(query: unknown) {
  const result = catalogQuerySchema.safeParse(query);

  if (!result.success) {
    throw new Error("Invalid catalog search parameters.");
  }

  const { page, limit, search } = result.data;

  return {
    page,
    limit,
    search,
    skip: (page - 1) * limit,
  };
}
