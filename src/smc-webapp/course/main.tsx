/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//#############################################################################
//
//    CoCalc: Collaborative Calculation in the Cloud
//
//    Copyright (C) 2016, Sagemath Inc.
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
//##############################################################################

/*
Course Management
*/

// standard non-CoCalc libraries
import { Map, Set } from "immutable";

// CoCalc libraries
const misc = require("smc-util/misc");

// React libraries
import {
  React,
  rclass,
  rtypes,
  Component,
  AppRedux,
  redux
} from "../app-framework";

import { Button, ButtonGroup, Nav, NavItem, Tab } from "react-bootstrap";

const {
  ActivityDisplay,
  ErrorDisplay,
  Icon,
  Loading,
  SaveButton,
  VisibleMDLG
} = require("../r_misc");

// Course components
import {
  CourseStore,
  StudentsMap,
  AssignmentsMap,
  HandoutsMap,
  CourseSettingsRecord,
  AssignmentRecord
} from "./store";
import { CourseActions } from "./actions";
import { create_sync_db } from "./sync";
import { CSSProperties } from "react";

import { StudentsPanel, StudentsPanelHeader } from "./students_panel";
import { AssignmentsPanel, AssignmentsPanelHeader } from "./assignments_panel";
import { HandoutsPanel, HandoutsPanelHeader } from "./handouts_panel";
import {
  ConfigurationPanel,
  ConfigurationPanelHeader
} from "./configuration_panel";
import { PayBanner } from "./pay-banner";
import {
  SharedProjectPanel,
  SharedProjectPanelHeader
} from "./shared_project_panel";
import { UserMap, ProjectMap } from "../todo-types";
const redux_name = (project_id, course_filename) =>
  `editor-${project_id}-${course_filename}`;

const syncdbs = {};

export function init_redux(
  course_filename: string,
  redux: AppRedux,
  course_project_id: string,
  the_redux_name?: string
): string {
  if (the_redux_name == null) {
    the_redux_name = redux_name(course_project_id, course_filename);
  }
  if (redux.getActions(the_redux_name) != null) {
    // already initalized
    return the_redux_name;
  }

  // DO NOT initialize settings here. They are initialized in sync.ts to prevent a
  // race condition involving automatic course configuration and settings
  const initial_store_state: any = {
    assignments: Map<string, AssignmentRecord>(),
    configure_projects: "",
    error: undefined,
    active_feedback_edits: Map(),
    handouts: Map(),
    saving: false,
    show_save_button: false,
    students: Map(),
    tab: "students",
    unsaved: false,
    course_filename,
    course_project_id,
    expanded_students: Set(), // Set of student id's (string) which should be expanded on render
    expanded_assignments: Set(), // Set of assignment id's (string) which should be expanded on render
    expanded_handouts: Set(), // Set of handout id's (string) which should be expanded on render
    expanded_peer_configs: Set(), // Set of assignment configs (key = assignment_id) which should be expanded on render
    expanded_skip_gradings: Set(),
    active_student_sort: { column_name: "last_name", is_descending: false },
    active_assignment_sort: { column_name: "due_date", is_descending: false },
    action_all_projects_state: "any"
  };

  const store: CourseStore = redux.createStore(
    the_redux_name,
    CourseStore as any,
    initial_store_state
  ) as CourseStore;
  const actions: CourseActions = redux.createActions(
    the_redux_name,
    CourseActions
  );
  actions.syncdb = syncdbs[the_redux_name] = create_sync_db(
    redux,
    actions,
    store,
    course_filename
  );

  return the_redux_name;
}

export function remove_redux(
  course_filename: string,
  redux: AppRedux,
  course_project_id: string,
  the_redux_name?: string
) {
  if (the_redux_name == null) {
    the_redux_name = redux_name(course_project_id, course_filename);
  }

  // Remove the listener for changes in the collaborators on this project.
  const actions: CourseActions = redux.getActions(the_redux_name);
  if (actions == null) {
    // already cleaned up and removed.
    return;
  }
  redux
    .getStore("projects")
    .removeListener("change", actions.handle_projects_store_update);

  // Remove the store and actions.
  redux.removeStore(the_redux_name);
  redux.removeActions(the_redux_name);
  if (syncdbs[the_redux_name] != null) {
    syncdbs[the_redux_name].close();
  }
  delete syncdbs[the_redux_name];
  return the_redux_name;
}

const COURSE_EDITOR_STYLE: CSSProperties = {
  height: "100%",
  overflowY: "auto",
  overflowX: "hidden"
};

interface CourseReactProps {
  redux: AppRedux;
  name: string;
  project_id: string;
  path: string;
  saving?: boolean;
  show_save_button?: boolean;
}

interface CourseReduxProps {
  error: string;
  tab: string;
  activity: Map<any, any>; // status messages about current activity happening (e.g., things being assigned)
  students: StudentsMap;
  assignments: AssignmentsMap;
  handouts: HandoutsMap;
  settings: CourseSettingsRecord;
  unsaved: boolean;
  loading: boolean;
  configuring_projects?: boolean;

  user_map: UserMap;

  project_map: ProjectMap;
}

