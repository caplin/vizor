Vizor = {
  vizor_logID: 0,
  filter_id: 0,
};

Vizor.getLogs = function () {
  var content = window.editor.getValue();
  var rawLogs = content.split("\n").sort();

  return rawLogs;
};

Vizor.process = function (rawLogs) {
  logLines = [];

  for (var i = 0; i < rawLogs.length; i++) {
    var logLine = new LogLine(rawLogs[i]);

    if (logLine.type != "unknown") {
      // console.log(logLine);
      logLines.push(logLine);
    }
  }

  Vizor.draw(logLines);
  Vizor.reapplyFilters();
};

Vizor.draw = function (logLines) {
  var outputElement = document.getElementById("vizor_output");
  outputElement.innerHTML = "";

  for (var logIndex in logLines) {
    var log = logLines[logIndex];

    var logContainer = document.createElement("div");
    var timestamp = document.createElement("span");
    var content = document.createElement("span");

    logContainer.className = getDynamicCssClass(log);
    logContainer.title = logContainer.className.replace("log", "").trim();
    timestamp.className = "timestamp";
    content.className = "content";

    timestamp.textContent = log.time;
    logContainer.appendChild(timestamp);
    logContainer.appendChild(content);

    if (log.type === "CONTRIB") {
      handleContrib(content, log);
    } else if (log.type === "SUBSCRIBE") {
      content.textContent = "Subscription Made: " + log.info;
    } else if (log.type === "CONTAINER") {
      handleContainerEvent(content, log);
    } else if (log.type === "RECORD") {
      handleRecordEvent(content, log);
    } else if (log.type === "RESPONSE UNKNOWN") {
      handleResponseUnknown(content, log);
    } else if (log.type === "DENIED") {
      handleDeniedEvent(content, log, logIndex);
    } else if (log.type === "DISCARD") {
      handleDiscardEvent(content, log, logIndex);
    } else if (log.type === "PERMISSION") {
      handlePermissionDataEvent(content, log);
    } else if (log.type === "KEYMASTER FAIL") {
      handleKeyMasterFailureEvent(content, log);
    } else if (log.type === "SERVER STATUS") {
      handleServerStatusEvent(content, log);
    } else {
      content.textContent = log.info;
    }

    if (log.type != "unknown" && log.type != "PRIVATE GENERIC") {
      outputElement.appendChild(logContainer);
    }

    Vizor.vizor_logID += 1;
  }
};

handleContrib = function (oElement, oLog) {
  oElement.textContent =
    "Contrib: " +
    oLog.info.subject +
    getValueIfExists(oLog.info.fields, "MsgType");
  _createCollapseContainer(oElement, oLog.info.fields);

  // styling for trade record updates
  if (getValueIfExists(oLog.info.fields, "MsgType") != "") {
    oElement.className += " tradeMessage";
  }
};

handleContainerEvent = function (oElement, oLog) {
  oElement.textContent =
    "Container Update: " + oLog.info.subject + ", size: " + oLog.info.size;
  _createCollapseContainer(oElement, oLog.info.changes);
};

handleRecordEvent = function (oElement, oLog) {
  oElement.textContent =
    "Record Update: " +
    oLog.info.subject +
    getValueIfExists(oLog.info.fields, "MsgType") +
    " (objectNumber=" +
    oLog.info.objectNumber +
    ")";
  _createCollapseContainer(oElement, oLog.info.fields);

  // styling for trade record updates
  if (getValueIfExists(oLog.info.fields, "MsgType") != "") {
    oElement.className += " tradeMessage";
  }
};

handleResponseUnknown = function (oElement, oLog) {
  oElement.textContent = "Response Unknown Event: " + oLog.info.subject;
};

handleDeniedEvent = function (oElement, oLog, nLogIndex) {
  oElement.textContent = "WRITE+ACCESS+DENIED for: " + oLog.info.objectNumber;
  _createCollapseContainer(oElement, findDeniedSubject(oLog, nLogIndex));
};

handleDiscardEvent = function (oElement, oLog, nLogIndex) {
  oElement.textContent =
    "Discard Sent: " + findDiscardSubject(oLog.info.subject, nLogIndex);
};

handlePermissionDataEvent = function (oElement, oLog) {
  oElement.textContent =
    "Permission Update: " +
    oLog.info.subject +
    getValueIfExists(oLog.info.fields, "key");
  _createCollapseContainer(oElement, oLog.info.fields);
};

handleKeyMasterFailureEvent = function (oElement, oLog) {
  oElement.textContent = "Keymaster Connection Failure: " + oLog.info.message;
  _createCollapseContainer(oElement, [
    "Please check raw logs for details / stacktrace",
  ]);
};

handleServerStatusEvent = function (oElement, oLog) {
  oElement.className += " statusEvent";
  oElement.textContent =
    "Status Change: " + oLog.info.component + " is " + oLog.info.status;
};

getDynamicCssClass = function (log) {
  var logType = log.type;
  var collapseClass = log.hasCollapse ? "hasCollapse" : "";

  if (logType === "VERSION") {
    return "log info " + collapseClass;
  }
  if (logType === "KEYMASTER URL") {
    return "log info " + collapseClass;
  }
  if (logType === "CONNECTION") {
    return "log connection " + collapseClass;
  }
  if (logType === "KEYMASTER FAIL") {
    return "log discard " + collapseClass;
  }
  if (logType === "SUBSCRIBE") {
    return "log out subscribe " + collapseClass;
  }
  if (logType === "CONTRIB") {
    return "log out contrib " + collapseClass;
  }
  if (logType === "CONTAINER") {
    return "log in container_event " + collapseClass;
  }
  if (logType === "RECORD") {
    return "log in record " + collapseClass;
  }
  if (logType === "RESPONSE UNKNOWN") {
    return "log in record " + collapseClass;
  }
  if (logType === "PERMISSION") {
    return "log in permission " + collapseClass;
  }
  if (logType === "SERVER STATUS") {
    return "log in server_status " + collapseClass;
  }
  if (logType === "DENIED") {
    return "log in denied " + collapseClass;
  }
  if (logType === "DISCARD") {
    return "log out discard " + collapseClass;
  }

  return "";
};

