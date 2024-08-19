import { WButton } from "../leafletClasses";
import wX from "../wX";
import { undoable, undo } from "../undo";
import { postToFirebase } from "../firebase/logger";

const UndoButton = WButton.extend({
  statics: {
    TYPE: "UndoButton",
  },

  needWritePermission: true,

  initialize: function (container) {
    this.type = UndoButton.TYPE;
    this.title = wX("toolbar.op.undo");

    this.button = this._createButton({
      container: container,
      className: "wasabee-toolbar-undo",
      callback: () => {
        console.log(this);
        this.control.disableAllExcept();
        postToFirebase({ id: "analytics", action: "undo" });
        undo();
      },
      context: this,
      title: this.title,
    });
  },
  update: function () {
    WButton.prototype.update.call(this);
    console.log("UndoButton.update >> ", this);
    if (undoable()) {
      console.log(">> is undoable");
      this.enable();
    } else {
      console.log(">> no undoable");
      this.disable();
    }
  },
  disable: function () {
    console.log("do disable:", this);
    let btn = this.button;
    console.log(btn);
    btn.style.pointerEvents = "none";
    btn.style.cursor = "not-allowed";

    btn.className = "wasabee-toolbar-undo-disable";
  },
  enable: function () {
    console.log("do enable:", this);
    let btn = this.button;
    console.log(btn);
    btn.style.pointerEvents = "auto";
    btn.style.cursor = "pointer";

    btn.className = "wasabee-toolbar-undo";
  },
});

export default UndoButton;
