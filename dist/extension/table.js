// console.log("table.js: Loaded");
/*
// About
It does not support SQL features like JOIN, GROUP BY, HAVING, nested queries etc..
It does not support transactions, so operations are not atomic.
It does not support indexing, so lookup operations may be slow for large tables.
It stores data in local storage, which is limited in size and not persistent across different browsers or sessions.

// Assumptions
It assumes PRIMARY KEY is an auto-incrementing integer. 
It strips out functions and adds dfault === "datetime".

*/
function encodeBase64(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch (error) {
    console.error("Error encoding to Base64:", error);
    return null;
  }
}

function decodeBase64(encodedText) {
  try {
    // console.log(encodedText)
    if (typeof encodedText == "undefined") {
      return encodedText;
    }
    return decodeURIComponent(escape(atob(encodedText)));
  } catch (error) {
    console.error("Error decoding from Base64:", encodedText, { error });
    return null;
  }
}

class SQLDatabase {
  constructor() {
    this.tables = {};
  }

  // Create Table
  create(args, query) {
    const ifNotExists = query.includes("IF NOT EXISTS");
    const tableNameIndex = args.indexOf("TABLE") + 1;
    let tableName;

    // Consider the 'IF NOT EXISTS' in the position calculation
    if (ifNotExists) {
      tableName = args
        .slice(tableNameIndex + 3)
        .join(" ")
        .split(/\s+/)[0]; // Join parts and split by spaces to get the first valid name
    } else {
      tableName = args[tableNameIndex];
    }
    tableName = tableName.replace(/,/g, "").trim(); // Ensure commas are handled if present

    // Correctly split the query to extract the full schema string considering nested parentheses
    let depth = 0;
    let schemaStartIndex = query.indexOf("(") + 1;
    let schemaEndIndex = schemaStartIndex;
    for (let i = schemaStartIndex; i < query.length; i++) {
      if (query[i] === "(") depth++;
      if (query[i] === ")") {
        if (depth === 0) {
          schemaEndIndex = i;
          break;
        }
        depth--;
      }
    }

    const schemaString = query.substring(schemaStartIndex, schemaEndIndex).trim();
    // console.log("parseSchema1", { query, schemaString });
    if (ifNotExists) {
      let flag = false;
      if (this.tables[tableName]) {
        flag = true;
      } else {
        const table = localStorage.getItem(tableName);
        if (table) {
          flag = true;
          this.tables[tableName] = JSON.parse(table);
        }
      }
      if (flag) {
        // console.log("Table:", tableName, this.tables[tableName]);
        return `Table ${tableName} exists.`;
      }
    }

    const schema = this.parseSchema(schemaString);

    this.tables[tableName] = { schema: schema, records: [] };
    // console.log("Table Created:", tableName, this.tables[tableName]);
    localStorage.setItem(tableName, JSON.stringify({ schema: schema, records: [] }));
    return `* Table ${tableName} created.`;
  }

  parseQuery(query, params) {
    const trimmedQuery = query.trim().replace(/;$/, "");
    const [operation, ...args] = trimmedQuery.split(/\s+/);
    let op = operation.toLowerCase();
    if (op === "create") return this.create(args, trimmedQuery);
    let tbl = args.indexOf("FROM");
    tbl = tbl > 0 ? tbl : args.indexOf("INTO");
    tbl = tbl + 1;
    if (op === "insert") return this.insert(args[tbl], this.extractValues(trimmedQuery), params);
    if (op === "select") return this.select(args[tbl], args.slice(2).join(" "), params);
    if (op === "update") return this.update(args[tbl], args.slice(2).join(" "), params);
    if (op === "delete") return this.delete(args[tbl + 1], args.slice(2).join(" "), params);
    throw new Error("Unsupported operation");
  }

