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
                label: "Start time field",
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
                name: "allday_field",
                label: "All-day field",
                type: "String",
                sublabel: "Boolean field to specify whether this is an all-day event (overrides duration).",
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
                name: "duration_field",
                label: "Duration field",
                type: "String",
                sublabel:
                  "A field of type 'Int' or 'Float' to denote the duration of the event.",
                required: false,
                attributes: {
                  options: fields
                    .filter(
                      (f) => f.type.name === "Int" || f.type.name === "Float"
                    )
                    .map((f) => f.name)
                    .join(),
                },
              },
              {
                name: "duration_units",
                label: "Duration units",
                type: "String",
                sublabel: "Units of duration field",
                required: true,
                attributes: {
                  options: "Seconds,Minutes,Hours,Days",
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
                sublabel: "Optionally define your own custom calendar views. Provide a FullCalendar views object. See https://fullcalendar.io/docs/custom-view-with-settings.",
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
const addSeconds = (d, secs) => {
  const r = new Date(d);
  r.setSeconds(r.getSeconds() + r);
  return r;
};
const run = async (
  table_id,
  viewname,
  {
    view_to_create,
    expand_view,
    start_field,
    allday_field,
    duration_field,
    duration_units,
    title_field,
    nowIndicator,
    weekNumbers,
    initialView,
    default_event_color,
    calendar_view_options,
    custom_calendar_views,
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
  const unitSecs =
    duration_units === "Seconds"
      ? 1
      : duration_units === "Minutes"
      ? 60
      : duration_units === "Days"
      ? 24 * 60 * 60
      : 60 * 60;
  const events = rows.map((row) => {
    const start = row[start_field];
    const allDay =
      allday_field === "Always" ||
      row[allday_field] ||
      typeof row[duration_field] === "undefined";

    const end = allDay
      ? undefined
      : addSeconds(start, row[duration_field] * unitSecs);
    const url = expand_view ? `/view/${expand_view}?id=${row.id}` : undefined;
    return { title: row[title_field], start, allDay, end, url };
  });
  return div(
    script(
      domReady(`
  var calendarEl = document.getElementById('${id}');
  var calendar = new FullCalendar.Calendar(calendarEl, {
    headerToolbar: {
      left: 'prev,next today${view_to_create ? " add" : ""}',
      center: 'title',
      right: '${calendar_view_options}',
    },
    initialView: ${initialView},
    ${custom_calendar_views ? custom_calendar_views : ""},
    nowIndicator: ${nowIndicator},
    weekNumbers: ${weekNumbers},
    eventColor: ${default_event_color},
    ${view_to_create ? `
    customButtons: {
      add: {
        text: 'add',
        click: function() {
          location.href='/view/${view_to_create}';
        }
      }
    },
    dateClick: function(info) {
      location.href='/view/${view_to_create}?${start_field}='+encodeURIComponent(info.dateStr);
    },` : "" }
    events: ${JSON.stringify(events)}
  });
  calendar.render();`)
    ),
    div({ id })
  );
};

const headers = [
  {
    script: "https://cdn.jsdelivr.net/npm/fullcalendar@5.10.2/main.min.js",
    integrity: "sha256-YicH/8aE660iEnJtgll3vT54dJApy3XkYmqNfGVFEzA=",
  },
  {
    css: "https://cdn.jsdelivr.net/npm/fullcalendar@5.10.2/main.min.css",
    integrity: "sha256-5veQuRbWaECuYxwap/IOE/DAwNxgm4ikX7nrgsqYp88=",
  },
];

module.exports = {
  sc_plugin_api_version: 1,
  headers,
  viewtemplates: [
    {
      name: "Calendar",
      description: "Displays items on a calendar, with options for month, week, agenda, and others.",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
    },
  ],
};
