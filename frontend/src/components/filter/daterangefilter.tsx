import React from 'react';
import './daterangefilter.css';
import { dateRangeService } from '../../services/date-range-selection.service';
import { DateRange } from '../../models/date-range';
import { Slider } from '@mui/material';

var startDate = new Date("1900-01-01");
var endDate = new Date("1920-01-01");

var stepSize = 6;
var startValue = 0;
var endValue = 240 //123 years and 12 month yeach

var sendDateUpdateHandle: any;

class DateRangeFilter extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        var range: number[] = [startValue, endValue];

        this.state = {
            lowerBound: startValue,
            upperBound: endValue,
            value: range,
        };
    }
    onSliderChange = (event: Event, value: number | number[]) => {
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

    getStartDate = (value: any) => {
        var start = new Date(startDate.getFullYear(), startDate.getMonth() + value[0], startDate.getDate());

        return start;
    };

    getEndDate = (value: any) => {
        var start = new Date(startDate.getFullYear(), startDate.getMonth() + value[1], startDate.getDate());

        return start;
    };

    valuetext(value: number) {
        var date = new Date(startDate.getFullYear(), startDate.getMonth() + value, startDate.getDate());
        return date.toDateString();
    }

    render() {
        return (
            <div className='date-range-selection-container'>
                <label>DateRange Selection</label>
                <div className='slider-container'>
                    <Slider min={startValue} max={endValue} valueLabelFormat={value => <div>{this.valuetext(value)}</div>} step={stepSize} value={this.state.value} disableSwap={true} onChange={this.onSliderChange} valueLabelDisplay="auto" getAriaLabel={this.valuetext} getAriaValueText={this.valuetext} />
                    <div className='date-container'>
                        <div className='startDate'>
                            {startDate.toDateString()}
                        </div>
                        <div className='endDate'>
                            {endDate.toDateString()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default DateRangeFilter;