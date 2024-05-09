// Dashboard Info
RegExpMap = {
  SUBSCRIBE: new RegExp("StreamLink subscribe"),
  CONTAINER: new RegExp("ContainerEvent"),
  RECORD: new RegExp("In - RecordType"),
  PERMISSION: new RegExp("PermissionDataEventImpl"),
  "KEYMASTER FAIL": new RegExp("KeymasterConnectionImpl"),
  CONTRIB: new RegExp("Out - Contrib"),
  DENIED: new RegExp("WRITE\\+ACCESS\\+DENIED"),
  DISCARD: new RegExp("Out - Discard"),
  "RESPONSE UNKNOWN": new RegExp("ResponseUnknownEvent"),

  VERSION: new RegExp("StreamLink Version"),
  "KEYMASTER URL": new RegExp("keymaster_url"),
  CONNECTION: new RegExp("Connection state changed to:"),
  "SERVER STATUS": new RegExp("< 83 "),
  "PRIVATE GENERIC": new RegExp("/PRIVATE/"),
};

LogLine = function (logLine) {
  this.type = this.processType(logLine);
  this.raw = logLine;
  this.info = this.enrich(this);
  this.timestamp(this);

  typeof this.info === "object"
    ? (this.hasCollapse = true)
    : (this.hasCollapse = false);
};

LogLine.prototype.processType = function (logLine) {
  for (var rgx in RegExpMap) {
    if (logLine.match(RegExpMap[rgx])) {
      return rgx;
    }
  }
  return "unknown";
};

LogLine.prototype.timestamp = function (oLogLine) {
  var timestampString = oLogLine.raw.split(" - ")[0].split(" ")[0];
  oLogLine.date = timestampString.split("-")[0];
  oLogLine.time = timestampString.split("-")[1];
};

LogLine.prototype.enrich = function (oLogLine) {
  var logType = oLogLine.type;
  if (logType === "unknown") {
    return "blank";
  }

  if (logType === "VERSION") {
    return oLogLine.raw.split(" : ")[1];
  }

  if (logType === "KEYMASTER URL") {
    return oLogLine.raw.split("keymaster_url =")[1].trim();
  }

  if (logType === "CONNECTION") {
    return oLogLine.raw.split("changed to:")[1].trim();
  }

  if (logType === "SUBSCRIBE") {
    // /PERMISSIONS/MASTER/CONTAINER/user1@caplin.com
    return oLogLine.raw
      .split("StreamLink subscribe")[1]
      .split("called.")[0]
      .trim();
  }

  if (logType === "DENIED") {
    var message = oLogLine.raw.split("< ")[1].trim();
    var objectNumberWithPrefix = message.split("WRITE+ACCESS+DENIED")[0].trim();

    return {
      // assumption: last 4 = objectNumber
      objectNumber: objectNumberWithPrefix.substr(
        objectNumberWithPrefix.length - 4
      ),
    };
  }

  if (logType === "DISCARD") {
    var message = this.trimAndNormalize(oLogLine.raw.split("Discard")[1]);
    var messageItems = message.split(",");

    return {
      subject: messageItems[0].split("=")[1], // subject=[000D]
      params: messageItems[1].split("=")[1], // prams=[null]
    };
  }

  if (logType === "SERVER STATUS") {
    var message = oLogLine.raw.split(" ");
    var statusMessage = message[message.length - 1]
      .replace("+", " ")
      .split("IS+");

    return {
      component: statusMessage[0].trim(),
      status: statusMessage[1].trim(),
    };
  }

  if (logType === "CONTRIB") {
    var message = oLogLine.raw.split("Contrib")[1];
    var messageItems = message.split(",");

    let fields = message.split("fields=")[1].trim();

    if (fields.endsWith("]]")) {
      fields = fields
        .substring(1, fields.length - 2)
        .split("][")
        .join(",");
    }

    return {
      subject: messageItems[0].split("=")[1].trim(),
      fields: fields.split(",").sort(),
    };
  }

  if (logType === "CONTAINER") {
    var message = this.trimAndNormalize(
      oLogLine.raw.split("ContainerEvent")[1]
    );
    var messageItems = message.split(",");

    return {
      subject: messageItems[0].split("=")[1],
      size: messageItems[1].split("=")[1],
      windowStart: messageItems[2].split("=")[1],
      windowEnd: messageItems[3].split("=")[1],
      changes:
        message.split("changes=")[1] != undefined
          ? this.trimAndNormalize(message.split("changes=")[1])
              .split(",")
              .sort()
          : "",
    };
  }

  if (logType === "RECORD") {
    var message = this.trimAndNormalize(oLogLine.raw.split("DataEvent")[1]);
    var messageItems = message.split(",");

    return {
      subject: messageItems[0].split("=")[1],
      objectNumber: oLogLine.raw
        .split("objnum")[1]
        .split("=")[1]
        .split(",")[0]
        .toUpperCase(),
      fields: this.trimAndNormalize(message.split("fields=")[1])
        .split(",")
        .sort(),
    };
  }

  if (logType === "RESPONSE UNKNOWN") {
    var message = this.trimAndNormalize(
      oLogLine.raw.split("ResponseUnknownEvent")[1]
    );
    var messageItems = message.split(",");

    return {
      subject: messageItems[0].split("=")[1],
      objectNumber: oLogLine.raw
        .split("objnum")[1]
        .split("=")[1]
        .split(",")[0]
        .toUpperCase(),
    };
  }

  if (logType === "PERMISSION") {
    var message = this.trimAndNormalize(
      oLogLine.raw.split("PermissionDataEventImpl")[1]
    );
    var messageItems = message.split(",");

    return {
      subject: messageItems[0].split("=")[1],
      fields: this.trimAndNormalize(message.split("fields=")[1])
        .split(",")
        .sort(),
    };
  }

  if (logType === "KEYMASTER FAIL") {
    var message = this.trimAndNormalize(
      oLogLine.raw.split("KeymasterConnectionImpl:")[1]
    );

    return {
      // Bit of a hack..., TODO: standardise the object returned for all enriched regexes
      message: message.split("Data:")[0] || "Keymaster Error",
    };
  }

  if (logType === "PRIVATE GENERIC") {
    return this.trimAndNormalize(oLogLine.raw.split(" : ")[1]);
  }

  return null;
};

LogLine.prototype.trimAndNormalize = function (sLog) {
  sLog = sLog.trim();

  sLog = sLog.replace("[", "");
  sLog = sLog.replace("]", "");
  return sLog;
};
