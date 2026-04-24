"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIndividualDays = exports.diffDays = void 0;
const luxon_1 = require("luxon");
const diffDays = (start, end) => {
    if (!start || !end) {
        return 0;
    }
    const startTime = start instanceof Date ? luxon_1.DateTime.fromJSDate(start) : luxon_1.DateTime.fromISO(start);
    const endTime = end instanceof Date ? luxon_1.DateTime.fromJSDate(end) : luxon_1.DateTime.fromISO(end);
    const diff = endTime.diff(startTime, 'days').toObject();
    return Math.ceil(diff.days || 0);
};
exports.diffDays = diffDays;
const getIndividualDays = (start, end) => {
    const numberOfDays = (0, exports.diffDays)(start, end);
    if (numberOfDays === 0 || !start || !end) {
        return [];
    }
    const startTime = start instanceof Date ? luxon_1.DateTime.fromJSDate(start) : luxon_1.DateTime.fromISO(start);
    const endTime = end instanceof Date ? luxon_1.DateTime.fromJSDate(end) : luxon_1.DateTime.fromISO(end);
    const days = [
        {
            start: startTime,
            end: startTime.set({
                minute: endTime.minute,
                hour: endTime.hour,
            }),
        },
    ];
    if (numberOfDays > 1) {
        Array.from(Array(numberOfDays - 2).keys()).map((d) => {
            const date = startTime.plus({
                days: 1,
            });
            days.push({
                start: date,
                end: date.set({
                    minute: endTime.minute,
                    hour: endTime.hour,
                }),
            });
        });
        days.push({
            start: endTime.set({
                minute: startTime.minute,
                hour: startTime.hour,
            }),
            end: endTime,
        });
    }
    return days;
};
exports.getIndividualDays = getIndividualDays;
//# sourceMappingURL=diffDays.js.map