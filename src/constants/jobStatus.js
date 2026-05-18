"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_STATUS_VALUES = exports.JobStatus = void 0;
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["APPROVED"] = "approved";
    JobStatus["REJECTED"] = "rejected";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
// Array of all status values for validation
exports.JOB_STATUS_VALUES = Object.values(JobStatus);
//# sourceMappingURL=jobStatus.js.map