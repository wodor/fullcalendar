# fullcalendar
Calendar plugin based on [FullCalendar](https://fullcalendar.io/).
For more information, see the [fullcalendar documentation](https://fullcalendar.io/docs).

## Setup
This plugin creates a new viewtemplate which displays a calendar.

You will need a table for your events. It will need several fields:

| Purpose | Type | Required? |
|-|-|-|
| Title of event to display on the calendar | string | yes |
| Time/date the event starts | date | yes |
| Is this an all-day event? | bool | no |
| Duration of the event | float or int | no |

If you want to store your events with a start and end date, rather than a start date and a duration, you can use a calculated field. Create your start and end fields (date type). Then, create a stored calculated field for the duration. Use the formula `(end - start) / 1000`, where end is your end date and start is your start date. In the view configuration, set the unit to "Seconds".

You can also specify an edit view to create new events and a show/edit view to display when the user clicks an event on the calendar.

## Calendar views
When setting up a calendar, you will have the option to specify different view options such as month, week, day, list, etc. You can use any of the default options listed in the "views" section of the [fullcalendar documentation](https://fullcalendar.io/docs).

Advanced users can specify their own [views object](https://fullcalendar.io/docs/custom-view-with-settings). You can use your custom views in the other fields when setting up your calendar.

Example of a custom views object:
```
views: {
  timeGridFourDay: {
    type: 'timeGrid',
    duration: { days: 4 },
    buttonText: '4 day',
  },
}
```
