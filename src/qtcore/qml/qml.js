var GETTER = "__defineGetter__",
    SETTER = "__defineSetter__",
    Undefined = undefined,
    // Property that is currently beeing evaluated. Used to get the information
    // which property called the getter of a certain other property for
    // evaluation and is thus dependant on it.
    evaluatingProperty = undefined,
    // All object constructors
    constructors = {
      int:         QMLInteger,
      real:        Number,
      double:      Number,
      string:      String,
      bool:        Boolean,
      list:        QMLList,
      enum:        Number,
      url:         String,
      variant:     QMLVariant,
      'var':       QMLVariant,
      QMLDocument: QMLComponent
    };
var modules = {
    Main: constructors
  };
/**
 * Inheritance helper
 */
Object.create = function (o) {
    function F() {}
    F.prototype = o;
    return new F();
};

// Helper. Adds a type to the constructor list
global.registerGlobalQmlType = function (name, type) {
  global[type.name]  = type;
  constructors[name] = type;
  modules.Main[name] = type;
};

// Helper. Register a type to a module
global.registerQmlType = function(options) {
  if (typeof options != 'object') {
    registerGlobalQmlType(arguments[0], arguments[1]);
  } else {
    var moduleDescriptor = {
      name:        options.name,
      versions:    options.versions,
      constructor: options.constructor
    };

    if (typeof modules[options.module] == 'undefined')
      modules[options.module] = [];
    modules[options.module].push(moduleDescriptor);
  }
};

global.getConstructor = function (moduleName, version, name) {
  if (typeof modules[moduleName] != 'undefined') {
    for (var i = 0 ; i < modules[moduleName].length ; ++i) {
      var type = modules[moduleName][i];

      if (type.name == name && type.versions.test(version))
        return type.constructor;
    }
  }
  return null;
};

global.collectConstructorsForModule = function (moduleName, version) {
  var constructors = {};

  if (typeof modules[moduleName] == 'undefined') {
    console.warn("module `" + moduleName + "` not found");
    return constructors;
  }
  for (var i = 0 ; i < modules[moduleName].length ; ++i) {
    var module = modules[moduleName][i];

    if (module.versions.test(version)) {
      constructors[module.name] = module.constructor;
    }
  }
  return constructors;
};

global.perContextConstructors = {};

global.copyImports = function (fromId, toId) {
  perContextConstructors[toId] = perContextConstructors[fromId]
}

global.loadImports = function (self, imports) {
  var constructors = mergeObjects(modules.Main, perContextConstructors[self.contextId]);
  for (var i = 0 ; i < imports.length ; ++i) {
    var importDesc         = imports[i];
    var moduleConstructors = collectConstructorsForModule(importDesc.subject, importDesc.version);

    if (importDesc.alias != null)
      constructors[importDesc.alias] = mergeObjects(moduleConstructors, constructors[importDesc.alias]);
    else
      constructors                   = mergeObjects(moduleConstructors, constructors);
  }
  perContextConstructors[self.contextId] = constructors;
}

/**
 * Helper function.
 * Prints msg and values of object. Workaround when using getter functions as
 * Chrome (at least) won't show property values for them.
 * @param {String} msg Message
 * @param {Object} obj Object to use (will be "printed", too)
 * @param {Array} vals Values to list from the object.
 */
function descr(msg, obj, vals) {
    var str = msg + ": [" + obj.id + "] ",
        i;
    for (i = 0; i < vals.length; i++) {
        str += vals[i] + "=" + obj[vals[i]] + " ";
    }
    console.log(str, obj);
}

/**
 * QML Object constructor.
 * @param {Object} meta Meta information about the object and the creation context
 * @return {Object} New qml object
 */
