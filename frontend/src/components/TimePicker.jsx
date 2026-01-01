import { useState } from 'react';

/**
 * iOS-style time and date picker with large time display and +/- buttons
 */
export default function TimePicker({ value, onChange }) {
    // Parse the value (expects ISO string or Date)
    const dateValue = value instanceof Date ? value : new Date(value);

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const adjustMinutes = (delta) => {
        const newDate = new Date(dateValue);
        newDate.setMinutes(newDate.getMinutes() + delta);
        onChange(newDate);
    };

    const adjustHours = (delta) => {
        const newDate = new Date(dateValue);
        newDate.setHours(newDate.getHours() + delta);
        onChange(newDate);
    };

    const adjustDays = (delta) => {
        const newDate = new Date(dateValue);
        newDate.setDate(newDate.getDate() + delta);
        onChange(newDate);
    };

    const setToNow = () => {
        onChange(new Date());
    };

    return (
        <div className="time-picker">
            {/* Date Row */}
            <div className="time-picker-row">
                <button
                    type="button"
                    className="time-picker-btn"
                    onClick={() => adjustDays(-1)}
                >
                    ◀
                </button>
                <div className="time-picker-value date">
                    {formatDate(dateValue)}
                </div>
                <button
                    type="button"
                    className="time-picker-btn"
                    onClick={() => adjustDays(1)}
                >
                    ▶
                </button>
            </div>

            {/* Time Row */}
            <div className="time-picker-row time-row">
                <div className="time-picker-column">
                    <button
                        type="button"
                        className="time-picker-btn"
                        onClick={() => adjustHours(1)}
                    >
                        ▲
                    </button>
                    <div className="time-picker-value hour">
                        {dateValue.getHours() % 12 || 12}
                    </div>
                    <button
                        type="button"
                        className="time-picker-btn"
                        onClick={() => adjustHours(-1)}
                    >
                        ▼
                    </button>
                </div>

                <div className="time-picker-separator">:</div>

                <div className="time-picker-column">
                    <button
                        type="button"
                        className="time-picker-btn"
                        onClick={() => adjustMinutes(5)}
                    >
                        ▲
                    </button>
                    <div className="time-picker-value minute">
                        {dateValue.getMinutes().toString().padStart(2, '0')}
                    </div>
                    <button
                        type="button"
                        className="time-picker-btn"
                        onClick={() => adjustMinutes(-5)}
                    >
                        ▼
                    </button>
                </div>

                <div className="time-picker-column">
                    <button
                        type="button"
                        className="time-picker-btn"
                        onClick={() => adjustHours(12)}
                    >
                        ▲
                    </button>
                    <div className="time-picker-value ampm">
                        {dateValue.getHours() >= 12 ? 'PM' : 'AM'}
                    </div>
                    <button
                        type="button"
                        className="time-picker-btn"
                        onClick={() => adjustHours(-12)}
                    >
                        ▼
                    </button>
                </div>
            </div>

            {/* Now Button */}
            <button
                type="button"
                className="time-picker-now"
                onClick={setToNow}
            >
                Now
            </button>
        </div>
    );
}