  parseSchema(schemaString) {
    // console.log("schemaString", schemaString);
    const schema = {};
    schemaString
      .split(/,(?![^\(\[]*[\]\)])/)
      .map(part => part.trim())
      .forEach(field => {
        let nameMatch = field.match(/^(\w+)\s+(.*)/);
        if (!nameMatch) return;

        let name = nameMatch[1];
        let definitions = nameMatch[2];

        // Extract type and remove all modifiers to get a clean type
        let typeMatch = definitions.match(/^[^\s]+/);
        let type = typeMatch ? typeMatch[0] : null;

        // Extract default value more robustly, accounting for nested parentheses and quoted strings
        let defaultMatch = definitions.match(/DEFAULT\s+((?:[^,(]+|\([^)]*\))+)/i);
        let defaultValue = defaultMatch ? defaultMatch[1].trim() : null;
        if (defaultValue) {
          defaultValue = defaultValue.replace(/^['"]|['"]$/g, ""); // Remove wrapping quotes
          // If defaultValue is an SQL function
          if (/strftime\('%s',\s*'now',\s*'localtime'\)/i.test(defaultValue)) {
            defaultValue = "datetime";
          }
        }

        // Set schema properties
        schema[name] = {
          type: type,
          default: defaultValue,
          unique: /UNIQUE/i.test(definitions),
          notNull: /NOT NULL/i.test(definitions),
          primaryKey: /PRIMARY KEY/i.test(definitions),
          autoincrement: /AUTOINCREMENT/i.test(definitions)
        };
      });

    console.log("CREATED", schema);
    return schema;
  }

  // Insert NEW record
  insert(tableName, fieldNames, values) {
    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist.`);
    const newData = {};
    let strswaps = [];

    // Loop through each column in the schema
    let schema = table.schema;
    let tableColumns = Object.keys(schema);
    tableColumns.forEach(col => {
      // Get settings
      let metaData = schema[col];
      let { notnull, increment, primaryKey, unique, type } = metaData;
      type = type.toLowerCase();

      // console.log("TABLE:INSERT:col", tableName, { col, metaData });
      let valuesIndex = fieldNames.indexOf(col);
      let val = values[valuesIndex];

      // Handle Column Settings
      val ||= metaData.default || val;
      if (increment || primaryKey) val = Math.max(...table.records.map(record => record[col] || 0), 0) + 1;
      if (metaData.default === "datetime") val = new Date().toISOString();
      if (type === "text" && val) {
        strswaps.push([col, val]);
        val = encodeBase64(val);
      }
      if (type === "integer" && val) {
        val = parseInt(val);
      }
      if (notnull && !val) throw new Error(`Column '${col}' must have a value.`);
      if (unique) {
        let isUnique = table.records.some(record => record[col] === val);
        if (!isUnique) throw new Error(`Column ${col} value must be unique.`);
      }
      // Add column to new record
      newData[col] = val;
    });
    table.records.push(newData);
    let returnData = JSON.parse(JSON.stringify(newData));
    strswaps.forEach(swap => {
      let [col, val] = swap;
      returnData[col] = val;
    });
    console.log("* TABLE:INSERT:", newData); //, { tableName, table, fieldNames, values, newData });
    localStorage.setItem(tableName, JSON.stringify(table));
    return returnData;
  }

  extractValues(query) {
    const start = query.indexOf("(") + 1;
    const end = query.indexOf(")");
    const columnPart = query.substring(start, end).trim();
    return columnPart.split(",").map(column => column.trim());
  }

  // Select statement
  select(tableName, condition, params) {
    const table = this.tables[tableName];
    // console.log("TABLE:SELECT:    > :", { tableName, condition, params }); // condition
    if (!table) throw new Error(`Table ${select} does not exist.`);
    let returnThis = [];
    if (condition.includes("ORDER BY")) {
      const [cond, orderClause] = condition.split("ORDER BY");
      returnThis = this.applyCondition(table, cond.trim(), [...params]);
      returnThis = this.orderBy(returnThis, orderClause.trim());
    } else {
      returnThis = this.applyCondition(table, condition, [...params]);
    }
    // console.log(`TABLE:SELECT:${tableName}:got < `, returnThis);
    // map through the schema, for each text recrod decode the value and return
    let schema = table.schema;
    returnThis = returnThis.map(record => {
      let newRecord = {};
      Object.keys(record).forEach(key => {
        let columnMetaData = schema[key];
        if (columnMetaData.type == "TEXT") {
          // console.log(key, record);
          let encodedValue = record[key];
          let decodedValue = decodeBase64(encodedValue);
          newRecord[key] = decodedValue;
          // console.log("Decoding:", key, encodedValue, decodedValue);
        } else {
          newRecord[key] = record[key];
        }
      });
      return newRecord;
    });
    return returnThis;
  }

  applyCondition(table, condition, params) {
    let records = table.records;
    let schema = table.schema;
    // console.log({ records });

    // Access parameter values on-the-fly during evaluation

    const evaluate = (record, cond) => {
      const compareFns = {
        "=": (a, b) => {
          // console.log("Comparing:", a, b, String(a) == String(b));
          return String(a) == String(b);
        },
        LIKE: (a, b) => { 
          a = a.toLowerCase();
          b = b.toLowerCase().slice(3, -3).replace(/%/g, ".*");
          // console.log(a, b);
          return new RegExp(b).test(a);
        }
      };

      // Handle nested conditions
      if (cond.includes("(")) {
        let subCond = cond.match(/\(([^()]+)\)/);
        if (subCond) {
          let result = evaluate(record, subCond[1]);
          cond = cond.replace(/\(([^()]+)\)/, result ? "true" : "false");
          return evaluate(record, cond);
        }
      }

      let reducer = (acc, part, index, parts) => {
        if (part === "AND" || part === "OR") {
          let prevEval = evaluate(record, parts[index - 1]);
          let nextEval = evaluate(record, parts[index + 1]);
          return part === "AND" ? acc && prevEval && nextEval : acc || prevEval || nextEval;
        } else if (index % 2 === 0) {
          // Evaluate conditions not within AND/OR
          // Adjusted regex to correctly capture the '?' as a placeholder
          let match = part.match(/(\w+)\s*(=|LIKE)\s*(['"]?)(\?|.*?)\3/);
          if (match) {
            let [, field, operator, , valuePlaceholder] = match;
            let value = valuePlaceholder === "?" ? `${tmp.shift()}` : valuePlaceholder.replace(/^['"]|['"]$/g, "");
            // Check if the field is in the schema
            let columnMetaData = schema[field];
            if (!columnMetaData) throw new Error(`Field ${field} does not exist.`);
            // if (columnMetaData.type == "TEXT") value = encodeBase64(value);

            // console.log("Filtering WHERE:", field, operator, { value, columnMetaData });
            let dbColVal = record[field];
            dbColVal = columnMetaData.type == "TEXT" ? decodeBase64(dbColVal) : dbColVal;

            // Use the comparison functions to evaluate
            return compareFns[operator](dbColVal, value);
          }
          return false;
        }
        return acc;
      };

      let parts = cond.split(/\s+(AND|OR)\s+/);
      return parts.reduce(reducer, true);
    };

    // Filter the records based on the condition
    let tmp = false;
    return records.filter(record => {
      tmp = [...params];
      return evaluate(record, condition);
    });
  }

  orderBy(records, clause) {
    const orders = clause.split(",").map(part => {
      const [field, order] = part.trim().split(" ");
      return { field, descending: order.toUpperCase() === "DESC" };
    });

    return records.sort((a, b) => {
      for (let { field, descending } of orders) {
        if (a[field] < b[field]) return descending ? 1 : -1;
        if (a[field] > b[field]) return descending ? -1 : 1;
      }
      return 0; // if all specified fields are equal
    });
  }

  // Update Existing Record
  update(tableName, setClause, params) {
    // console.log("TABLE:UPDATE:", { tableName, setClause }, params);
    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist.`);

    // Separating set parts and where conditions
    const [setParts, whereClause] = setClause.split(" WHERE ");

    // count number of ? in setParts string
    let count = (setParts.match(/\?/g) || []).length;
    let setValues = params.slice(0, count);
    let whereValues = params.slice(count);

    // SET clause
    const updates = setParts.split(",").reduce((acc, part) => {
      const [field, value] = part.trim().split("=");
      const formattedValue = value.includes("?") ? value.replace(/\?/g, () => `"${setValues.shift()}"`) : value;
      acc[field.trim()] = formattedValue.trim();
      return acc;
    }, {});

    // Check if record satisfies the condition set in WHERE clause
    let records = (!whereClause && table.records) || this.applyCondition(table, whereClause, whereValues);

    if (!records.length) {
      console.log("TABLE:UPDATING:", false);
      return false;
    }
    let record = records[0];

    // console.log("TABLE:UPDATING:",

    Object.keys(updates).forEach(key => {
      let columnMetaData = table.schema[key];
      let dne = !record.hasOwnProperty(key);
      if (dne) throw new Error(`Field ${key} does not exist.`);
      let nul = columnMetaData.notNull && updates[key] === undefined;
      if (nul) throw new Error(`Field ${key} cannot be null.`);
      let oldVal = record[key];
      let newVal = updates[key].replace(/['"]/g, "");
      if (columnMetaData.type == "TEXT") newVal = encodeBase64(newVal);

      record[key] = newVal;
      console.log("* TABLE:UPDATE:", tableName); //{ tableName, key, updates, table, setClause, record });
    });

    table.records = table.records.map(rec => (rec.id === record.id ? record : rec));
    localStorage.setItem(tableName, JSON.stringify(table));

    return records;
  }

  // Delete Record
  delete(tableName, condition, params) {
    console.log("TABLE:DELETE:", { tableName, condition, params });
    const table = this.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} does not exist.`);
    const initialCount = table.records.length;
    let filterThese = this.applyCondition(table, condition, params);
    table.records = table.records.filter(record => !filterThese.includes(record));
    localStorage.setItem(tableName, JSON.stringify(table));
    return true;
  }
}

export { SQLDatabase };
