import type { ZodType } from "zod";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (schema: ZodType) =>
	catchAsync(async (req, _res, next) => {
		req.body = await schema.parseAsync(req.body ?? {});
		next();
	});