function construct(meta) {
    var item,
        cTree,
        applyProp;
    if (constructors[meta.object.$class] == QMLComponent) {
        item = new QMLComponent();
        item.setData(meta.object)
        item.context = new QMLContext(meta.context);
        applyProp = false;
    }
    else if (meta.object.$class in constructors) {
        item = new constructors[meta.object.$class](meta);
        applyProp = true;
    } else if (perContextConstructors[meta.context.contextId] && meta.object.$class in perContextConstructors[meta.context.contextId]) {
        item = new perContextConstructors[meta.context.contextId][meta.object.$class](meta);
        applyProp = true;
    } else if (cTree = qmlEngine.loadComponent(meta.object.$class)) {
        if (cTree.$children.length !== 1)
            console.error("A QML component must only contain one root element!");
        var newContext = new QMLContext(meta.context);
        var comp = new QMLComponent();
        comp.setData(cTree)
        comp.$parent = meta.parent
        var rootItem = comp.create(newContext);
        
        item = {}
        var $properties = rootItem.$properties
        for (var i in $properties) {
            createSimpleProperty("alias", item, i);
            item.$properties[i].item = rootItem;
            item.$properties[i].prop = i;
            item.$properties[i].get = function() {
                return this.item[this.prop].get()
            }
            item.$properties[i].set = function(newVal, fromAnimation, objectScope, context) {
                this.item[this.prop].set(newVal, fromAnimation, objectScope, context);
            }
        }
 
        // Recall QMLQtObject with the meta of the instance in order to get property
        // definitions, etc. from the instance
//        QMLQtObject.call(rootItem, meta);
        if (typeof rootItem.dom != 'undefined')
          rootItem.dom.className += " " + meta.object.$class + (meta.object.id ? " " + meta.object.id : "");
        var dProp; // Handle default properties
        applyProp = true;
    } else {
        console.log("No constructor found for " + meta.object.$class);
        return;
    }

    // id
    if (meta.object.id)
        meta.context.setContextProperty(meta.object.id,item)

    // Apply properties (Bindings won't get evaluated, yet)
    if(applyProp)
        applyProperties(meta.object, item, item, meta.context);

    return item;
}

/**
 * Create property getters and setters for object.
 * @param {Object} obj Object for which gsetters will be set
 * @param {String} propName Property name
 * @param {Object} [options] Options that allow finetuning of the property
 */
function createSimpleProperty(type, obj, propName, access) {
    var prop = new QMLProperty(type, obj, propName);
    var getter, setter;
    if (typeof access == 'undefined' || access == null)
      access = 'rw';

    obj[propName + "Changed"] = prop.changed;
    obj.$properties[propName] = prop;
    getter = function()       { return obj.$properties[propName].get(); };
    if (access == 'rw')
      setter = function(newVal) { return obj.$properties[propName].set(newVal); };
    else {
      setter = function(newVal) {
        if (obj.$canEditReadOnlyProperties != true)
          throw "property '" + propName + "' has read only access";
        return obj.$properties[propName].set(newVal);
      }
    }
    setupGetterSetter(obj, propName, getter, setter);
    if (obj.$isComponentRoot)
        setupGetterSetter(obj.$context.getContextObject(), propName, getter, setter);
}

/**
 * Set up simple getter function for property
 */
var setupGetter,
    setupSetter,
    setupGetterSetter;
(function() {

// todo: What's wrong with Object.defineProperty on some browsers?
// Object.defineProperty is the standard way to setup getters and setters.
// However, the following way to use Object.defineProperty don't work on some
// webkit-based browsers, namely Safari, iPad, iPhone and Nokia N9 browser.
// Chrome, firefox and opera still digest them fine.

// So, if the deprecated __defineGetter__ is available, use those, and if not
// use the standard Object.defineProperty (IE for example).

    var useDefineProperty = !(Object[GETTER] && Object[SETTER]);

    if (useDefineProperty) {

        if (!Object.defineProperty) {
            console.log("No __defineGetter__ or defineProperty available!");
        }

        setupGetter = function(obj, propName, func) {
            Object.defineProperty(obj, propName,
                { get: func, configurable: true, enumerable: true } );
        }
        setupSetter = function(obj, propName, func) {
            Object.defineProperty(obj, propName,
                { set: func, configurable: true, enumerable: false });
        }
        setupGetterSetter = function(obj, propName, getter, setter) {
            Object.defineProperty(obj, propName,
                {get: getter, set: setter, configurable: true, enumerable: false });
        }
    } else {
        setupGetter = function(obj, propName, func) {
            obj[GETTER](propName, func);
        }
        setupSetter = function(obj, propName, func) {
            obj[SETTER](propName, func);
        }
        setupGetterSetter = function(obj, propName, getter, setter) {
            obj[GETTER](propName, getter);
            obj[SETTER](propName, setter);
        }
    }

})();
/**
 * Apply properties from metaObject to item.
 * @param {Object} metaObject Source of properties
 * @param {Object} item Target of property apply
 * @param {Object} objectScope Scope in which properties should be evaluated
 * @param {Object} QMLContext in which properties should be evaluated
 */
