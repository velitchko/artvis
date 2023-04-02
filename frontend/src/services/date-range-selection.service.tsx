import { Subject } from 'rxjs';
import { DateRange } from '../models/date-range';

const subject = new Subject();

export const dateRangeService = {
    setData: (d: DateRange) => subject.next({ value: d }),
    clearData: () => subject.next(null),
    getData: () => subject.asObservable()
};