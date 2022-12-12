/*jshint esversion: 8 */

const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");
const { stateFieldsToWhere } = require("@saltcorn/data/plugin-helper");

const {
  text,
  div,
  h3,
  style,
  a,
  script,
  pre,
  domReady,
  i,
} = require("@saltcorn/markup/tags");
const readState = (state, fields) => {
  fields.forEach((f) => {
    const current = state[f.name];
    if (typeof current !== "undefined") {
      if (f.type.read) state[f.name] = f.type.read(current);
      else if (f.type === "Key")
        state[f.name] = current === "null" ? null : +current;
    }
  });
  return state;
};
const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Event Configuration",
        blurb: "Attributes of the events to be displayed on the calendar.",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();

          const expand_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewtemplate, viewrow }) =>
              viewrow.name !== context.viewname
          );
          const expand_view_opts = expand_views.map((v) => v.name);

          const create_views = await View.find_table_views_where(
            context.table_id,
            ({ state_fields, viewrow }) =>
              viewrow.name !== context.viewname &&
              state_fields.every((sf) => !sf.required)
          );
          const create_view_opts = create_views.map((v) => v.name);

          return new Form({
            fields: [
              {
                name: "title_field",
                label: "Event title field",
                type: "String",
                sublabel: "A string for the event name displayed on the calendar.",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "String")
                    .map((f) => f.name)
                    .join(),
                },
              },
              {
                name: "start_field",
                label: "Start field",
                type: "String",
                sublabel: "A date field for when the event starts.",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Date")
                    .map((f) => f.name)
                    .join(),
                },
              },
              {
                name: "end_field",
                label: "End field",
                type: "String",
                sublabel: "A date field for when the event ends.",
                required: false,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Date")
                    .map((f) => f.name)
                    .join(),
                },
                showIf: {switch_to_duration: false},
              },
              {
                name: "duration_field",
                label: "Duration",
                type: "String",
                sublabel: "An 'Int' or 'Float' field for the duration of the event.",
                required: false,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Int" || f.type.name === "Float")
                    .map((f) => f.name)
                    .join(),
                },
                showIf: {switch_to_duration: true},
              },
              {
                name: "duration_units",
                label: "Duration units",
                type: "String",
                sublabel: "Units of duration field",
                required: false,
                attributes: {
                  options: "Seconds,Minutes,Hours,Days",
                },
                showIf: {switch_to_duration: true},
              },
              {
                name: "switch_to_duration",
                label: "Use duration instead",
                sublabel: "Use an event duration instead of an end date",
                type: "Bool",
                required: true,
              },
              {
                name: "allday_field",
                type: "String",
                label: "All-day field",
                sublabel: "Boolean field to specify whether this is an all-day event.",
                required: false,
                attributes: {
                  options: [
                    ...fields
                      .filter((f) => f.type.name === "Bool")
                      .map((f) => f.name),
                    "Always",
                  ].join(),
                },
              },
              {
                name: "event_color",
                type: "String",
                label: "Event Color",
                sublabel: "A 'Color' field to set the color of this event.",
                required: false,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Color")
                    .map((f) => f.name)
                    .join(),
                },
              },
              {
                name: "expand_view",
                label: "Expand View",
                sublabel: "The view that opens when the user clicks on an event.",
                type: "String",
                required: false,
                attributes: {
                  options: expand_view_opts.join(),
                },
              },
              {
                name: "view_to_create",
                label: "Use view to create",
                sublabel: "View to create a new event. Leave blank to have no link to create a new item",
                type: "String",
                attributes: {
                  options: create_view_opts.join(),
                },
              },
            ],
          });
        },
      },
      {
        name: "Calendar Configuration",
        blurb: "Attributes of the calendar itself.",
        form: async (context) => {
          return new Form({
            fields: [
              {
                name: "initialView",
                type: "String",
                label: "Initial calendar view",
                sublabel: "The default calendar view shown when the calendar is loaded. Options: dayGridMonth,dayGridDay,dayGridWeek,timeGridWeek,timeGridDay,listDay,listWeek,listMonth,listYear. Default: 'dayGridMonth'.",
                required: true,
                default: "dayGridMonth",
              },
              {
                name: "calendar_view_options",
                type: "String",
                label: "Calendar view options",
                sublabel: "The view options displayed on the calendar. Separate the options with a comma for a button group, or with a space for separate buttons. Accepts the same options as above. Default: 'dayGridMonth,timeGridWeek,listMonth'.",
                required: true,
                default: "dayGridMonth,timeGridWeek,listMonth",
              },
              {
                name: "custom_calendar_views",
                type: "String",
                label: "Advanced: Custom calendar views",
                sublabel: "Optionally define your own custom calendar views. Provide a FullCalendar views object. See https://github.com/saltcorn/fullcalendar/blob/main/README.md.",
                required: false,
                input_type: "code",
                attributes: { mode: "application/javascript" },
              },
              {
                name: "nowIndicator",
                type: "Bool",
                label: "Current time indicator",
                sublabel: "Display a line to indicate the current time on day and week views",
                required: true,
                default: true,
              },
              {
                name: "weekNumbers",
                type: "Bool",
                label: "Week numbers",
                sublabel: "Display week numbers on the calendar",
                required: true,
                default: false,
              },
              {
                name: "default_event_color",
                type: "String",
                label: "Default event color",
                sublabel: "The default color of calendar events. Accepts any valid CSS color value. Examples: #af2d8b, rgb(124, 0, 201), RoyalBlue.",
                required: true,
                default: "#4e73df",
              },
              {
                name: "limit_to_working_days",
                type: "Bool",
                label: "Limit to working days",
                sublabel: "Only working days in week views",
                sublabel:
                  "Filter out Saturday and Sunday in views designed for weeks (dayGridWeek, timeGridWeek).",
                required: false,
                default: false,
              },
              {
                name: "min_week_view_time",
                type: "String",
                label: "Min time in week views",
                sublabel:
                  "Min time to display in timeGridWeek, e.g. 08:00",
                required: false,
              },
              {
                name: "max_week_view_time",
                type: "String",
                label: "Max time in week views",
                sublabel:
                  "Max time to display in timeGridWeek, e.g. 20:00",
                required: false,
              },
            ],
          });
        },
      },
    ],
  });

