function QMLItem(meta) {
    QMLQtObject.call(this, meta);
    var child,
        o, i;

    //TODO: handle this better
    if (this.$parent === null) { // This is the root element. Initialize it.
        this.dom = qmlEngine.rootElement || document.body;
        this.dom.innerHTML = "";
        var self = this;
        if (qmlEngine.rootElement == undefined) {
            window.onresize = function() {
                self.implicitHeight = window.innerHeight;
                self.implicitWidth = window.innerWidth;
            }
        } else {
            this.implicitHeight = this.dom.offsetHeight;
            this.implicitWidth = this.dom.offsetWidth;
        }
        this.dom.style.position = "relative"; // Needed to make absolute positioning work
        this.dom.style.top = "0";
        this.dom.style.left = "0";
        this.dom.style.overflow = "hidden"; // No QML stuff should stand out the root element
    } else {
        if (!this.dom) // Create a dom element for this item.
            this.dom = document.createElement("div");
        this.dom.style.position = "absolute";
    }
    this.dom.style.pointerEvents = "none";
    this.dom.className = meta.object.$class + (this.id ? " " + this.id : "");
    this.dom.qml = this;
    this.css = this.dom.style;

    createSimpleProperty("list", this, "data");
    this.$defaultProperty = "data";
    createSimpleProperty("list", this, "children");
    createSimpleProperty("list", this, "resources");
    createSimpleProperty("Item", this, "parent");
    this.children = [];
    this.resources = [];
    if(meta.parent) {
        var newParent = meta.parent
        this.$properties["parent"].value = newParent
        newParent.children.push(this);
        newParent.childrenChanged();
        newParent.dom.appendChild(this.dom);
    }
    this.parentChanged.connect(this, function(newParent, oldParent) {
        if (oldParent) {
            oldParent.children.splice(oldParent.children.indexOf(this), 1);
            oldParent.childrenChanged();
            oldParent.dom.removeChild(this.dom);
        }
        if (newParent && newParent.children.indexOf(this) == -1) {
            newParent.children.push(this);
            newParent.childrenChanged();
        }
        if (newParent)
            newParent.dom.appendChild(this.dom);
    });
    this.parentChanged.connect(this, updateHGeometry);
    this.parentChanged.connect(this, updateVGeometry);
    this.dataChanged.connect(this, function(newData) {
        for (var i in newData) {
            var child = newData[i];
            if (child.hasOwnProperty("parent")) { // Seems to be an Item. TODO: Use real inheritance and ask using instanceof.
//                child.parent = this; // This will also add it to children.
            } else {
                this.resources.push(child);
            }
        }
    });

    createSimpleProperty("bool", this, "activeFocus");
    createSimpleProperty("real", this, "x");
    createSimpleProperty("real", this, "y");
    createSimpleProperty("real", this, "width");
    createSimpleProperty("real", this, "height");
    createSimpleProperty("real", this, "implicitWidth");
    createSimpleProperty("real", this, "implicitHeight");
    createSimpleProperty("real", this, "left");
    createSimpleProperty("real", this, "right");
    createSimpleProperty("real", this, "top");
    createSimpleProperty("real", this, "bottom");
    createSimpleProperty("real", this, "horizontalCenter");
    createSimpleProperty("real", this, "verticalCenter");
    createSimpleProperty("real", this, "rotation");
    createSimpleProperty("real", this, "scale");
    createSimpleProperty("real", this, "z");
    createSimpleProperty("list", this, "transform");
    createSimpleProperty("bool", this, "visible");
    createSimpleProperty("real", this, "opacity");
    createSimpleProperty("bool", this, "clip");
    createSimpleProperty("bool", this, "focus");
    this.xChanged.connect(this, updateHGeometry);
    this.yChanged.connect(this, updateVGeometry);
    this.widthChanged.connect(this, updateHGeometry);
    this.heightChanged.connect(this, updateVGeometry);
    this.implicitWidthChanged.connect(this, updateHGeometry);
    this.implicitHeightChanged.connect(this, updateVGeometry);
    this.focus = false;
    this.activeFocus = false;

    this.Keys = new QObject(this);
    this.Keys.asteriskPresed = Signal();
    this.Keys.backPressed = Signal();
    this.Keys.backtabPressed = Signal();
    this.Keys.callPressed = Signal();
    this.Keys.cancelPressed = Signal();
    this.Keys.deletePressed = Signal();
    for (var i = 0 ; i < 10 ; ++i)
      this.Keys['digit'+i+'Pressed'] = Signal();
    this.Keys.escapePressed = Signal();
    this.Keys.flipPressed = Signal();
    this.Keys.hangupPressed = Signal();
    this.Keys.leftPressed = Signal();
    this.Keys.menuPressed = Signal();
    this.Keys.noPressed = Signal();
    this.Keys.pressed = Signal();
    this.Keys.released = Signal();
    this.Keys.returnPressed = Signal();
    this.Keys.rightPressed = Signal();
    this.Keys.selectPressed = Signal();
    this.Keys.spacePressed = Signal();
    this.Keys.tabPressed = Signal();
    this.Keys.upPressed = Signal();
    this.Keys.volumeDownPressed = Signal();
    this.Keys.volumeUpPressed = Signal();
    this.Keys.yesPressed = Signal();

    this.setupFocusOnDom = (function(element) {
      var updateFocus = (function() {
        var hasFocus = document.activeElement == this.dom || document.activeElement == this.dom.firstChild;

        if (this.activeFocus != hasFocus)
          this.activeFocus = hasFocus;
      }).bind(this);
      element.addEventListener("focus", updateFocus);
      element.addEventListener("blur",  updateFocus);
    }).bind(this);

    this.focusChanged.connect(this, (function(newVal) {
      if (newVal == true) {
        if (this.dom.firstChild != null)
          this.dom.firstChild.focus();
        qmlEngine.activeFocus = this;
      } else if (qmlEngine.activeFocus == this) {
        document.getElementsByTagName("BODY")[0].focus();
        qmlEngine.activeFocus = null;
      }
    }).bind(this));

    this.$isUsingImplicitWidth = true;
    this.$isUsingImplicitHeight = true;

    this.anchors = new QObject(this);
    createSimpleProperty("real", this.anchors, "left");
    createSimpleProperty("real", this.anchors, "right");
    createSimpleProperty("real", this.anchors, "top");
    createSimpleProperty("real", this.anchors, "bottom");
    createSimpleProperty("real", this.anchors, "horizontalCenter");
    createSimpleProperty("real", this.anchors, "verticalCenter");
    createSimpleProperty("Item", this.anchors, "fill");
    createSimpleProperty("Item", this.anchors, "centerIn");
    createSimpleProperty("real", this.anchors, "margins");
    createSimpleProperty("real", this.anchors, "leftMargin");
    createSimpleProperty("real", this.anchors, "rightMargin");
    createSimpleProperty("real", this.anchors, "topMargin");
    createSimpleProperty("real", this.anchors, "bottomMargin");
    this.anchors.leftChanged.connect(this, updateHGeometry);
    this.anchors.rightChanged.connect(this, updateHGeometry);
    this.anchors.topChanged.connect(this, updateVGeometry);
    this.anchors.bottomChanged.connect(this, updateVGeometry);
    this.anchors.horizontalCenterChanged.connect(this, updateHGeometry);
    this.anchors.verticalCenterChanged.connect(this, updateVGeometry);
    this.anchors.fillChanged.connect(this, updateHGeometry);
    this.anchors.fillChanged.connect(this, updateVGeometry);
    this.anchors.centerInChanged.connect(this, updateHGeometry);
    this.anchors.centerInChanged.connect(this, updateVGeometry);
    this.anchors.leftMarginChanged.connect(this, updateHGeometry);
    this.anchors.rightMarginChanged.connect(this, updateHGeometry);
    this.anchors.topMarginChanged.connect(this, updateVGeometry);
    this.anchors.bottomMarginChanged.connect(this, updateVGeometry);
    this.anchors.marginsChanged.connect(this, updateHGeometry);
    this.anchors.marginsChanged.connect(this, updateVGeometry);

    createSimpleProperty("list", this, "states");
    createSimpleProperty("string", this, "state");
    createSimpleProperty("list", this, "transitions");
    this.stateChanged.connect(this, function(newVal, oldVal) {
        var oldState, newState, i, j, k;
        for (i = 0; i < this.states.length; i++)
            if (this.states[i].name === newVal)
                newState = this.states[i];
            else if (this.states[i].name === oldVal)
                oldState = this.states[i];

        var actions = this.$revertActions.slice();

        // Get current values for revert actions
        for (i in actions) {
            var action  = actions[i];
            action.from = action.target[action.property];
        }
        if (newState) {
            var changes = newState.$getAllChanges();

            // Get all actions we need to do and create actions to revert them
            for (i = 0; i < changes.length; i++) {
                var change = changes[i];

                for (j = 0; j < change.$actions.length; j++) {
                    var item = change.$actions[j];

                    var action = {
                        target: change.target,
                        property: item.property,
                        origValue: change.target.$properties[item.property].binding
                                    || change.target.$properties[item.property].val,
                        value: item.value,
                        from: change.target[item.property],
                        to: undefined,
                        explicit: change.explicit
                    };
                    var found = false;
                    for (k in actions)
                        if (actions[k].target == action.target
                            && actions[k].property == action.property) {
                            found = true;
                            actions[k] = action;
                            break;
                        }
                    if (!found)
                        actions.push(action);

                    // Look for existing revert action, else create it
                    var found = false;
                    for (k = 0; k < this.$revertActions.length; k++)
                        if (this.$revertActions[k].target == change.target
                            && this.$revertActions[k].property == item.property) {
                            if (!change.restoreEntryValues)
                                this.$revertActions.splice(k, 1); // We don't want to revert, so remove it
                            found = true;
                            break;
                        }
                    if (!found && change.restoreEntryValues)
                        this.$revertActions.push({
                            target: change.target,
                            property: item.property,
                            value: change.target.$properties[item.property].binding
                                        || change.target.$properties[item.property].val,
                            from: undefined,
                            to: change.target[item.property]
                        });
                }
            }
        }

        // Set all property changes and fetch the actual values afterwards
        // The latter is needed for transitions. We need to set all properties
        // before we fetch the values because properties can be interdependent.
        for (i in actions) {
            var action = actions[i];
            action.target.$properties[action.property].set(action.value, false, action.target,
                                                           newState ? newState.$context: action.target.$context);
        }
        for (i in actions) {
            var action = actions[i];
            action.to = action.target[action.property];
            if (action.explicit) {
                action.target[action.property] = action.target[action.property]; //Remove binding
                action.value = action.target[action.property];
            }
        }

        // Find the best transition to use
        var transition,
            rating = 0;
        for (var i = 0; i < this.transitions.length; i++) {
            this.transitions[i].$stop(); // We need to stop running transitions, so let's do
                                        // it while iterating through the transitions anyway
            var curTransition = this.transitions[i],
                curRating = 0;
            if (curTransition.from == oldVal || curTransition.reversible && curTransition.from == newVal)
                curRating += 2;
            else if (curTransition.from == "*")
                curRating++;
            else
                continue;
            if (curTransition.to == newVal || curTransition.reversible && curTransition.to == oldVal)
                curRating += 2;
            else if (curTransition.to == "*")
                curRating++;
            else
                continue;
            if (curRating > rating) {
                rating = curRating;
                transition = curTransition;
            }
        }
        if (transition)
            transition.$start(actions);
    });

    var QMLRotation  = getConstructor('QtQuick', '2.0', 'Rotation');
    var QMLScale     = getConstructor('QtQuick', '2.0', 'Scale');
    var QMLTranslate = getConstructor('QtQuick', '2.0', 'Translate');

    this.$updateTransform = function() {
            var transform = "rotate(" + this.rotation + "deg) scale(" + this.scale + ")";
            var filter = "";
            var transformStyle = "preserve-3d";

            for (var i = 0; i < this.transform.length; i++) {
                var t = this.transform[i];
                if (t instanceof QMLRotation)
                    transform += " rotate3d(" + t.axis.x + ", " + t.axis.y + ", " + t.axis.z + ", " + t.angle + "deg)";
                else if (t instanceof QMLScale)
                    transform += " scale(" + t.xScale + ", " + t.yScale + ")";
                else if (t instanceof QMLTranslate)
                    transform += " translate(" + t.x + "px, " + t.y + "px)";
                else if (typeof t.transformType != 'undefined') {
                    if (t.transformType == 'filter')
                      filter += t.operation + '(' + t.parameters + ') ';
                }
                else if (typeof t == 'string')
                    transform += t;
            }
            if (typeof this.z == "number")
              transform += " translate3d(0, 0, " + this.z + "px)";
            this.dom.style.transform = transform;
            this.dom.style.transformStyle = transformStyle;
            this.dom.style.MozTransform = transform;    // Firefox
            this.dom.style.webkitTransform = transform; // Chrome, Safari and Opera
            this.dom.style.webkitTransformStyle = transformStyle;
            this.dom.style.OTransform = transform;      // Opera
            this.dom.style.msTransform = transform;     // IE
            this.dom.style.filter = filter;
            this.dom.style.msFilter = filter;     // IE
            this.dom.style.webkitFilter = filter; // Chrome, Safari and Opera
            this.dom.style.MozFilter = filter;    // Firefox
    }
    this.rotationChanged.connect(this, this.$updateTransform);
    this.scaleChanged.connect(this, this.$updateTransform);
    this.transformChanged.connect(this, this.$updateTransform);
    this.visibleChanged.connect(this, function(newVal) {
        this.dom.style.visibility = newVal ? "inherit" : "hidden";
    });
    this.opacityChanged.connect(this, function(newVal) {
        this.dom.style.opacity = newVal;
    });
    this.clipChanged.connect(this, function(newVal) {
        this.dom.style.overflow = newVal ? "hidden" : "visible";
    });
    this.zChanged.connect(this, function(newVal) {
        this.$updateTransform();
    });
    this.xChanged.connect(this, function(newVal) {
        this.dom.style.left = newVal + "px";
    });
    this.yChanged.connect(this, function(newVal) {
        this.dom.style.top = newVal + "px";
    });
    this.widthChanged.connect(this, function(newVal) {
        this.dom.style.width = newVal ? newVal + "px" : "auto";
    });
    this.heightChanged.connect(this, function(newVal) {
        this.dom.style.height = newVal ? newVal + "px" : "auto";
    });

    this.implicitHeight = 0;
    this.implicitWidth = 0;
    this.spacing = 0;
    this.x = 0;
    this.y = 0;
    this.anchors.margins = 0;
    this.visible = true;
    this.opacity = 1;
    this.$revertActions = [];
    this.states = [];
    this.transitions = [];
    this.state = "";
    this.transform = [];
    this.rotation = 0;
    this.scale = 1;
    this.parent = meta.parent

    // Init size of root element
    //TODO handle this better
    if (this.$parent === null && qmlEngine.rootElement == undefined) {
        window.onresize();
    }

    this.$draw = function(c) {
        var i;
        if (this.visible !== false) { // Undefined means inherit, means true
            if (this.$drawItem ) {
                var rotRad = (this.rotation || 0) / 180 * Math.PI,
                    rotOffsetX = Math.sin(rotRad) * this.width,
                    rotOffsetY = Math.sin(rotRad) * this.height;
                c.save();

                // Handle rotation
                // todo: implement transformOrigin
                c.globalAlpha = this.opacity;
                c.translate(this.left + rotOffsetX, this.top + rotOffsetY);
                c.rotate(rotRad);
                c.translate(-this.left, -this.top);
                // Leave offset for drawing...
                this.$drawItem(c);
                c.translate(-rotOffsetX, -rotOffsetY);
                c.restore();
            }
            for (i = 0; i < this.children.length; i++) {
                if (this.children[i]
                    && this.children[i].$draw) {
                    this.children[i].$draw(c);
                }
            }
        }
    }
}

constructors["Item"] = QMLItem
// registerQmlType({
//  module: 'QtQuick',
//  name:   'Rotation',
//  versions: /.*/,
//  constructor: QMLItem})
