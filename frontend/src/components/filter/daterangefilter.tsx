import Slider from 'rc-slider';
import React from 'react';
import './index.css';
import { dateRangeService } from '../../services/date-range-selection.service';
import { DateRange } from '../../models/date-range';

var startDate = new Date("1900-01-01");
var endDate = new Date("2023-01-01");

var stepSize = 6;
var startValue = 0;
var endValue = 1467 //123 years and 12 month yeach

var sendDateUpdateHandle: any;

class DateRangeFilter extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = {
            lowerBound: startValue,
            upperBound: endValue,
            value: [startValue, endValue],
        };
    }
    onSliderChange = (value: any) => {
        this.setState({
            value,
        });

        if (sendDateUpdateHandle) {
            window.clearTimeout(sendDateUpdateHandle);
        }

        var dateRange = new DateRange();
        dateRange.startDate = this.getStartDate(value);
        dateRange.endDate = this.getEndDate(value);

        sendDateUpdateHandle = window.setTimeout(function () {
            dateRangeService.setData(dateRange);
        }, 2000);
    };

    onLowerBoundChange = (e: { target: { value: string | number; }; }) => {
        this.setState({ lowerBound: +e.target.value });
    };

    onUpperBoundChange = (e: { target: { value: string | number; }; }) => {
        this.setState({ upperBound: +e.target.value });
    };

    getStartDateString = (value: any) => {
        var start = new Date(startDate.getFullYear(), startDate.getMonth() + value[0], startDate.getDate());

        return start.toDateString();
    };

    getEndDateString = (value: any) => {
        var start = new Date(startDate.getFullYear(), startDate.getMonth() + value[1], startDate.getDate());

        return start.toDateString();
    };

    getStartDate = (value: any) => {
        var start = new Date(startDate.getFullYear(), startDate.getMonth() + value[0], startDate.getDate());

        return start;
    };

    getEndDate = (value: any) => {
        var start = new Date(startDate.getFullYear(), startDate.getMonth() + value[1], startDate.getDate());

        return start;
    };

    render() {
        return (
            <div>
                <Slider min={startValue} max={endValue} step={stepSize} range allowCross={false} value={this.state.value} onChange={this.onSliderChange} />
                <div>
                    <p>StartDate: {this.getStartDateString(this.state.value)}</p>
                    <p>EndDate: {this.getEndDateString(this.state.value)}</p>
                </div>
            </div>
        );
    }
}

export default DateRangeFilter;