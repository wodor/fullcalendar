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

const run = async (
  table_id,
  viewname,
  {
    show_view,
    column_field,
    view_to_create,
    expand_view,
    column_order,
    position_field,
    reload_on_drag,
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

  return div(
    script(
      domReady(`
  var calendarEl = document.getElementById('${id}');
  var calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth'
  });
  calendar.render();`)
    ),
    div({ id })
  );
};

const headers = [
  {
    script: "https://cdn.jsdelivr.net/npm/fullcalendar@5.3.2/main.min.js",
    integrity: "sha256-mMw9aRRFx9TK/L0dn25GKxH/WH7rtFTp+P9Uma+2+zc=",
  },
  {
    css: "https://cdn.jsdelivr.net/npm/fullcalendar@5.3.2/main.min.css",
    integrity: "sha256-uq9PNlMzB+1h01Ij9cx7zeE2OR2pLAfRw3uUUOOPKdA=",
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
