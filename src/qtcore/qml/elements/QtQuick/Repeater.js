registerQmlType({
  module:   'QtQuick',
  name:     'Repeater',
  versions: /.*/,
  constructor: function QMLRepeater(meta) {
    QMLItem.call(this, meta);
    var self = this;
    var QMLListModel = getConstructor('QtQuick', '2.0', 'ListModel');

    createSimpleProperty("Component", this, "delegate");
    this.container = function() { return this.parent; }
    this.$defaultProperty = "delegate";
    createSimpleProperty("variant", this, "model");
    createSimpleProperty("int", this, "count");
    this.$completed = false;
    this.$items = []; // List of created items
    this._childrenInserted = Signal();

    this.modelChanged.connect(applyModel);
    this.delegateChanged.connect(applyModel);

    this.model = 0;
    this.count = 0;

    this.itemAt = function(index) {
        return this.$items[index];
    }

    function callOnCompleted(child) {
        child.Component.completed();
        for (var i = 0; i < child.children.length; i++)
            callOnCompleted(child.children[i]);
    }
    function insertChildren(startIndex, endIndex) {
        for (var index = startIndex; index < endIndex; index++) {
            var newItem = self.delegate.createObject(self);

            createSimpleProperty("int", newItem, "index");
            var model = self.model instanceof QMLListModel ? self.model.$model : self.model;
            for (var i in model.roleNames) {
                if (typeof newItem.$properties[model.roleNames[i]] == 'undefined')
                  createSimpleProperty("variant", newItem, model.roleNames[i]);
                newItem.$properties[model.roleNames[i]].set(model.data(index, model.roleNames[i]), true, newItem, self.model.$context);
            }

            self.container().children.splice(self.parent.children.indexOf(self) - self.$items.length + index, 0, newItem);
            newItem.parent = self.container();
            self.container().childrenChanged();
            self.$items.splice(index, 0, newItem);

            newItem.index = index;

            if (qmlEngine.operationState !== QMLOperationState.Init) {
                // We don't call those on first creation, as they will be called
                // by the regular creation-procedures at the right time.
                qmlEngine.$initializePropertyBindings();
                callOnCompleted(newItem);
            }
        }
        for (var i = endIndex; i < self.$items.length; i++)
            self.$items[i].index = i;

        self.count = self.$items.length;
    }

    function applyModel() {
        if (!self.delegate)
            return;
        var model = self.model instanceof QMLListModel ? self.model.$model : self.model;
        if (model instanceof JSItemModel) {
            model.dataChanged.connect(function(startIndex, endIndex) {
                //TODO
            });
            model.rowsInserted.connect(insertChildren);
            model.rowsMoved.connect(function(sourceStartIndex, sourceEndIndex, destinationIndex) {
                var vals = self.$items.splice(sourceStartIndex, sourceEndIndex-sourceStartIndex);
                for (var i = 0; i < vals.length; i++) {
                    self.$items.splice(destinationIndex + i, 0, vals[i]);
                }
                var smallestChangedIndex = sourceStartIndex < destinationIndex
                                        ? sourceStartIndex : destinationIndex;
                for (var i = smallestChangedIndex; i < self.$items.length; i++) {
                    self.$items[i].index = i;
                }
            });
            model.rowsRemoved.connect(function(startIndex, endIndex) {
                removeChildren(startIndex, endIndex);
                for (var i = startIndex; i < self.$items.length; i++) {
                    self.$items[i].index = i;
                }
                self.count = self.$items.length;
            });
            model.modelReset.connect(function() {
                removeChildren(0, self.$items.length);
                insertChildren(0, model.rowCount());
            });

            insertChildren(0, model.rowCount());
        } else if (typeof model == "number") {
            removeChildren(0, self.$items.length);
            insertChildren(0, model);
        }
    }

    function removeChildren(startIndex, endIndex) {
        var removed = self.$items.splice(startIndex, endIndex - startIndex);
        for (var index in removed) {
            removed[index].$delete();
            removed[index].parent = undefined;
            removeChildProperties(removed[index]);
        }
    }
    function removeChildProperties(child) {
        qmlEngine.completedSignals.splice(qmlEngine.completedSignals.indexOf(child.Component.completed), 1);
        for (var i = 0; i < child.children.length; i++)
            removeChildProperties(child.children[i])
    }
  }
});
