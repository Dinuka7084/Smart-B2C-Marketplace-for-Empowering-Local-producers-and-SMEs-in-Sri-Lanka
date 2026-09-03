import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(80);
const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(32)
  .regex(/^[+()\-\s\d]+$/, 'Enter a valid phone number')
  .optional();

export const registerSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(12).max(128),
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
    role: z.enum(['customer', 'vendor']),
    businessName: z.string().trim().min(2).max(160).optional(),
    storeSlug: z
      .string()
      .trim()
      .min(3)
      .max(180)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Use lowercase letters, numbers, and single hyphens only',
      )
      .optional(),
    registrationNumber: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.role === 'vendor' && !value.businessName) {
      context.addIssue({
        code: 'custom',
        path: ['businessName'],
        message: 'Business name is required for vendors',
      });
    }

    if (value.role === 'vendor' && !value.storeSlug) {
      context.addIssue({
        code: 'custom',
        path: ['storeSlug'],
        message: 'Store slug is required for vendors',
      });
    }
  });

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const vendorApprovalSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    reason: z.string().trim().min(3).max(1_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === 'rejected' && !value.reason) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'A reason is required when rejecting a vendor',
      });
    }
  });
