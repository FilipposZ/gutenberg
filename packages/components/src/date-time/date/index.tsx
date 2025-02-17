/**
 * External dependencies
 */
import moment from 'moment';
import type { Moment } from 'moment';
import { noop } from 'lodash';
// Needed to initialise the default datepicker styles.
// See: https://github.com/airbnb/react-dates#initialize
import 'react-dates/initialize';
// `react-dates` doesn't tree-shake correctly, so we import from the individual
// component here.
import DayPickerSingleDateController from 'react-dates/lib/components/DayPickerSingleDateController';

/**
 * WordPress dependencies
 */
import { useEffect, useRef } from '@wordpress/element';
import { isRTL, _n, sprintf } from '@wordpress/i18n';
import { arrowLeft, arrowRight } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { getMomentDate } from './utils';
import type { DatePickerDayProps, DatePickerProps } from '../types';
import { Day, NavPrevButton, NavNextButton } from './styles';

const TIMEZONELESS_FORMAT = 'YYYY-MM-DDTHH:mm:ss';
const ARIAL_LABEL_TIME_FORMAT = 'dddd, LL';

function DatePickerDay( { day, events = [] }: DatePickerDayProps ) {
	const ref = useRef< HTMLDivElement >( null );

	/*
	 * a11y hack to make the `There is/are n events` string
	 * available speaking for readers,
	 * re-defining the aria-label attribute.
	 * This attribute is handled by the react-dates component.
	 */
	useEffect( () => {
		// Bail when no parent node.
		if ( ! ( ref?.current?.parentNode instanceof Element ) ) {
			return;
		}

		const { parentNode } = ref.current;
		const dayAriaLabel = moment( day ).format( ARIAL_LABEL_TIME_FORMAT );

		if ( ! events.length ) {
			// Set aria-label without event description.
			parentNode.setAttribute( 'aria-label', dayAriaLabel );
			return;
		}

		const dayWithEventsDescription = sprintf(
			// translators: 1: Calendar day format, 2: Calendar event number.
			_n(
				'%1$s. There is %2$d event.',
				'%1$s. There are %2$d events.',
				events.length
			),
			dayAriaLabel,
			events.length
		);

		parentNode.setAttribute( 'aria-label', dayWithEventsDescription );
	}, [ events.length ] );

	return (
		<Day
			ref={ ref }
			className="components-datetime__date__day" // Unused, for backwards compatibility.
			hasEvents={ !! events?.length }
			alignment="center"
		>
			{ day.format( 'D' ) }
		</Day>
	);
}

/**
 * DatePicker is a React component that renders a calendar for date selection.
 *
 * ```jsx
 * import { DatePicker } from '@wordpress/components';
 * import { useState } from '@wordpress/element';
 *
 * const MyDatePicker = () => {
 *   const [ date, setDate ] = useState( new Date() );
 *
 *   return (
 *     <DatePicker
 *       currentDate={ date }
 *       onChange={ ( newDate ) => setDate( newDate ) }
 *     />
 *   );
 * };
 * ```
 */
export function DatePicker( {
	currentDate,
	onChange,
	events,
	isInvalidDate,
	onMonthPreviewed,
}: DatePickerProps ) {
	const nodeRef = useRef< HTMLDivElement >( null );

	const onMonthPreviewedHandler = ( newMonthDate: Moment ) => {
		onMonthPreviewed?.( newMonthDate.toISOString() );
		keepFocusInside();
	};

	/*
	 * Todo: We should remove this function ASAP.
	 * It is kept because focus is lost when we click on the previous and next month buttons.
	 * This focus loss closes the date picker popover.
	 * Ideally we should add an upstream commit on react-dates to fix this issue.
	 */
	const keepFocusInside = () => {
		if ( ! nodeRef.current ) {
			return;
		}

		const { ownerDocument } = nodeRef.current;
		const { activeElement } = ownerDocument;

		// If focus was lost.
		if (
			! activeElement ||
			! nodeRef.current.contains( ownerDocument.activeElement )
		) {
			// Retrieve the focus region div.
			const focusRegion = nodeRef.current.querySelector(
				'.DayPicker_focusRegion'
			);
			if ( ! ( focusRegion instanceof HTMLElement ) ) {
				return;
			}
			// Keep the focus on focus region.
			focusRegion.focus();
		}
	};

	const onChangeMoment = ( newDate: Moment | null ) => {
		if ( ! newDate ) {
			return;
		}

		// If currentDate is null, use now as momentTime to designate hours, minutes, seconds.
		const momentDate = currentDate ? moment( currentDate ) : moment();
		const momentTime = {
			hours: momentDate.hours(),
			minutes: momentDate.minutes(),
			seconds: 0,
		};

		onChange?.( newDate.set( momentTime ).format( TIMEZONELESS_FORMAT ) );

		// Keep focus on the date picker.
		keepFocusInside();
	};

	const getEventsPerDay = ( day: Moment ) => {
		if ( ! events?.length ) {
			return [];
		}

		return events.filter( ( eventDay ) =>
			day.isSame( eventDay.date, 'day' )
		);
	};

	const momentDate = getMomentDate( currentDate );

	return (
		<div className="components-datetime__date" ref={ nodeRef }>
			<DayPickerSingleDateController
				date={ momentDate }
				initialVisibleMonth={ null }
				daySize={ 30 }
				horizontalMonthPadding={ 0 }
				focused
				hideKeyboardShortcutsPanel
				// This is a hack to force the calendar to update on month or year change
				// https://github.com/airbnb/react-dates/issues/240#issuecomment-361776665
				key={ `datepicker-controller-${
					momentDate ? momentDate.format( 'MM-YYYY' ) : 'null'
				}` }
				noBorder
				numberOfMonths={ 1 }
				onDateChange={ onChangeMoment }
				transitionDuration={ 0 }
				weekDayFormat="ddd"
				dayAriaLabelFormat={ ARIAL_LABEL_TIME_FORMAT }
				isRTL={ isRTL() }
				isOutsideRange={ ( date ) => {
					return !! isInvalidDate && isInvalidDate( date.toDate() );
				} }
				onPrevMonthClick={ onMonthPreviewedHandler }
				onNextMonthClick={ onMonthPreviewedHandler }
				renderDayContents={ ( day ) => (
					<DatePickerDay
						day={ day }
						events={ getEventsPerDay( day ) }
					/>
				) }
				renderMonthElement={ ( { month } ) => (
					<>
						<strong>{ month.format( 'MMMM' ) }</strong>{ ' ' }
						{ month.format( 'YYYY' ) }
					</>
				) }
				renderNavPrevButton={ ( { ariaLabel, ...props } ) => (
					<NavPrevButton
						icon={ arrowLeft }
						variant="tertiary"
						aria-label={ ariaLabel }
						{ ...props }
					/>
				) }
				renderNavNextButton={ ( { ariaLabel, ...props } ) => (
					<NavNextButton
						icon={ arrowRight }
						variant="tertiary"
						aria-label={ ariaLabel }
						{ ...props }
					/>
				) }
				onFocusChange={ noop }
			/>
		</div>
	);
}

export default DatePicker;
