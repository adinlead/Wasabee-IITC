import { WButton } from "../leafletClasses";
import wX from "../wX";
import { undo } from "../undo";
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
        postToFirebase({ id: "analytics", action: "undo" });
        undo();
      },
      context: this,
      title: this.title,
    });
  },
});

export default UndoButton;
