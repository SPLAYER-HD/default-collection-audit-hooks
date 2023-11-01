import Audit from "./audit";

Mongo.Collection.prototype.defaultCollectionAuditHooks = function (opts = {}) {
  let collection = this;

  let defaults = {
    createdAt: true,
    modifiedAt: true,
    createdBy: true,
    modifiedBy: true,
    auditFields: [],
    auditAll: false,
    auditInsert: false,
    getAdditionalFields: "collection.additional.fields",
  };
  let options = Object.assign(defaults, opts);

  const getAudit = async (doc, modifier, auditFields) => {
    fieldNames = [];
    let audit;
    const differences = {
      oldValues: {},
      newValues: {},
      hasChanged: false,
      set: undefined,
      unset: undefined,
    };
    if (auditFields) {
      auditFields.forEach((field) => {
        if (modifier["$set"] && Object.keys(modifier["$set"]).find((fn) => fn.includes(field))) {
          for (key in modifier["$set"]) {
            if (key.includes(field)) {
              let oldValue = key.split(".").reduce((a, b) => a?.[b], doc);
              oldValue = oldValue ? (typeof oldValue === "string" ? oldValue : JSON.stringify(oldValue).trim()) : "";
              let newValue = modifier["$set"][key]
                ? typeof modifier["$set"][key] === "string"
                  ? modifier["$set"][key]
                  : JSON.stringify(modifier["$set"][key]).trim()
                : "";
              if (newValue !== oldValue) {
                if (oldValue) {
                  differences.oldValues[key.replace(/\./g, "-")] = oldValue;
                }
                if (newValue) {
                  differences.newValues[key.replace(/\./g, "-")] = newValue;
                }
                differences.set = true;
                differences.hasChanged = true;
              }
            }
            //differences = getdifferences(differences, key, modifier["$set"]);
          }
        }
        if (modifier["$unset"] && Object.keys(modifier["$unset"]).find((fn) => fn.includes(field))) {
          for (key in modifier["$unset"]) {
            if (key.includes(field)) {
              let oldValue = key.split(".").reduce((a, b) => a[b], doc);
              oldValue = oldValue ? (typeof oldValue === "string" ? oldValue : JSON.stringify(oldValue).trim()) : "";
              let newValue = modifier["$unset"][key]
                ? typeof modifier["$unset"][key] === "string"
                  ? modifier["$unset"][key]
                  : JSON.stringify(modifier["$unset"][key]).trim()
                : "";
              if (newValue !== oldValue) {
                if (oldValue) {
                  differences.oldValues[key.replace(/\./g, "-")] = oldValue;
                }
                if (newValue) {
                  differences.newValues[key.replace(/\./g, "-")] = newValue;
                }
                differences.unset = true;
                differences.hasChanged = true;
              }
            }
            //differences = getdifferences(differences, key, modifier["$set"]);
          }
        }
        // if (modifier["$unset"] && Object.keys(modifier["$unset"]).find((fn) => field.includes(fn))) {
        //   for (key in modifier["$unset"]) {
        //     if (key.includes(field)) {
        //       let oldValue = key.split(".").reduce((a, b) => a[b], doc);
        //       oldValue = oldValue ? JSON.stringify(oldValue).trim() : "";
        //       let newValue = modifier["$unset"][key] ? JSON.stringify(modifier["$unset"][key]).trim() : "";
        //       if (newValue !== oldValue) {
        //         if (oldValue) {
        //           differences.oldValues[field.replace(/\./g, "-")] = oldValue;
        //         }
        //         if (newValue) {
        //           differences.newValues[field.replace(/\./g, "-")] = newValue;
        //         }
        //         differences.hasChanged = true;
        //       }
        //     }
        //     //differences = getdifferences(differences, key, modifier["$set"]);
        //   }
        // }
      });
    }

    if (differences.hasChanged) {
      audit = {
        entityType: collection._name,
        entityId: doc._id,
        type: "update",
        set: differences.set,
        unset: differences.unset,
        data: {
          oldValues: differences.oldValues,
          newValues: differences.newValues,
        },
      };
    }
    return audit;
  };

  // const getdifferences = (diferrences, modifier, key) => {
  //   if (key.includes(field)) {
  //     console.log('clubs.js line 53 - modifier["$set"][key] ', typeof field, field, key, modifier[key]);
  //     // newField[key] = modifier[key];
  //     let oldValue = field.split(".").reduce((a, b) => a[b], doc);
  //     console.log("clubs.js line 59 - oldValue ", oldValue);
  //     if (JSON.stringify(modifier[key]).trim() !== JSON.stringify(oldValue).trim()) {
  //       if (oldValue) {
  //         oldValues[field.replace(/\./g, "-")] = JSON.stringify(oldValue);
  //       }
  //       if (modifier[key]) {
  //         newValues[field.replace(/\./g, "-")] = JSON.stringify(modifier[key]);
  //       }
  //       diferrences.hasChanged = true;
  //     }
  //   }
  //   return diferrences;
  // };

  collection.before.insert(function (userId, doc) {
    if (options.createdAt) {
      doc.createdAt = Date.now(); // moment().format("YYYY-MM-DD_hh-mmA");
    }
    if (options.createdBy && userId) {
      doc.createdBy = userId;
    }
    if (options.auditInsert) {
      const audit = {
        entityType: collection._name,
        entityId: doc._id,
        type: 'insert',
        data: doc,
        createdAt: options.createdAt ?? Date.now(),
        createdBy: options.createdBy ?? userId,
      };

      Audit.insert(audit);
    }
  });

  collection.before.update(function (userId, doc, fieldNames, modifier) {
    try {
      if (options.auditFields && options.auditFields.length > 0) {
        if (options.getAdditionalFields) {
          try {
            options.auditFields = Meteor.call(options.getAdditionalFields, collection._name, userId, options.auditFields);
          } catch (e) {
            console.log(`Error calling Meteor function ${options.getAdditionalFields} `, e);
          }
        }
        if (options.auditAll) {
          if (modifier["$set"]) {
            options.auditFields = options.auditFields.concat(Object.keys(modifier["$set"]));
          }
          if (modifier["$unset"]) {
            options.auditFields = options.auditFields.concat(Object.keys(modifier["$unset"]));
          }
        }
        getAudit(doc, modifier, options.auditFields).then((audit) => {
          // console.log("audit ", audit);
          if (audit) {
            Audit.insert(audit);
          }
        });
      }
    } catch (e) {
      console.error("Error trying to audit collection ", doc._id, userId, e);
    }
    // console.log('clubs.js line 28 - doc, fieldNames, modifier ', doc, fieldNames, modifier);
    modifier.$set = modifier.$set || {};
    if (options.modifiedAt) {
      modifier.$set.modifiedAt = Date.now();
    }
    if (options.modifiedBy && userId) {
      modifier.$set.modifiedBy = userId;
    }
  });
};
