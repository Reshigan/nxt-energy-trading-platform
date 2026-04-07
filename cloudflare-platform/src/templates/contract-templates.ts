/**
 * SA-law compliant contract template library
 * All 12 document types with mandatory + type-specific clauses
 */

export interface ContractTemplate {
  document_type: string;
  name: string;
  mandatory_clauses: MandatoryClause[];
  type_specific_clauses: string[];
  fields: string[];
}

export interface MandatoryClause {
  key: string;
  title: string;
  text: string;
}

/** Mandatory clauses required in ALL document types per SA law */
export const MANDATORY_CLAUSES: MandatoryClause[] = [
  {
    key: 'governing_law',
    title: 'Governing Law',
    text: 'This agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa.',
  },
  {
    key: 'jurisdiction',
    title: 'Jurisdiction',
    text: 'The parties submit to the exclusive jurisdiction of the Gauteng Division of the High Court of South Africa, Johannesburg.',
  },
  {
    key: 'dispute_resolution',
    title: 'Dispute Resolution',
    text: 'Step 1: Good faith negotiation (14 business days). Step 2: Mediation per the South African Institute of Chartered Mediators rules. Step 3: Arbitration per the Arbitration Act 42 of 1965, administered by the Arbitration Foundation of Southern Africa (AFSA).',
  },
  {
    key: 'force_majeure',
    title: 'Force Majeure',
    text: 'Neither party shall be liable for failure to perform due to force majeure events including but not limited to: acts of God, war, terrorism, pandemic, government regulation, load shedding (as declared by Eskom or the relevant grid operator), grid failure, and NERSA regulatory action. The affected party shall notify the other within 48 hours.',
  },
  {
    key: 'bbbee_undertaking',
    title: 'BBBEE Undertaking',
    text: 'Each party confirms its current BBBEE status and undertakes to maintain or improve its BBBEE level throughout the term of this agreement. Any material change in BBBEE status shall be notified within 30 days.',
  },
  {
    key: 'popia_compliance',
    title: 'POPIA Compliance',
    text: 'The parties agree to process personal information in accordance with the Protection of Personal Information Act 4 of 2013 (POPIA), Sections 19-22. Each party shall implement appropriate technical and organisational measures to protect personal information.',
  },
  {
    key: 'anti_corruption',
    title: 'Anti-Corruption',
    text: 'Each party warrants compliance with the Prevention and Combating of Corrupt Activities Act 12 of 2004. Neither party shall directly or indirectly offer, promise, or give any undue advantage to any public official or private party.',
  },
  {
    key: 'electronic_signature',
    title: 'Electronic Signature',
    text: 'The parties agree that this agreement may be executed by advanced electronic signature in compliance with the Electronic Communications and Transactions Act 25 of 2002 (ECT Act), Section 13. Each electronic signature shall be accompanied by a signing certificate issued by the NXT Platform.',
  },
];

