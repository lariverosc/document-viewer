DV.DocumentViewer = function(options) {
  this.options    = options;
  this.schema     = new DV.Schema();
  this.api        = new DV.Api(this);
  this.history    = new DV.History(this);

  this.models     = this.schema.models;
  this.events     = DV.Schema.events;
  this.helpers    = DV.Schema.helpers;
  this.states     = DV.Schema.states;

  // state values
  this.isFocus            = true;
  this.activeElement      = null;
  this.observers          = [];
  this.windowDimensions   = {};
  this.scrollPosition     = null;
  this.checkTimer         = {};
  this.busy               = false;
  this.annotationToLoadId = null;
  this.dragReporter       = null;
  this.compiled           = {};
  this.tracker            = {};

  this.events     = _.extend(this.events, {
    application : this,
    states      : this.states,
    elements    : this.elements,
    helpers     : this.helpers,
    models      : this.models,
    // this allows us to bind events to call the method corresponding to the current state
    compile     : function(){
      var a           = this.application;
      var methodName  = arguments[0];
      return function(){
        if(!a.events[a.state][methodName]){
          a.events[methodName].apply(a.events,arguments);
        }else{
          a.events[a.state][methodName].apply(a.events,arguments);
        }
      };
    }
  });

  this.helpers  = _.extend(this.helpers, {
    application : this,
    states      : this.states,
    elements    : this.elements,
    events      : this.events,
    models      : this.models
  });

  this.states   = _.extend(this.states, {
    application : this,
    helpers     : this.helpers,
    elements    : this.elements,
    events      : this.events,
    models      : this.models
  });
};

// Transition to a given state ... unless we're already in it.
DV.DocumentViewer.prototype.open = function(state) {
  if (this.state == state) return;
  this.state = state;
  this.states[state].apply(this, arguments);
};

// The origin function, kicking off the entire documentViewer render.
DV.load = function(documentRep, options) {
  var defaults = {
    container         : document.body,
    zoom              : 700,
    showSidebar       : true,
    showText          : true,
    showSearch        : true,
    showHeader        : true,
    enableUrlChanges  : !DV.History.alreadyActive
  };
  options            = _.extend({}, defaults, options);
  options.fixedSize  = !!(options.width || options.height);
  var viewer         = new DV.DocumentViewer(options);
  // Once we have the JSON representation in-hand, finish loading the viewer.
  var continueLoad = DV.loadJSON = function(json) {
    viewer.schema.importCanonicalDocument(json);
    viewer.open('InitialLoad');
    if (options.afterLoad) options.afterLoad();
    if (DV.afterLoad) DV.afterLoad();
  };

  // If we've been passed the JSON directly, we can go ahead,
  // otherwise make a JSONP request to fetch it.
  var jsonLoad = function() {
    if (_.isString(documentRep)) {
      if (documentRep.match(/\.js$/)) {
        $j.getScript(documentRep);
      } else {
        var crossDomain = viewer.helpers.isCrossDomain(documentRep);
        if (crossDomain) documentRep = documentRep + '?callback=?';
        $j.getJSON(documentRep, continueLoad);
      }
    } else {
      continueLoad(documentRep);
    }
  };

  // If we're being asked the fetch the templates, load them remotely before
  // continuing.
  if (options.templates) {
    $j.getScript(options.templates, jsonLoad);
  } else {
    jsonLoad();
  }

  return viewer;
};

// If the document viewer has been loaded dynamically, allow the external
// script to specify the onLoad behavior.
if (DV.onload) _.defer(DV.onload);
