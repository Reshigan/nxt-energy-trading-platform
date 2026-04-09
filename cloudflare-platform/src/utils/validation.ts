import { z } from 'zod';

// SA ID number validation using Luhn algorithm
export function validateSAId(idNumber: string): boolean {
  if (!/^\d{13}$/.test(idNumber)) return false;

  // Check date portion (YYMMDD)
  const year = parseInt(idNumber.substring(0, 2), 10);
  const month = parseInt(idNumber.substring(2, 4), 10);
  const day = parseInt(idNumber.substring(4, 6), 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Luhn algorithm
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let digit = parseInt(idNumber[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(idNumber[12], 10);
}

// CIPC registration number format: YYYY/NNNNNN/NN
export function validateCIPCNumber(cipc: string): boolean {
  return /^\d{4}\/\d{6}\/\d{2}$/.test(cipc);
}

// SARS tax number format: 10 digits
export function validateSARSTaxNumber(tax: string): boolean {
  return /^\d{10}$/.test(tax);
}

// SA VAT number format: 10 digits starting with 4
export function validateVATNumber(vat: string): boolean {
  return /^4\d{9}$/.test(vat);
}

// ---- Zod schemas ----

export const RegisterSchema = z.object({
  company_name: z.string().min(2).max(200),
  registration_number: z.string().regex(/^\d{4}\/\d{6}\/\d{2}$/, 'Invalid CIPC registration number'),
  tax_number: z.string().regex(/^\d{10}$/, 'Invalid SARS tax number'),
  vat_number: z.string().regex(/^4\d{9}$/, 'Invalid VAT number').optional(),
  role: z.enum(['ipp', 'trader', 'carbon_fund', 'offtaker', 'lender', 'grid']),
  contact_person: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().min(10).max(20),
  physical_address: z.string().min(5).max(500),
  sa_id_number: z.string().optional(),
  bbbee_level: z.number().int().min(1).max(8).optional(),
  nersa_licence: z.string().optional(),
  fsca_licence: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const OrderSchema = z.object({
  direction: z.enum(['buy', 'sell']),
  market: z.enum(['solar', 'wind', 'hydro', 'gas', 'carbon', 'battery']),
  volume: z.number().positive(),
  price: z.number().positive().optional(),
  order_type: z.enum(['limit', 'market', 'stop_loss', 'take_profit', 'iceberg']),
  validity: z.enum(['gtc', 'day', 'ioc', 'fok', 'gtd']).default('gtc'),
  gtd_expiry: z.string().datetime().optional(),
  iceberg_visible_qty: z.number().positive().optional(),
});

export const PhaseTransitionSchema = z.object({
  target_phase: z.enum([
    'draft', 'loi', 'term_sheet', 'hoa', 'draft_agreement',
    'legal_review', 'statutory_check', 'execution', 'active',
    'amended', 'terminated',
  ]),
  notes: z.string().optional(),
});

export const SignSchema = z.object({
  signatory_name: z.string().min(1),
  signatory_designation: z.string().min(1),
  signature_image: z.string(), // base64 PNG
});

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(300),
  document_type: z.enum([
    'loi', 'term_sheet', 'hoa', 'ppa_wheeling', 'ppa_btm',
    'carbon_purchase', 'carbon_option_isda', 'forward', 'epc',
    'wheeling_agreement', 'side_letter', 'nda',
    'solar_ppa', 'wind_ppa', 'gas_spot',
  ]),
  counterparty_id: z.string().min(1).optional(),
  governing_law: z.string().optional(),
  jurisdiction: z.string().optional(),
  commercial_terms: z.record(z.unknown()).optional(),
  template_id: z.string().optional(),
});

export const CreditRetireSchema = z.object({
  quantity: z.number().positive(),
  retirement_purpose: z.string().min(1),
  retirement_beneficiary: z.string().min(1),
});

export const CreditTransferSchema = z.object({
  quantity: z.number().positive(),
  to_participant_id: z.string().min(1),
});

export const OptionCreateSchema = z.object({
  type: z.enum(['call', 'put', 'collar', 'spread', 'barrier', 'asian']),
  underlying_credit_id: z.string().min(1),
  strike_price_cents: z.number().int().positive(),
  premium_cents: z.number().int().positive(),
  quantity: z.number().positive(),
  expiry: z.string().datetime(),
  exercise_style: z.enum(['european', 'american']).default('european'),
  settlement_type: z.enum(['physical', 'cash']).default('physical'),
});

export const DisputeFileSchema = z.object({
  respondent_id: z.string().min(1),
  category: z.enum(['settlement', 'delivery', 'quality', 'payment', 'contractual', 'other']),
  description: z.string().min(10),
  value_cents: z.number().int().positive(),
  trade_id: z.string().optional(),
  contract_id: z.string().optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type OrderInput = z.infer<typeof OrderSchema>;