const get_state_fields = async (table_id, viewname, { show_view }) => {
  const table_fields = await Field.find({ table_id });
  return table_fields.map((f) => {
    const sf = new Field(f);
    sf.required = false;
    return sf;
  });
};
function addSeconds (date, secs) { // adds seconds to date and returns new date
  const r = new Date(date);
  r.setSeconds(r.getSeconds() + secs);
  return r;
}
const applyDelta = (old, delta) => {
  const msAsSecs = delta.milliseconds !== 0 ? delta.milliseconds / 1000 : 0;
  const daysAsSecs = 24 * 60 * 60 * delta.days;
  const newDate = addSeconds(old, msAsSecs + daysAsSecs);
  if (delta.months !== 0) newDate.setMonth(newDate.getMonth() + delta.months);
  if (delta.years !== 0)
    newDate.setFullYear(newDate.getFullYear() + delta.years);
  return newDate;
};
const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date);
};
const unitSeconds = (duration_units) => {
  //number of seconds per unit- ie if the duration unit is 1 minute, this is 60 seconds. multiply by duration to get length of event in seconds.
  return duration_units === "Seconds"
    ? 1
    : duration_units === "Minutes"
    ? 60
    : duration_units === "Days"
    ? 24 * 60 * 60
    : 60 * 60;
};
const isEmptyDelta = (delta) => {
  return delta
    ? delta.years === 0 &&
        delta.months === 0 &&
        delta.days === 0 &&
        delta.milliseconds === 0
    : true;
};
const eventFromRow = (
  row,
  alwaysAllDay,
  {
    expand_view,
    start_field,
    allday_field,
    end_field,
    duration_field,
    duration_units,
    switch_to_duration,
    title_field,
    event_color,
  }
) => {
  const unitSecs = unitSeconds(duration_units);
  const duration_in_seconds = row[duration_field] * unitSecs; //duration in seconds = duration * unit
  const end_by_duration = addSeconds(row[start_field], duration_in_seconds); //add duration in seconds to start time
  const start = row[start_field]; //start = start field
  const allDay = alwaysAllDay || row[allday_field]; //if allday field is "always", allday=true, otherwise use value
  const end = switch_to_duration ? end_by_duration : row[end_field]; // if using duration, show end by duration. otherwise, use end field value.
  const url = expand_view ? `/view/${expand_view}?id=${row.id}` : undefined; //url to go to when the event is clicked
  const color = row[event_color];
  const id = row.id;
  return {
    title: row[title_field],
    start,
    allDay,
    end,
    url,
    color,
    id,
  };
};

