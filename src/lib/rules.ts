/**
 * Comparison / counting rules.
 *
 * Add new rules here — each rule receives the Main Excel rows and the daily
 * report sheet for one date, and returns result rows. The UI renders whatever
 * the rules produce, so no field names are hardcoded in components.
 *
 * The exact rules have not been defined yet, so this list is empty.
 */

import type { ComparisonRule } from "@/lib/comparison";

export const COMPARISON_RULES: ComparisonRule[] = [];
