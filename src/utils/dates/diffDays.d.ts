import { DateTime } from 'luxon';
export declare const diffDays: (start: string | Date | null, end: string | Date | null) => number;
export type StartEndTime = {
    start: DateTime;
    end: DateTime;
};
export declare const getIndividualDays: (start: string | Date | null, end: string | Date | null) => StartEndTime[];