const run = async (
  table_id,
  viewname,
  {
    view_to_create,
    expand_view,
    start_field,
    allday_field,
    end_field,
    duration_units,
    duration_field,
    switch_to_duration,
    title_field,
    nowIndicator,
    weekNumbers,
    initialView,
    default_event_color,
    calendar_view_options,
    custom_calendar_views,
    event_color,
    limit_to_working_days,
    min_week_view_time,
    max_week_view_time,
  },
  state,
  extraArgs
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  readState(state, fields);
  const qstate = await stateFieldsToWhere({ fields, state });
  const rows = await table.getRows(qstate);

  const id = `cal${Math.round(Math.random() * 100000)}`;
  const weekends = limit_to_working_days ? false : true; // fullcalendar flag to filter out weekends
  // parse min/max times or use defaults
  const minAsDate = new Date(`1970-01-01T${min_week_view_time}`);
  const maxAsDate = new Date(`1970-01-01T${max_week_view_time}`);
  const minTime = isValidDate(minAsDate)
    ? minAsDate.toTimeString()
    : "00:00:00";
  const maxTime = isValidDate(maxAsDate)
    ? maxAsDate.toTimeString()
    : "24:00:00";
  const alwaysAllDay = allday_field === "Always";
  const events = rows.map((row) =>
    eventFromRow(row, alwaysAllDay, {
      expand_view,
      start_field,
      allday_field,
      end_field,
      duration_field,
      duration_units,
      switch_to_duration,
      title_field,
      event_color,
    })
  );
  return div(
    script(
      domReady(`
  var calendarEl = document.getElementById('${id}');

  const locale =
    navigator.userLanguage ||
    (navigator.languages &&
      navigator.languages.length &&
      navigator.languages[0]) ||
    navigator.language ||
    navigator.browserLanguage ||
    navigator.systemLanguage ||
    "en";
  const weekViewOptions = {
    weekends: ${weekends},
    slotMinTime: "${minTime}",
    slotMaxTime: "${maxTime}",
  };
  const alwaysAllday = ${alwaysAllDay};
  const isResizeable = ${
    switch_to_duration
      ? duration_field
        ? true
        : false
      : end_field
      ? true
      : false
  };
  var calendar = new FullCalendar.Calendar(calendarEl, {
    locale: locale,
    headerToolbar: {
      left: 'prev,next today${view_to_create ? " add" : ""}',
      center: 'title',
      right: '${calendar_view_options}',
    },
    navLinks: true,
    initialView: '${initialView}',
    ${custom_calendar_views ? custom_calendar_views + "," : ""}
    nowIndicator: ${nowIndicator},
    weekNumbers: ${weekNumbers},
    eventColor: '${default_event_color}',
    ${view_to_create ? `
    customButtons: {
      add: {
        text: 'add',
        click: function() {
          location.href='/view/${view_to_create}';
        }
      }
    },
    selectable: true,
    select: function(info) {
      location.href='/view/${view_to_create}?${start_field}=' + info.startStr ${end_field ? (`+ '&` + end_field + `=' + info.endStr`) : ""};
    },` : "" }
    events: ${JSON.stringify(events)},
    editable: true, 
    eventResizableFromStart: isResizeable,
    eventDurationEditable: isResizeable,
    eventResize: (info) => {
      const rowId = info.event.id;
      const dataObj = { rowId, start: info.event.start, end: info.event.end, };
      view_post('${viewname}', 'update_calendar_event', dataObj,
        (res) => { 
          if(res.error) info.revert();
          else if (res.newEvent) {
            info.event.remove();
            calendar.addEvent(res.newEvent);
          }
        }
      );
    },
    eventDrop: (info) => {
      if (alwaysAllday && !info.event.allDay) {
        notifyAlert({ 
          type: "danger", 
          text: "Setting a time is not allowed when 'All-day' is set to 'Always'.",
        });
        info.revert();
      }
      else {
        const rowId = info.event.id;
        const dataObj = { 
          rowId, delta: info.delta, allDay: info.event.allDay, 
          start: info.event.start, end: info.event.end,
        };
        view_post('${viewname}', 'update_calendar_event', dataObj,
          (res) => { 
            if (res.error) info.revert();
            else if (res.newEvent) {
              info.event.remove();
              calendar.addEvent(res.newEvent);
            } 
          }
        );
      }
    },
    views: {
      dayGridWeek: weekViewOptions,
      timeGridWeek: weekViewOptions,
    },
  });
  calendar.render();`)
    ),
    div({ id })
  );
};

