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
        name: "views",
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
          // is all day
          // duration
          // duration units - minutes, hours, days
          // create new view

          return new Form({
            fields: [
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
                sublabel: "Leave blank to have no link to create a new item",
                type: "String",
                attributes: {
                  options: create_view_opts.join(),
                },
              },
              {
                name: "start_field",
                label: "Start time field",
                type: "String",
                sublabel:
                  "The table needs a fields of type 'Date' to track start times.",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "Date")
                    .map((f) => f.name)
                    .join(),
                },
              },
              {
                name: "title_field",
                label: "Title field",
                type: "String",
                sublabel: "Event label displayed on the calendar.",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type.name === "String")
                    .map((f) => f.name)
                    .join(),
                },
              },
              {
                name: "allday_field",
                label: "All day field",
                type: "String",
                sublabel:
                  "The table can supply a fields of type 'Bool' to denote all-day events (overrides duration).",
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
                  "A fields of type 'Int' or 'Float' to denote the duration of the event.",
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
      right: 'dayGridMonth,timeGridWeek,listMonth'
    },
    ${
      view_to_create
        ? `customButtons: {
      add: {
        text: 'add',
        click: function() {
          location.href='/view/${view_to_create}';
        }
      }
    },
    dateClick: function(info) {
      location.href='/view/${view_to_create}?${start_field}='+encodeURIComponent(info.dateStr);
    },`
        : ""
    }
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
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
    },
  ],
};
