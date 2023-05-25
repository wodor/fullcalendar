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
| Time/date the event ends | date | no |
| Duration of the event (instead of end time/date) | float or int | no |
| Is this an all-day event? | bool | no |
| Color of the event | color | no |

You can also specify an edit view to create new events and a show/edit view to display when the user clicks an event on the calendar.

## Calendar views
When setting up a calendar, you will have the option to specify different view options such as month, week, day, list, etc. You can use any of the default options listed in the "views" section of the [fullcalendar documentation](https://fullcalendar.io/docs).

Advanced users can specify their own [views object](https://fullcalendar.io/docs/custom-view-with-settings). You can use your custom views in the other fields when setting up your calendar. This will be appended to the inside of object under `views`

Example of a custom views object:
```
  myView: {
    type: 'timeGrid',
    duration: { weeks: 1 },
    buttonText: 'My View',
    slotDuration: '00:15:00',
  }
```
