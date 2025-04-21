export enum JobStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

// Array of all status values for validation
export const JOB_STATUS_VALUES = Object.values(JobStatus)
