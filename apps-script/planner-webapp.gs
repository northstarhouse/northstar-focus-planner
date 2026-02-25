const SHEET_ID = "1H222Vt9HnLQAICXBhKPXuOIoCW5azZMqF4JRdVLvz60";
const IDEAS_TAB_NAME = "Iniatives";
const WINS_TAB_NAME = "Accomplishments";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "get";
  const callback = e && e.parameter && e.parameter.callback;

  if (action !== "get") {
    return renderOutput({ ok: false, error: "Unsupported action" }, callback);
  }

  const data = {
    ideas: readIdeas_(),
    wins: readWins_(),
  };

  return renderOutput({ ok: true, data }, callback);
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return renderOutput({ ok: false, error: "Invalid JSON body" });
  }

  const action = body.action || "save";

  if (action !== "save") {
    return renderOutput({ ok: false, error: "Unsupported action" });
  }

  const payload = body.data || {};
  writeIdeas_(Array.isArray(payload.ideas) ? payload.ideas : []);
  writeWins_(Array.isArray(payload.wins) ? payload.wins : []);
  return renderOutput({ ok: true });
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getOrCreateSheet_(tabName, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);

  const headerValues = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeader = headerValues.join("").trim().length > 0;
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const current = headerValues.map(String);
    const same =
      current.length >= headers.length &&
      headers.every(function (h, idx) {
        return current[idx] === h;
      });
    if (!same) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

function readIdeas_() {
  const headers = ["id", "title", "status", "notes", "blockers", "gaps"];
  const sheet = getOrCreateSheet_(IDEAS_TAB_NAME, headers);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return rows
    .filter(function (row) {
      return String(row[0]).trim() || String(row[1]).trim();
    })
    .map(function (row) {
      return {
        id: Number(row[0]) || Date.now(),
        title: String(row[1] || ""),
        status: String(row[2] || "Exploring"),
        notes: String(row[3] || ""),
        blockers: String(row[4] || ""),
        gaps: String(row[5] || ""),
      };
    });
}

function writeIdeas_(ideas) {
  const headers = ["id", "title", "status", "notes", "blockers", "gaps"];
  const sheet = getOrCreateSheet_(IDEAS_TAB_NAME, headers);
  clearDataRows_(sheet, headers.length);
  if (!ideas.length) return;

  const values = ideas.map(function (i) {
    return [
      i.id || Date.now(),
      i.title || "",
      i.status || "Exploring",
      i.notes || "",
      i.blockers || "",
      i.gaps || "",
    ];
  });
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function readWins_() {
  const headers = ["id", "title", "when", "impact", "grantUse"];
  const sheet = getOrCreateSheet_(WINS_TAB_NAME, headers);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return rows
    .filter(function (row) {
      return String(row[0]).trim() || String(row[1]).trim();
    })
    .map(function (row) {
      return {
        id: Number(row[0]) || Date.now(),
        title: String(row[1] || ""),
        when: String(row[2] || ""),
        impact: String(row[3] || ""),
        grantUse: String(row[4] || ""),
      };
    });
}

function writeWins_(wins) {
  const headers = ["id", "title", "when", "impact", "grantUse"];
  const sheet = getOrCreateSheet_(WINS_TAB_NAME, headers);
  clearDataRows_(sheet, headers.length);
  if (!wins.length) return;

  const values = wins.map(function (w) {
    return [
      w.id || Date.now(),
      w.title || "",
      w.when || "",
      w.impact || "",
      w.grantUse || "",
    ];
  });
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

function clearDataRows_(sheet, width) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, width).clearContent();
  }
}

function renderOutput(obj, callback) {
  if (callback) {
    const json = JSON.stringify(obj);
    return ContentService.createTextOutput(`${callback}(${json})`).setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
