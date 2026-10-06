import { z } from "zod";
// Only small JPEG data URLs are accepted; no external URLs or SVG content.
export const avatarSchema = z
  .string()
  .max(50000)
  .regex(/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/)
  .nullable()
  .optional();