function applyProperties(metaObject, item, objectScope, context) {
    var i;
    objectScope = objectScope || item;
    for (i in metaObject) {
        var value = metaObject[i];
        // skip global id's and internal values
        if (i == "id" || i[0] == "$") {
            continue;
        }
        // slots
        if (i.indexOf("on") == 0 && i[2].toUpperCase() == i[2]) {
            var signalName =  i[2].toLowerCase() + i.slice(3);
            if (!item[signalName]) {
                console.warn("No signal called " + signalName + " found!");
                continue;
            }
            else if (typeof item[signalName].connect != 'function') {
                console.warn(signalName + " is not a signal!");
                continue;
            }
            if (!value.eval) {
                var params = "";
                for (var j in item[signalName].parameters) {
                    params += j==0 ? "" : ", ";
                    params += item[signalName].parameters[j].name;
                }
                value.src = "(function(" + params + ") {" + value.src + "})";
                value.function = false;
                value.compile(objectScope, context);
            }
            item[signalName].connect(item, function() { value.eval().apply(this, arguments);});
            continue;
        }

        if (value instanceof Object) {
            if (value instanceof QMLSignalDefinition) {
                item[i] = Signal(value.parameters);
                if (item.$isComponentRoot)
                    context.setContextProperty(i) = item[i];
                continue;
            } else if (value instanceof QMLMethod) {
                value.compile(objectContext, context);
                item[i] = function() { value.eval().apply(this, arguments);}
                if (item.$isComponentRoot)
                    context.setContextProperty(i, item[i]);
                continue;
            } else if (value instanceof QMLAliasDefinition) {
                createSimpleProperty("alias", item, i);
                item.$properties[i].context = context;
                item.$properties[i].value = value;
                item.$properties[i].get = function() {
                    var obj = this.context.contextProperty(this.value.objectName);
                    return this.value.propertyName ? obj.$properties[this.value.propertyName].get() : obj;
                }
                item.$properties[i].set = function(newVal, fromAnimation, objectScope, context) {
                    if (!this.value.propertyName)
                        throw "Cannot set alias property pointing to an QML object.";
                    this.context.contextProperty(this.value.objectName).$properties[this.value.propertyName].set(newVal, fromAnimation, objectScope, context);
                }
                //TODO: handle componentRoot
                continue;
            } else if (value instanceof QMLPropertyDefinition) {
                createSimpleProperty(value.type, item, i);
                item.$properties[i].set(value.value, true, objectScope, context);
                continue;
            } else if (item[i] && value instanceof QMLMetaPropertyGroup) {
                // Apply properties one by one, otherwise apply at once
                applyProperties(value, item[i], objectScope, context);
                continue;
            }
        }
        if (item.$properties && i in item.$properties)
            item.$properties[i].set(value, true, objectScope, context);
        else if (i in item)
            item[i] = value;
        else if (item.$setCustomData)
            item.$setCustomData(i, value);
        else
            console.warn("Cannot assign to non-existent property \"" + i + "\". Ignoring assignment.");
    }
    if (metaObject.$children && metaObject.$children.length !== 0) {
        if (item.$defaultProperty)
            item.$properties[item.$defaultProperty].set(metaObject.$children, true, objectScope, context);
        else
            throw "Cannot assign to unexistant default property";
    }
    // We purposefully set the default property AFTER using it, in order to only have it applied for
    // instanciations of this component, but not for its internal children
    if (metaObject.$defaultProperty)
        item.$defaultProperty = metaObject.$defaultProperty;
//    if (typeof item.completed != 'undefined' && item.completedAlreadyCalled == false) {
//      item.completedAlreadyCalled = true;
//      item.completed();
//    }
}

// ItemModel. EXPORTED.
JSItemModel = function() {
    this.roleNames = [];

    this.setRoleNames = function(names) {
        this.roleNames = names;
    }

    this.dataChanged = Signal([
        {type:"int", name:"startIndex"},
        {type:"int", name:"endIndex"}
    ]);
    this.rowsInserted = Signal([
        {type:"int", name:"startIndex"},
        {type:"int", name:"endIndex"}
    ]);
    this.rowsMoved = Signal([
        {type:"int", name:"sourceStartIndex"},
        {type:"int", name:"sourceEndIndex"},
        {type:"int", name:"destinationIndex"}
    ]);
    this.rowsRemoved = Signal([
        {type:"int", name:"startIndex"},
        {type:"int", name:"endIndex"}
    ]);
    this.modelReset = Signal();
}

// -----------------------------------------------------------------------------
// Stuff below defines QML things
// -----------------------------------------------------------------------------

// Helper
function unboundMethod() {
    console.log("Unbound method for", this);
}