export const CourseEditor = rclass<CourseReactProps>(
  class CourseEditor extends Component<CourseReactProps & CourseReduxProps> {
    displayName: "CourseEditor-Main";

    static reduxProps = ({ name }) => {
      return {
        [name]: {
          loading: rtypes.bool,
          error: rtypes.string,
          tab: rtypes.string,
          activity: rtypes.immutable.Map, // status messages about current activity happening (e.g., things being assigned)
          students: rtypes.immutable.Map,
          assignments: rtypes.immutable.Map,
          handouts: rtypes.immutable.Map,
          settings: rtypes.immutable.Map,
          unsaved: rtypes.bool,
          configuring_projects: rtypes.bool
        },
        users: {
          user_map: rtypes.immutable
        },
        projects: {
          project_map: rtypes.immutable
        }
      };
    }; // gets updated when student is active on their project

    shouldComponentUpdate(props) {
      return misc.is_different(this.props, props, [
        "error",
        "tab",
        "activity",
        "students",
        "assignments",
        "handouts",
        "settings",
        "unsaved",
        "user_map",
        "project_map",
        "configuring_projects"
      ]);
    }

    get_actions(): CourseActions {
      return redux.getActions(this.props.name);
    }

    render_activity() {
      return (
        <ActivityDisplay
          activity={misc.values(
            this.props.activity != null ? this.props.activity.toJS() : undefined
          )}
          trunc={80}
          on_clear={() => this.get_actions().clear_activity()}
        />
      );
    }

    render_error() {
      return (
        <ErrorDisplay
          error={this.props.error}
          onClose={() => this.get_actions().set_error("")}
        />
      );
    }

    render_pay_banner() {
      return (
        <PayBanner
          settings={this.props.settings}
          num_students={
            this.props.students != null ? this.props.students.size : 0
          }
          tab={this.props.tab}
          name={this.props.name}
        />
      );
    }

    render_save_button() {
      return (
        <SaveButton
          saving={this.props.saving}
          unsaved={true}
          on_click={() => this.get_actions().save()}
        />
      );
    }

    show_files = () => {
      return this.props.redux != null
        ? this.props.redux
            .getProjectActions(this.props.project_id)
            .set_active_tab("files")
        : undefined;
    };

    render_files_button() {
      return (
        <Button
          className="smc-small-only"
          style={{ float: "right", marginLeft: "15px" }}
          onClick={this.show_files}
        >
          <Icon name="toggle-up" /> Files
        </Button>
      );
    }

    show_timetravel = () => {
      return this.props.redux != null
        ? this.props.redux.getProjectActions(this.props.project_id).open_file({
            path: misc.history_path(this.props.path),
            foreground: true,
            foreground_project: true
          })
        : undefined;
    };

    save_to_disk = () => {
      return this.props.redux != null ? this.get_actions().save() : undefined;
    };

    render_save_timetravel() {
      return (
        <div style={{ position: "absolute", right: "15px" }}>
          <ButtonGroup>
            <Button
              onClick={this.save_to_disk}
              bsStyle="success"
              disabled={!this.props.unsaved}
            >
              <Icon name="save" /> <VisibleMDLG>Save</VisibleMDLG>
            </Button>
            <Button onClick={this.show_timetravel} bsStyle="info">
              <Icon name="history" /> <VisibleMDLG>TimeTravel</VisibleMDLG>
            </Button>
          </ButtonGroup>
        </div>
      );
    }

    num_students() {
      return __guard__(this.props.redux.getStore(this.props.name), x =>
        x.num_students()
      );
    }

    num_assignments() {
      return __guard__(this.props.redux.getStore(this.props.name), x =>
        x.num_assignments()
      );
    }

    num_handouts() {
      return __guard__(this.props.redux.getStore(this.props.name), x =>
        x.num_handouts()
      );
    }

    render_loading() {
      if (!this.props.loading) {
        return;
      }
      return (
        <div style={{ textAlign: "center" }}>
          <Loading theme={"medium"} />
        </div>
      );
    }

    render_students() {
      if (
        !this.props.loading &&
        this.props.redux != null &&
        this.props.students != null &&
        this.props.user_map != null &&
        this.props.project_map != null
      ) {
        return (
          <StudentsPanel
            redux={this.props.redux}
            students={this.props.students}
            name={this.props.name}
            project_id={this.props.project_id}
            user_map={this.props.user_map}
            project_map={this.props.project_map}
            assignments={this.props.assignments}
          />
        );
      } else {
        return <Loading theme={"medium"} />;
      }
    }

    render_assignments() {
      if (
        !this.props.loading &&
        this.props.redux != null &&
        this.props.assignments != null &&
        this.props.user_map != null &&
        this.props.students != null
      ) {
        return (
          <AssignmentsPanel
            actions={this.props.redux.getActions(this.props.name)}
            redux={this.props.redux}
            assignments={this.props.assignments}
            name={this.props.name}
            project_id={this.props.project_id}
            user_map={this.props.user_map}
            students={this.props.students}
          />
        );
      } else {
        return <Loading theme={"medium"} />;
      }
    }

    render_handouts() {
      if (
        !this.props.loading &&
        this.props.redux != null &&
        this.props.assignments != null &&
        this.props.user_map != null &&
        this.props.students != null
      ) {
        return (
          <HandoutsPanel
            actions={this.props.redux.getActions(this.props.name)}
            handouts={this.props.handouts}
            project_id={this.props.project_id}
            user_map={this.props.user_map}
            students={this.props.students}
            name={this.props.name}
          />
        );
      } else {
        return <Loading theme={"medium"} />;
      }
    }

    render_configuration() {
      if (
        !this.props.loading &&
        this.props.redux != null &&
        this.props.settings != null
      ) {
        return (
          <ConfigurationPanel
            redux={this.props.redux}
            settings={this.props.settings}
            name={this.props.name}
            project_id={this.props.project_id}
            path={this.props.path}
            project_map={this.props.project_map}
            configuring_projects={this.props.configuring_projects}
          />
        );
      } else {
        return <Loading theme={"medium"} />;
      }
    }

    render_shared_project() {
      if (
        !this.props.loading &&
        this.props.redux != null &&
        this.props.settings != null
      ) {
        return (
          <SharedProjectPanel
            redux={this.props.redux}
            name={this.props.name}
            settings={this.props.settings}
          />
        );
      } else {
        return <Loading theme={"medium"} />;
      }
    }

    render_students_tab() {
      if (this.props.tab != "students") return;
      return (
        <Tab.Pane
          eventKey={"students"}
          className={"smc-vfill"}
          style={{ display: "flex" }}
        >
          {this.render_students()}
        </Tab.Pane>
      );
    }

    render_assignments_tab() {
      if (this.props.tab != "assignments") return;
      return (
        <Tab.Pane
          eventKey={"assignments"}
          className={"smc-vfill"}
          style={{ display: "flex" }}
        >
          {this.render_assignments()}
        </Tab.Pane>
      );
    }

    render_handouts_tab() {
      if (this.props.tab != "handouts") return;
      return (
        <Tab.Pane
          eventKey={"handouts"}
          className={"smc-vfill"}
          style={{ display: "flex" }}
        >
          {this.render_handouts()}
        </Tab.Pane>
      );
    }

    render_configuration_tab() {
      if (this.props.tab != "configuration") return;
      return (
        <Tab.Pane
          eventKey={"configuration"}
          className={"smc-vfill"}
          style={{ display: "flex" }}
        >
          {this.render_configuration()}
        </Tab.Pane>
      );
    }

    render_shared_project_tab() {
      if (this.props.tab != "shared_project") return;
      return (
        <Tab.Pane
          eventKey={"shared_project"}
          className={"smc-vfill"}
          style={{ display: "flex" }}
        >
          {this.render_shared_project()}
        </Tab.Pane>
      );
    }

    render_tabs() {
      if (this.props.loading) {
        return;
      }
      return (
        <Tab.Container
          id={"course-tabs"}
          activeKey={this.props.tab}
          onSelect={key => this.get_actions().set_tab(key)}
          className={"smc-vfill"}
          style={{ padding: "5px 0 0 5px" }}
        >
          <div className={"smc-vfill"}>
            <Nav bsStyle="pills">
              <NavItem eventKey="students">
                <StudentsPanelHeader n={this.num_students()} />
              </NavItem>
              <NavItem eventKey="assignments">
                <AssignmentsPanelHeader n={this.num_assignments()} />
              </NavItem>
              <NavItem eventKey="handouts">
                <HandoutsPanelHeader n={this.num_handouts()} />
              </NavItem>
              <NavItem eventKey="configuration">
                <ConfigurationPanelHeader />
              </NavItem>
              <NavItem eventKey="shared_project">
                <SharedProjectPanelHeader
                  project_exists={
                    !!(
                      this.props.settings &&
                      this.props.settings.get("shared_project_id")
                    )
                  }
                />
              </NavItem>
            </Nav>

            <Tab.Content className={"smc-vfill"} style={{ marginTop: "5px" }}>
              {this.render_students_tab()}
              {this.render_assignments_tab()}
              {this.render_handouts_tab()}
              {this.render_configuration_tab()}
              {this.render_shared_project_tab()}
            </Tab.Content>
          </div>
        </Tab.Container>
      );
    }

    render() {
      return (
        <div style={COURSE_EDITOR_STYLE} className={"smc-vfill"}>
          {this.render_pay_banner()}
          {this.props.show_save_button ? this.render_save_button() : undefined}
          {this.props.error ? this.render_error() : undefined}
          {this.props.activity != null ? this.render_activity() : undefined}
          {this.render_files_button()}
          {this.render_save_timetravel()}
          {this.render_tabs()}
          {this.render_loading()}
        </div>
      );
    }
  }
);

require("project_file").register_file_editor({
  ext: "course2", // temparily in case some hideous bug is discovered in new frame editor version, so trivial to revert/test.
  icon: "graduation-cap",
  init: init_redux,
  component: CourseEditor,
  remove: remove_redux
});

function __guard__(value, transform) {
  return typeof value !== "undefined" && value !== null
    ? transform(value)
    : undefined;
}