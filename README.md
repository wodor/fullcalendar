# fullcalendar
Calendar plugin based on [https://fullcalendar.io/](FullCalendar). For further documentation: https://fullcalendar.io/docs.

## Setup
This plugin creates a new viewtemplate which displays a calendar.

You will need a table for your events. It will need several fields:

| Purpose | Type | Required? |
|-|-|-|
| Title of event to display on the calendar | string | yes |
| Time/date the event starts | date | yes|
| Is this an all-day event? | bool | no |
| Duration of the event (select unit in the view config) | float or int | no|

If you want to store your events with a start and end date, rather than a start date and a duration, you can use a calculated field. Create your start and end fields (date type). Then, create a stored calculated field for the duration. Use the formula `(end - start) / 1000`, where end is your end date and start is your start date. In the view configuration, set the unit to "Seconds".

You can also specify an edit view to create new events and a show/edit view to display when the user clicks an event on the calendar.
