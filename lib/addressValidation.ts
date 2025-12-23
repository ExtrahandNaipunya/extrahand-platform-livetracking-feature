// Address validation utilities
import { z } from 'zod';

// Pincode validation schema (6 digits for India)
export const pincodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits')
  .refine((val) => parseInt(val) > 100000, 'Invalid pincode');

// Address validation schema
export const savedAddressSchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER'], {
    errorMap: () => ({ message: 'Please select an address label' }),
  }),
  fullAddress: z.string().min(10, 'Address must be at least 10 characters'),
  houseNumber: z.string().min(1, 'House/Flat number is required'),
  landmark: z.string().optional(),
  cityId: z.string().min(1, 'City is required'),
  cityName: z.string().min(1, 'City name is required'),
  pincode: pincodeSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type SavedAddressInput = z.infer<typeof savedAddressSchema>;

// Validate pincode format
export function validatePincode(pincode: string): { valid: boolean; error?: string } {
  try {
    pincodeSchema.parse(pincode);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: 'Invalid pincode' };
  }
}

// Check if address is within serviceable area (mock - replace with actual logic)
export function isServiceableArea(cityId: string, pincode: string): boolean {
  // In production, check against database of serviceable pincodes
  const serviceableCities = ['hyderabad', 'bangalore', 'mumbai', 'delhi', 'chennai'];
  return serviceableCities.includes(cityId.toLowerCase());
}

// Format address for display
export function formatAddress(address: {
  houseNumber: string;
  fullAddress: string;
  landmark?: string;
  cityName: string;
  pincode: string;
}): string {
  const parts = [
    address.houseNumber,
    address.fullAddress,
    address.landmark,
    address.cityName,
    address.pincode,
  ].filter(Boolean);
  
  return parts.join(', ');
}

// Get pincode from address string (reverse)
export function extractPincode(address: string): string | null {
  const match = address.match(/\b\d{6}\b/);
  return match ? match[0] : null;
}
