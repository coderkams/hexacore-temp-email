import { BulkRecipient, CsvParseResult } from "./types";

/**
 * Standard email validation regex (RFC 5322 compliant practical subset)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * RFC 4180 compliant CSV line tokenizer that properly handles:
 * - quoted values ("hello, world")
 * - escaped quotes ("say ""hi""")
 * - newlines within cells
 * - empty fields
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let i = 0;
  const len = csvText.length;

  while (i < len) {
    const char = csvText[i];

    if (insideQuotes) {
      if (char === '"') {
        // Check for escaped double quotes: ""
        if (i + 1 < len && csvText[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      } else if (char === '\r') {
        // Handle CRLF
        if (i + 1 < len && csvText[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = "";
        // Only push row if it contains at least one non-empty field
        if (currentRow.some(col => col.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        // Handle LF
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some(col => col.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field and row if any remains
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(col => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes header string for heuristic column detection
 */
function normalizeHeader(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Parse CSV text into validated recipients, statistics, and metadata.
 */
export function parseCsvString(
  csvText: string,
  options: { deduplicate?: boolean } = { deduplicate: true }
): CsvParseResult {
  const rawRows = parseCsvRows(csvText);

  if (rawRows.length === 0) {
    return {
      recipients: [],
      invalidRows: [],
      duplicates: [],
      totalRows: 0,
      validCount: 0,
      headers: [],
      detectedColumns: { customCols: [] },
    };
  }

  // Detect whether the first row is a header row
  const firstRow = rawRows[0];
  let headerRow = firstRow;
  let dataRows = rawRows.slice(1);

  // Candidate column names
  const emailColAliases = ["email", "emailaddress", "e-mail", "mail", "recipient", "recipientemail", "useremail", "contactemail", "to", "toemail"];
  const nameColAliases = ["name", "fullname", "firstname", "first", "contactname", "username", "recipientname", "customername", "displayname"];

  let emailColIndex = -1;
  let nameColIndex = -1;

  // Check headers against known aliases
  for (let idx = 0; idx < headerRow.length; idx++) {
    const norm = normalizeHeader(headerRow[idx]);
    if (emailColIndex === -1 && emailColAliases.includes(norm)) {
      emailColIndex = idx;
    }
    if (nameColIndex === -1 && nameColAliases.includes(norm)) {
      nameColIndex = idx;
    }
  }

  // Fallback heuristic: If no email header matched, check if first row itself looks like data with an email
  if (emailColIndex === -1) {
    const firstRowEmailIdx = firstRow.findIndex(val => EMAIL_REGEX.test(val));
    if (firstRowEmailIdx !== -1) {
      // First row was data, not header! Synthesize generic headers
      headerRow = firstRow.map((_, i) => (i === firstRowEmailIdx ? "email" : `col_${i + 1}`));
      dataRows = rawRows;
      emailColIndex = firstRowEmailIdx;
    }
  }

  // If still not found, check the first 5 data rows to find which column holds email addresses
  if (emailColIndex === -1 && dataRows.length > 0) {
    for (let colIdx = 0; colIdx < (headerRow.length || 1); colIdx++) {
      let matches = 0;
      for (const row of dataRows.slice(0, 5)) {
        if (row[colIdx] && EMAIL_REGEX.test(row[colIdx].trim())) {
          matches++;
        }
      }
      if (matches >= Math.min(2, dataRows.length)) {
        emailColIndex = colIdx;
        break;
      }
    }
  }

  // Identify custom columns for dynamic variables
  const cleanHeaders = headerRow.map((h, i) => h.trim() || `column_${i + 1}`);
  const customCols: string[] = [];
  for (let i = 0; i < cleanHeaders.length; i++) {
    if (i !== emailColIndex && i !== nameColIndex) {
      customCols.push(cleanHeaders[i]);
    }
  }

  const validRecipients: BulkRecipient[] = [];
  const invalidRows: CsvParseResult["invalidRows"] = [];
  const duplicates: string[] = [];
  const seenEmails = new Set<string>();

  dataRows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2; // 1-indexed, accounting for header
    const rowData: Record<string, string> = {};
    cleanHeaders.forEach((header, colIdx) => {
      rowData[header] = (row[colIdx] || "").trim();
    });

    if (emailColIndex === -1 || !row[emailColIndex]) {
      invalidRows.push({
        rowNumber,
        data: rowData,
        reason: "No email column or empty email address found in this row.",
      });
      return;
    }

    const rawEmail = row[emailColIndex].trim();
    const cleanEmail = rawEmail.toLowerCase();

    // Check validity
    if (!EMAIL_REGEX.test(cleanEmail)) {
      invalidRows.push({
        rowNumber,
        data: rowData,
        reason: `Invalid email address syntax: "${rawEmail}"`,
      });
      return;
    }

    // Check duplicate
    if (seenEmails.has(cleanEmail)) {
      duplicates.push(rawEmail);
      if (options.deduplicate) {
        invalidRows.push({
          rowNumber,
          data: rowData,
          reason: `Duplicate email skipped: "${rawEmail}"`,
        });
        return;
      }
    }

    seenEmails.add(cleanEmail);

    const rawName = nameColIndex !== -1 ? (row[nameColIndex] || "").trim() : "";
    const params: Record<string, string> = { ...rowData };
    if (rawName) {
      params.name = rawName;
    }
    params.email = rawEmail;

    validRecipients.push({
      email: rawEmail,
      name: rawName || undefined,
      params,
    });
  });

  return {
    recipients: validRecipients,
    invalidRows,
    duplicates,
    totalRows: dataRows.length,
    validCount: validRecipients.length,
    headers: cleanHeaders,
    detectedColumns: {
      emailCol: emailColIndex !== -1 ? cleanHeaders[emailColIndex] : undefined,
      nameCol: nameColIndex !== -1 ? cleanHeaders[nameColIndex] : undefined,
      customCols,
    },
  };
}

/**
 * Generates ready-to-use sample CSV content.
 */
export function generateSampleCsv(): string {
  return [
    "email,name,company,tier,note",
    "adamskams03@gmail.com,Adams Kams,Hexacore,Enterprise,Primary Administrator",
    "smatvtubilltopup@gmail.com,SMAT VTU,Hexacore Partner,Developer,Production API Testing",
    "adamufatima610@gmail.com,Fatima Adamu,Hexacore Developer,Developer,Verified Member",
  ].join("\n");
}