getValueIfExists = function (fieldsArray, fieldName) {
  for (var item in fieldsArray) {
    if (
      fieldsArray[item].split("=")[0].trim() === fieldName &&
      fieldsArray[item].split("=").length > 1
    ) {
      return ", " + fieldName + ": " + fieldsArray[item].split("=")[1];
    }

    if (
      fieldsArray[item].split(":")[0].trim() === fieldName &&
      fieldsArray[item].split(":").length > 1
    ) {
      return ", " + fieldName + ": " + fieldsArray[item].split(":")[1];
    }
  }
  return "";
};

toggleCollapse = function (collapseContainerElement) {
  if (collapseContainerElement.classList.contains("collapsed")) {
    collapseContainerElement.className = collapseContainerElement.className.replace(
      "collapsed",
      ""
    );
  } else {
    collapseContainerElement.className += " collapsed";
  }
};

findDiscardSubject = function (sSubjectOjectId, nLogIndex) {
  for (var o = nLogIndex - o; o > -1; o--) {
    if (
      logLines[o].info.objectNumber &&
      logLines[o].info.objectNumber.toUpperCase() ==
        sSubjectOjectId.toUpperCase()
    ) {
      return (
        logLines[o].info.subject +
        " (objectNumber=" +
        logLines[i].info.objectNumber +
        ")"
      );
    }
  }
};

findDeniedSubject = function (oLog, nLogIndex) {
  for (var x = nLogIndex - 1; x > -1; x--) {
    // if matches, return
    if (
      logLines[x].raw
        .toUpperCase()
        .indexOf(oLog.info.objectNumber.toUpperCase()) > -1
    ) {
      return [logLines[x].info];
    }
  }
  return "";
};

checkReturnKeyPressed = function () {
  var eventPaste = document.getElementById("eventPaste");
  eventPaste.addEventListener(
    "keypress",
    function (e) {
      if (e.charCode == 13 && eventPaste.value !== "") {
        var logs = Vizor.getLogs();
        Vizor.process(logs);
      }
    },
    false
  );
};

checkReturnKeyPressedFilter = function () {
  var filterInput = document.getElementById("filter");
  filterInput.addEventListener(
    "keypress",
    function (e) {
      if (e.charCode == 13 && filterInput.value !== "") {
        Vizor.applyFilterFromInput();
      }
    },
    false
  );
};

_createCollapseContainer = function (oElement, items) {
  var collapseContainer = document.createElement("div");
  collapseContainer.className = "collapseContainer";

  for (var info in items) {
    var infoElement = document.createElement("div");
    infoElement.textContent = items[info];
    collapseContainer.appendChild(infoElement);
  }

  if (collapseContainer.childElementCount > 0) {
    oElement.addEventListener(
      "click",
      function () {
        toggleCollapse(collapseContainer);
      },
      false
    );

    oElement.parentElement.appendChild(collapseContainer);
  }
};

Vizor.applyFilterFromInput = function () {
  input = document.getElementById("filter");
  filter = input.value.toLowerCase();
  input.value = "";
  Vizor.applyFilter(filter);
};

Vizor.applyFilter = function (filter) {
  var logLines = document.getElementsByClassName("content");
  Vizor.filter_id += 1;
  var tokenId = "filter" + Vizor.filter_id;

  for (var i = 0; i < logLines.length; i++) {
    if (logLines[i].textContent.toLowerCase().indexOf(filter) < 0) {
      logLines[i].parentNode.style.display = "none";
      logLines[i].parentNode.classList.add(tokenId);

      if (document.getElementById(tokenId) === null) {
        var token = document.createElement("span");
        var clearImg = document.createElement("img");

        clearImg.src = "css/clear.png";
        clearImg.alt = "clear";

        token.id = tokenId;
        token.name = filter;
        token.classList.add("filterToken");
        token.onclick = function () {
          Vizor.clearFilter(tokenId);
        };
        var text = document.createTextNode(filter + " ");
        token.appendChild(text);
        token.appendChild(clearImg);
        document.getElementById("filters").appendChild(token);
      }
    }
  }
};

Vizor.clearFilter = function (tokenId) {
  var token = document.getElementById(tokenId);
  if (token !== null) {
    token.parentNode.removeChild(token);
  }
  Vizor.reapplyFilters();
};

Vizor.clearFilters = function () {
  var logLines = document.getElementsByClassName("log");
  for (var i = 0; i < logLines.length; i++) {
    logLines[i].style.display = "";
    for (var j = 1; j <= Vizor.filter_id; j++) {
      logLines[i].classList.remove("filter" + j);
    }
  }
  for (var i = 1; i <= Vizor.filter_id; i++) {
    var token = document.getElementById("filter" + i);
    if (token !== null) {
      token.parentNode.removeChild(token);
    }
  }
  Vizor.filter_id = 0;
};

Vizor.reapplyFilters = function () {
  var tokens = [];

  for (var i = 1; i <= Vizor.filter_id; i++) {
    var token = document.getElementById("filter" + i);
    if (token !== null) {
      tokens.push(token.name);
    }
  }

  Vizor.clearFilters();

  for (var i = 0; i < tokens.length; i++) {
    Vizor.applyFilter(tokens[i]);
  }
};
