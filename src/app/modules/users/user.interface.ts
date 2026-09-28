import type { z } from "zod";
import { UserValidation } from "./user.validation";


export type IUpdateProfile = z.infer<typeof UserValidation.updateProfile>;
export type IUserListQuery = z.infer<typeof UserValidation.listUsers>;
export type IChangeUserStatus = z.infer<typeof UserValidation.changeStatus>;
export type IAuditQuery = z.infer<typeof UserValidation.auditQuery>;
