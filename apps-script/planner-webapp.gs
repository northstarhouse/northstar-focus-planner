const SHEET_ID = "1H222Vt9HnLQAICXBhKPXuOIoCW5azZMqF4JRdVLvz60";
const TAB_NAME = "planner_data";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "get";
  const key = (e && e.parameter && e.parameter.key) || "nsh-planner-v2";
  const callback = e && e.parameter && e.parameter.callback;

  if (action !== "get") {
    return renderOutput({ ok: false, error: "Unsupported action" }, callback);
  }

  const value = readValue(key);
  return renderOutput({ ok: true, key, data: value }, callback);
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return renderOutput({ ok: false, error: "Invalid JSON body" });
  }

  const action = body.action || "save";
  const key = body.key || "nsh-planner-v2";

  if (action !== "save") {
    return renderOutput({ ok: false, error: "Unsupported action" });
  }

  writeValue(key, body.data || null);
  return renderOutput({ ok: true, key });
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_NAME);
    sheet.getRange(1, 1, 1, 3).setValues([["key", "json", "updatedAt"]]);
  }
  return sheet;
}

function readValue(key) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const rows = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i][0] === key) {
      try {
        return JSON.parse(rows[i][1]);
      } catch (err) {
        return null;
      }
    }
  }
  return null;
}

function writeValue(key, value) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const idx = keys.findIndex((k) => k === key);
    if (idx >= 0) {
      const row = idx + 2;
      sheet.getRange(row, 2).setValue(JSON.stringify(value || {}));
      sheet.getRange(row, 3).setValue(new Date().toISOString());
      return;
    }
  }

  sheet.appendRow([key, JSON.stringify(value || {}), new Date().toISOString()]);
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
