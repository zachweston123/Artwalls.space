import { generateTimeOptions as generateTimeOptionsJs } from '../../shared/timeOptions.js';

export interface GenerateTimeOptionsParams {
  startTime: string | Date;
  endTime: string | Date;
  intervalMinutes: number;
  baseDate?: Date;
  timezone?: string;
  includeEndIfAligned?: boolean;
}

export interface TimeOption {
  label: string;
  value: string; // ISO string
}

export function generateTimeOptions(params: GenerateTimeOptionsParams): TimeOption[] {
  return generateTimeOptionsJs(params) as TimeOption[];
}
