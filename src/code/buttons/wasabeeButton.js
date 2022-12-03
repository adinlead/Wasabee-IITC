import { WButton } from "../leafletClasses";
import { WasabeeMe } from "../model";
import TeamListDialog from "../dialogs/teamListDialog";
import OpsDialog from "../dialogs/opsDialog";
import AuthDialog from "../dialogs/authDialog";
import NewopDialog from "../dialogs/newopDialog";
import SettingsDialog from "../dialogs/settingsDialog.js";
import DefensiveKeysDialog from "../dialogs/defensiveKeysDialog";
import { wX } from "../wX";
import { logoutPromise } from "../server";
import { postToFirebase } from "../firebase/logger";
import { displayError } from "../error";

const WasabeeButton = WButton.extend({
  statics: {
    TYPE: "wasabeeButton",
  },

  initialize: function (container) {
    this.type = WasabeeButton.TYPE;
    this.title = wX("WASABEE BUTTON TITLE");
    this.handler = this._toggleActions;
    this._container = container;

    this.button = this._createButton({
      container: container,
      className: "wasabee-toolbar-wasabee",
      callback: this.handler,
      context: this,
      title: this.title,
    });

    this._lastLoginState = false;

    this._buildActions();

    // build and display as if not logged in
    this.setSubActions(this.getSubActions());
    // check login state and update if necessary

    window.map.on("wasabee:ui:skin wasabee:ui:lang", () => {
      this.button.title = wX("WASABEE BUTTON TITLE");
      this._buildActions();
      this.setSubActions(this.getSubActions());
    });

    this.update();
  },

  getSubActions: function () {
    let tmp = [];
    if (!this._lastLoginState) {
      tmp = [this._loginAction];
    } else {
      //    tmp = [this._teamAction];
      tmp = [this._logoutAction];
      tmp.push(this._teamAction);
    }

    tmp = tmp.concat(this._alwaysActions);

    if (this._lastLoginState) {
      tmp = tmp.concat(this._Dactions);
    }

    // settings always at the end
    tmp = tmp.concat(this._SettingsActions);

    return tmp;
  },

  _buildActions: function () {
    this._loginAction = {
      title: wX("LOG IN"),
      text: wX("LOG IN"),
      callback: () => {
        this.disable();
        const ad = new AuthDialog();
        ad.enable();
      },
      context: this,
    };

    this._teamAction = {
      title: wX("TEAMS BUTTON TITLE"),
      text: wX("TEAMS BUTTON"),
      callback: () => {
        this.disable();
        const wd = new TeamListDialog();
        wd.enable();
      },
      context: this,
    };

    //logout out function

    this._logoutAction = {
      title: wX("LOG_OUT"),
      text: wX("LOG_OUT"),
      callback: async () => {
        try {
          await logoutPromise();
        } catch (e) {
          console.error(e);
          displayError(e);
        }
        WasabeeMe.purge();
        postToFirebase({ id: "wasabeeLogout" }); // trigger request firebase token on re-login
      },
      context: this,
    };

    this._teamAction = {
      title: wX("TEAMS BUTTON TITLE"),
      text: wX("TEAMS BUTTON"),
      callback: () => {
        this.disable();
        const wd = new TeamListDialog();
        wd.enable();
      },
      context: this,
    };

    this._alwaysActions = [
      {
        title: wX("OPS BUTTON TITLE"),
        text: wX("OPS BUTTON"),
        callback: () => {
          this.disable();
          const od = new OpsDialog();
          od.enable();
        },
        context: this,
      },
      {
        title: wX("NEWOP BUTTON TITLE"),
        text: wX("NEWOP BUTTON"),
        callback: () => {
          this.disable();
          const nb = new NewopDialog();
          nb.enable();
        },
        context: this,
      },
    ];

    this._Dactions = [
      {
        title: wX("WD BUTTON TITLE"),
        text: wX("WD BUTTON"),
        callback: () => {
          this.disable();
          const dkd = new DefensiveKeysDialog();
          dkd.enable();
        },
        context: this,
      },
    ];

    this._SettingsActions = [
      {
        title: wX("toolbar.wasabee.settings"),
        text: wX("toolbar.wasabee.settings"),
        callback: () => {
          this.disable();
          const sd = new SettingsDialog();
          sd.enable();
        },
        context: this,
      },
    ];
  },

  update: function () {
    // takes container and operation as args, but we don't need them
    const loggedIn = WasabeeMe.isLoggedIn();

    // only change the icon if the state changes -- may be overkill trying to save a few cycles
    if (loggedIn != this._lastLoginState) {
      this._lastLoginState = loggedIn;
      if (loggedIn) this.button.classList.add("wasabee-logged-in");
      else this.button.classList.remove("wasabee-logged-in");

      this.setSubActions(this.getSubActions());
      this.disable();
    }
  },
});

export default WasabeeButton;