const update_calendar_event = async (
  table_id,
  viewname,
  {
    start_field,
    end_field,
    duration_units,
    duration_field,
    switch_to_duration,
    allday_field,
    expand_view,
    title_field,
    event_color,
  },
  { rowId, delta, allDay, start, end },
  { req }
) => {
  const table = await Table.findOne({ id: table_id });
  const role = req.isAuthenticated() ? req.user.role_id : 10;
  if (role > table.min_role_write) {
    return { json: { error: req.__("Not authorized") } };
  }
  const fields = await table.getFields();
  if (
    switch_to_duration &&
    duration_field &&
    fields &&
    !fields.find((field) => field.name === duration_field)
  ) {
    return { json: { error: req.__("The duration column does not exist.") } };
  }
  const row = await table.getRow({ id: rowId });
  let updateVals = {};
  let allDayChanged = false;
  if (
    allday_field &&
    allday_field !== "Always" &&
    allDay !== undefined &&
    row[allday_field] !== allDay
  ) {
    updateVals[allday_field] = allDay;
    allDayChanged = true;
  }
  const startAsDate = start ? new Date(start) : null;
  if (
    isValidDate(startAsDate) &&
    startAsDate.getTime() !== row[start_field].getTime()
  )
    updateVals[start_field] = startAsDate;
  const endAsDate = end ? new Date(end) : null;
  if (switch_to_duration) {
    if (isValidDate(endAsDate) && isValidDate(startAsDate)) {
      const unitSecs = unitSeconds(duration_units);
      const newDuration = Math.trunc(
        (endAsDate - startAsDate) / 1000 / unitSecs
      );
      const oldDuration = row[duration_field];
      if (newDuration !== oldDuration) updateVals[duration_field] = newDuration;
    }
  } else if (end_field && isValidDate(endAsDate)) {
    updateVals[end_field] = endAsDate;
  } else if (end_field && allDayChanged && !isEmptyDelta(delta)) {
    updateVals[end_field] = applyDelta(row[end_field], delta);
  }
  if (Object.keys(updateVals).length !== 0)
    await table.updateRow(updateVals, rowId, req.user.id);
  const updatedRow = await table.getRow({ id: rowId });
  return {
    json: {
      newEvent: eventFromRow(updatedRow, allday_field === "Always", {
        expand_view,
        start_field,
        allday_field,
        end_field,
        duration_field,
        duration_units,
        switch_to_duration,
        title_field,
        event_color,
      }),
    },
  };
};
const headers = [
  {
    script: "/plugins/public/fullcalendar/main.min.js",
  },
  {
    script: "/plugins/public/fullcalendar/locales-all.min.js",
  },
  {
    css: "/plugins/public/fullcalendar/main.min.css",
  },
];

module.exports = {
  sc_plugin_api_version: 1,
  headers,
  plugin_name: "fullcalendar",
  viewtemplates: [
    {
      name: "Calendar",
      description: "Displays items on a calendar, with options for month, week, agenda, and others.",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
      routes: { update_calendar_event },
    },
  ],
};
