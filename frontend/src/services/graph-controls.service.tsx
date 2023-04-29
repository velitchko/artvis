import { Subject } from 'rxjs';
import { GraphControls } from '../models/graph-controls';

const subject = new Subject();

export const graphControlService = {
    setData: (d: GraphControls) => subject.next({ value: d }),
    clearData: () => subject.next(null),
    getData: () => subject.asObservable()
};