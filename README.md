# fullcalendar
Calendar plugin based on FullCalendar

## How to use
This plugin creates a new viewtemplate which displays a calendar.

You will need a table for your events. It will need several fields:

| Purpose | Type | Required |
|-|-|-|
| Title of event to display on the calendar | string | yes |
| Time/date the event starts | date | yes|
| Is this an all-day event? | bool | no |
| Duration of the event (select unit in the view config | float or int | no|

If you'd rather store your events as a start and end date, rather than a start date and a duration, you can use a calculated field. Create your start and end fields (date type). Then, create a stored calculated field for the duration. Use the formula `(end - start) / 1000`, where end is your end date and start is your start date. In the view configuration, set the unit to Seconds.