/** Type-specific additional clauses per document type */
export const TEMPLATE_LIBRARY: ContractTemplate[] = [
  {
    document_type: 'ppa_wheeling',
    name: 'Power Purchase Agreement (Wheeling)',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Wheeling charge methodology and annual adjustment formula.',
      'Grid connection terms per the Electricity Regulation Act.',
      'Deemed energy provisions: generator paid for energy that could have been produced but was curtailed by offtaker or grid operator.',
      'Curtailment compensation at contracted rate for first 100 hours per annum; thereafter at 50%.',
      'Take-or-pay obligations: offtaker shall pay for minimum contracted volume regardless of actual consumption.',
      'Price escalation formula: CPI + 2% per annum, adjusted on each anniversary date.',
      'NERSA tariff compliance: pricing shall at all times comply with applicable NERSA-approved tariffs.',
      'Connection point specification per the Grid Code and Distribution Code.',
    ],
    fields: ['capacity_mw', 'delivery_point', 'connection_point', 'wheeling_charge', 'escalation_formula', 'take_or_pay_volume', 'nersa_tariff_code'],
  },
  {
    document_type: 'ppa_btm',
    name: 'Power Purchase Agreement (Behind the Meter)',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Metering requirements: bi-directional meters at the point of supply, calibrated per NRS 049.',
      'Roof access and structural warranty: generator has right of access; property owner warrants structural integrity.',
      'Performance guarantees: minimum guaranteed output of 85% of projected annual yield.',
      'Termination on property sale: agreement transfers to successor or terminates with 6-month notice.',
      'Landlord consent: required prior to installation; template consent form attached as Annexure.',
      'Section 12B tax benefit allocation: accelerated depreciation benefits accrue to the asset owner.',
      'Maintenance obligations: generator responsible for all maintenance; 48-hour response time for critical faults.',
    ],
    fields: ['capacity_kw', 'property_address', 'roof_area_m2', 'guaranteed_yield_kwh', 'maintenance_sla_hours'],
  },
  {
    document_type: 'carbon_purchase',
    name: 'Carbon Credit Purchase Agreement',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Credit vintage specification: credits must be from vintage year [YEAR] or later.',
      'Registry requirements: credits must be registered on VCS or Gold Standard registry with valid serial numbers.',
      'Delivery obligations: seller shall deliver credits to buyer registry account within 10 business days of payment.',
      'Retirement rights: buyer has exclusive right to retire credits and claim associated emission reductions.',
      'SDG co-benefit guarantees: credits must demonstrate verified contributions to specified Sustainable Development Goals.',
      'Verification standard: credits must be verified by an accredited third-party verifier under the applicable standard.',
      'Buffer pool contribution: 5% of total credits contributed to buffer pool for permanence risk mitigation.',
    ],
    fields: ['credit_quantity', 'vintage_year', 'registry', 'price_per_tonne', 'sdg_goals', 'verification_body'],
  },
  {
    document_type: 'carbon_option_isda',
    name: 'Carbon Option (ISDA Adapted)',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'ISDA 2002 Master Agreement terms adapted for South African law per the Financial Markets Act.',
      'Credit Support Annex: collateral requirements and eligible collateral types.',
      'Events of Default: failure to pay within 3 business days, breach of representation, credit event.',
      'Termination Events: force majeure (including load shedding), tax event, merger, regulatory change.',
      'Close-out netting per FSCA rules and the Financial Markets Act 19 of 2012.',
      'Collateral requirements: initial margin and variation margin per FSCA standards.',
      'Early termination provisions: right to terminate on 30 days notice; close-out amount calculated per ISDA methodology.',
    ],
    fields: ['option_type', 'strike_price', 'premium', 'expiry_date', 'underlying_quantity', 'exercise_style'],
  },
  {
    document_type: 'forward',
    name: 'Energy Forward Contract',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Delivery period: [START_DATE] to [END_DATE], energy delivered in equal monthly installments.',
      'Settlement mechanism: physical delivery at the specified connection point; cash settlement available by mutual agreement.',
      'Price adjustment provisions: base price subject to adjustment for documented force majeure events.',
      'Quality specifications: energy must comply with NRS 048 power quality standards.',
      'Force majeure with load shedding provision: Stage 4+ load shedding constitutes force majeure for delivery obligations.',
    ],
    fields: ['delivery_start', 'delivery_end', 'total_volume_mwh', 'price_per_mwh', 'settlement_type', 'connection_point'],
  },
  {
    document_type: 'epc',
    name: 'EPC (Engineering, Procurement & Construction) Contract',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'CIDB grading requirements: contractor must hold valid CIDB grading appropriate for contract value.',
      'Performance guarantees: Performance Ratio (PR) >= 80%, availability >= 97% during defects liability period.',
      'Liquidated damages: 0.5% of contract value per week of delay, capped at 15% of contract value.',
      'Retention amounts: 10% retention on each progress payment; 50% released at COD, balance after defects liability.',
      'Completion milestones: as detailed in the project schedule (Annexure A).',
      'Defects liability period: 12 months from date of Practical Completion.',
      'Insurance requirements per ECSA guidelines: Construction All Risks, Professional Indemnity, Public Liability.',
    ],
    fields: ['contract_value', 'cidb_grading', 'completion_date', 'defects_liability_months', 'retention_pct', 'ld_rate_pct'],
  },
  {
    document_type: 'wheeling_agreement',
    name: 'Wheeling Agreement',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Municipal/Eskom wheeling charges as per applicable approved tariffs.',
      'Losses allocation: technical and non-technical losses allocated per the approved loss factor methodology.',
      'Time-of-use profiles: energy delivered and wheeled per TOU periods (peak, standard, off-peak).',
      'Grid code compliance: all parties shall comply with the SA Grid Code (version 10) and Distribution Code.',
      'Connection agreement reference: this agreement is subject to the terms of the Connection Agreement dated [DATE].',
      'Embedded generation requirements per NERSA embedded generation rules and NRS 097.',
    ],
    fields: ['wheeling_route', 'loss_factor', 'tou_profile', 'grid_code_version', 'connection_agreement_ref'],
  },
  {
    document_type: 'loi',
    name: 'Letter of Intent',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Non-binding indication of interest to enter into a definitive agreement.',
      'Exclusivity period: [DAYS] business days from date of signature.',
      'Confidentiality: parties agree to maintain confidentiality of all information exchanged.',
      'Cost allocation: each party bears its own costs in connection with this LOI and the proposed transaction.',
    ],
    fields: ['exclusivity_days', 'proposed_transaction_summary', 'target_completion_date'],
  },
  {
    document_type: 'term_sheet',
    name: 'Term Sheet',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Summary of key commercial terms (binding in respect of clauses marked as binding).',
      'Conditions precedent to definitive agreement.',
      'Target timeline for completion of due diligence and negotiation of definitive agreements.',
      'Break fee: [AMOUNT] payable if either party withdraws without cause after signing.',
    ],
    fields: ['key_terms_summary', 'conditions_precedent', 'due_diligence_deadline', 'break_fee_amount'],
  },
  {
    document_type: 'hoa',
    name: 'Heads of Agreement',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Binding obligations: clauses on confidentiality, exclusivity, and governing law are binding.',
      'Non-binding provisions: all commercial terms are subject to negotiation of definitive agreements.',
      'Long-stop date: if definitive agreements are not signed by [DATE], this HOA automatically terminates.',
      'Material adverse change clause: either party may terminate if a material adverse change occurs.',
    ],
    fields: ['binding_clauses', 'long_stop_date', 'material_adverse_change_definition'],
  },
  {
    document_type: 'side_letter',
    name: 'Side Letter',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Reference to main agreement: this side letter supplements and forms part of [MAIN_AGREEMENT].',
      'Specific amendments or clarifications to the main agreement as detailed herein.',
      'Survival clauses: this side letter survives termination of the main agreement to the extent stated.',
      'Entire agreement confirmation: the main agreement as modified by this side letter constitutes the entire agreement.',
    ],
    fields: ['main_agreement_ref', 'amendments', 'effective_date'],
  },
  {
    document_type: 'nda',
    name: 'Non-Disclosure Agreement',
    mandatory_clauses: MANDATORY_CLAUSES,
    type_specific_clauses: [
      'Definition of Confidential Information: all information disclosed in connection with the proposed transaction.',
      'Permitted disclosures: to professional advisors, employees with need-to-know, and as required by law.',
      'Duration: obligations survive for 3 years from date of disclosure.',
      'Return/destruction: all confidential information to be returned or destroyed within 30 days of written request.',
      'Injunctive relief: disclosing party entitled to seek urgent interdict without proving actual damages.',
    ],
    fields: ['confidentiality_period_years', 'permitted_recipients', 'purpose_of_disclosure'],
  },
];

/** Get template by document type */
export function getTemplate(documentType: string): ContractTemplate | undefined {
  return TEMPLATE_LIBRARY.find(t => t.document_type === documentType);
}

/** Get all mandatory clauses as formatted text */
export function getMandatoryClausesText(): string {
  return MANDATORY_CLAUSES.map((c, i) => `${i + 1}. ${c.title}\n${c.text}`).join('\n\n');
}
