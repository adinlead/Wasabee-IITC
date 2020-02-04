import { Feature } from "./leafletDrawImports";
import { ImportDialogControl } from "./importDialog";
import WasabeeOp from "./operation";

const NewopButtonControl = Feature.extend({
  statics: {
    TYPE: "newopButton"
  },

  initialize: function(map, options) {
    this.type = NewopButtonControl.TYPE;
    Feature.prototype.initialize.call(this, map, options);
  },

  addHooks: function() {
    if (!this._map) return;
    Feature.prototype.addHooks.call(this);
    this._displayDialog(this);
  },

  _displayDialog: function(noHandler) {
    const content = document.createElement("div");
    content.className = "wasabee-dialog wasabee-dialog-ops";
    const buttonSet = content.appendChild(document.createElement("div"));
    buttonSet.className = "temp-op-dialog";
    const addButton = buttonSet.appendChild(document.createElement("a"));
    addButton.textContent = "Add New Op";

    const importButton = buttonSet.appendChild(document.createElement("a"));
    importButton.textContent = "Import Op";
    importButton.addEventListener(
      "click",
      () => {
        noHandler._dialog.dialog("close");
        // window.plugin.wasabee.importString();
        const id = new ImportDialogControl(this._map, null);
        id.enable();
        // console.log(id);
      },
      false
    );

    addButton.addEventListener(
      "click",
      () => {
        noHandler._dialog.dialog("close");
        var promptAction = prompt(
          "Enter an operation name.  Must not be empty.",
          ""
        );
        if (promptAction !== null && promptAction !== "") {
          console.log("promptaction -> " + promptAction);
          var newop = new WasabeeOp(PLAYER.nickname, promptAction, true);
          newop.store();
          window.plugin.wasabee.makeSelectedOperation(newop.ID);
          newop.update();
        } else {
          alert("You must enter a valid Operation name. Try again.");
        }
      },
      false
    );

    this._dialog = window.dialog({
      title: "New Operation",
      width: "auto",
      height: "auto",
      html: content,
      dialogClass: "wasabee-dialog-mustauth",
      closeCallback: function() {
        noHandler.disable();
        delete noHandler._dialog;
      },
      id: window.plugin.Wasabee.static.dialogNames.newopButton
    });
  },

  removeHooks: function() {
    Feature.prototype.removeHooks.call(this);
  }
});

export default NewopButtonControl;
