define([
    "N/runtime",
    "N/search",
    "N/record",
    "N/encode",
    "N/file",
    "N/util",
    "N/log",
  ], (runtime, search, record, encode, file, util, log) => {
    /**
           * @copyright 2022
           * @author Matt Kraemer
           * @NApiVersion 2.1
           * @NScriptType MapReduceScript
           */
    var exports = {};
  
  
    function getInputData(context) {
      log.audit({ title: "Start ..." });
  

      //get parameter name value will be equal to the parameter added on Map/Reduce Script record
  
      let data = JSON.parse(
        runtime
          .getCurrentScript()
          .getParameter({ name: "custscript_script_data" })
      );
      return data;
    }
  
    function map(context) {
      let value = JSON.parse(context.value);
      try {
        let modifyType = value.type;
        let fileInfo = getFileInfo(value, modifyType);
        if (fileInfo) {
          log.debug("file", JSON.stringify(fileInfo));
          let folderId = createAndGetFolder(fileInfo);
          if (!folderId) return;
          let createdFile = createFiles(fileInfo, folderId);
          log.debug('createdFileId', createdFile)
        }
       
      } catch (e) {
        log.error("e", e);
      }
  
    }
  
    const createFiles = (fileInfo, folderId) => {
      log.debug("folderId", folderId);
      var folderSearchObj = search.create({
        type: "folder",
        filters: [
          ["internalidnumber", "equalto", folderId],
          "AND",
          ["file.name", "is", fileInfo.fileName],
        ],
        columns: [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
          }),
          "internalid",
          "parent",
          search.createColumn({
            name: "internalid",
            join: "file",
          }),
        ],
      });
      var searchResultCount = folderSearchObj.runPaged().count;
      log.debug("folderSearchObj result count", searchResultCount);
      if (searchResultCount === 0) exists = false;
      folderSearchObj.run().each(function (result) {
        fileExists = result.getValue({
          name: "internalid",
          join: "file",
        });
      });
  
      
  
      let fileKeys = {
          'js': {
              encoded: true,
              type: `${file.Type.JAVASCRIPT}`
          },
          'json': {
              encoded: true,
              type: `${file.Type.JSON}`
          },
          'jpg': {
              encoded: false,
              type: `${file.Type.JPGIMAGE}`
          },
          'jpeg': {
              encoded: false,
              type: `${file.Type.JPGIMAGE}`
          },
          'png': {
              encoded: false,
              type: `${file.Type.PNGIMAGE}`
          },
          'txt': {
              encoded: true,
              type: `${file.Type.PLAINTEXT}`
          },
          'pdf': {
              encoded: false,
              type: `${file.Type.PDF}`
          },
          'csv': {
              encoded: true,
              type: `${file.Type.CSV}`
          },
          'html': {
              encoded: true,
              type: `${file.Type.HTMLDOC}`
          },
          'css': {
              encoded: true,
              type: `${file.Type.STYLESHEET}`
          },
          'xml': {
              encoded: true,
              type: `${file.Type.XMLDOC}`
          },
          'scss': {
              encoded: true,
              type: `${file.Type.SCSS}`
          },
          'docx': {
              encoded: false,
              type: `${file.Type.WORD}`
  
          },
          'doc': {
              encoded: false,
              type: `${file.Type.WORD}`
          },
          'xlsx':{
              encoded: false,
              type: `${file.Type.EXCEL}`
          },
          'xltx':{
              encoded: false,
              type: `${file.Type.EXCEL}`
          },
          'xls':{
              encoded: false,
              type: `${file.Type.EXCEL}`
          },
          'xlt':{
              encoded: false,
              type: `${file.Type.EXCEL}`
          }
      
  
      }
      let reencoded = encode.convert({
          string: fileInfo.content,
           inputEncoding: encode.Encoding.BASE_64,
           outputEncoding: encode.Encoding.UTF_8,
           });
  
      let contents;
      if (fileKeys[fileInfo.fileType.toLowerCase()].encoded) contents = reencoded
      else contents = fileInfo.content
      
  
      let fileObj = file.create({
          name: fileInfo.fileName,
          fileType: fileKeys[fileInfo.fileType.toLowerCase()].type,
          contents: contents,
          folder: folderId
      })
      log.debug('fileObj', fileObj)
      fileObj.save()
    };
  
    const getFileInfo = (value, modifyType) => {
      let fileInfo;
      if (modifyType.includes("removed")) {
        let path = value.path.split("/");
        if (!path[path.length - 1]) path.pop();
        let fileName = path[path.length - 1];
        path = value.path;
        path = value.path.replace(fileName, "");
        path.replace(fileName, "");
        path = path.split("/");
        if (!path[path.length - 1]) path.pop();
        let fileCabinetIndex = parseInt(path.indexOf("FileCabinet"));
        path = path.splice(fileCabinetIndex + 1, path.length - 1);
        let deletedId = removeFile(fileName, path);
        log.debug("deletedId", deletedId);
        return false;
      } else {
        log.debug("value", value);
        let fileName = value.name;
        let content = value.content;
        let path = value.path.replace(fileName, "");
        path = path.split("/");
        if (!path[path.length - 1]) path.pop();
        let fileType = fileName.split(".");
        fileType = fileType[fileType.length - 1];
        let fileCabinetIndex = parseInt(path.indexOf("FileCabinet"));
        if (fileCabinetIndex === -1)
          return {
            ERROR:
              "This file will be aborted as it is not uploaded in a valid file structure",
          };
        path = path.splice(fileCabinetIndex + 1, path.length - 1);
  
        fileInfo = {
          fileName: fileName,
          path: path,
          modifyType: modifyType,
          fileType: fileType,
          content: content,
        };
      }
      return fileInfo;
    };
  
    const removeFile = (name, path) => {
      try {
        let counter = 0;
        let folderIds = {};
        let finalId;
        do {
          let filters = [["name", "is", path[counter]], "AND"];
          let columns = [
            search.createColumn({
              name: "name",
              sort: search.Sort.ASC,
            }),
            "internalid",
            "parent",
            search.createColumn({
              name: "internalid",
              join: "file",
            }),
          ];
          if (counter !== 0)
            filters.push(["parent", "anyof", folderIds[path[counter - 1]]]);
          else filters.push(["parent", "anyof", "@NONE@"]);
  
          if (counter === path.length - 1) {
            filters.push("AND");
            filters.push(["file.name", "is", name]);
          }
          var folderSearchObj = search.create({
            type: "folder",
            filters: filters,
            columns: columns,
          });
          var searchResultCount = folderSearchObj.runPaged().count;
          log.debug("folderSearchObj result count", searchResultCount);
          if (searchResultCount === 0) {
            return { ERROR: `File ${name} could not be removed` };
          }
          folderSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
            log.debug("result.id", result.id);
            folderIds[path[counter]] = result.id;
            if (counter === path.length - 1) {
              finalId = result.getValue({
                name: "internalid",
                join: "file",
              });
            }
          });
          counter++;
        } while (counter < path.length);
        file.delete({
          id: finalId,
        });
        return finalId;
      } catch (e) {
        log.error("error in creating folders", e);
      }
    };
  
    const createAndGetFolder = (fileInfo) => {
      try {
        let counter = 0;
        let folderIds = {};
        let finalId;
        do {
          let filters = [["name", "is", fileInfo.path[counter]], "AND"];
          if (counter !== 0)
            filters.push([
              "parent",
              "anyof",
              folderIds[fileInfo.path[counter - 1]],
            ]);
          else filters.push(["parent", "anyof", "@NONE@"]);
          var folderSearchObj = search.create({
            type: "folder",
            filters: filters,
            columns: [
              search.createColumn({
                name: "name",
                sort: search.Sort.ASC,
              }),
              "internalid",
              "parent",
            ],
          });
          var searchResultCount = folderSearchObj.runPaged().count;
          log.debug("folderSearchObj result count", searchResultCount);
          if (searchResultCount === 0) {
            log.debug("creatingFolder", counter);
            let newFolderRecord = record.create({
              type: record.Type.FOLDER,
              isDynamic: true,
            });
            newFolderRecord.setValue({
              fieldId: "name",
              value: fileInfo.path[counter],
            });
            newFolderRecord.setValue({
              fieldId: "description",
              value: "created by Version Control Map/Reduce",
            });
            if (counter !== 0) {
              newFolderRecord.setValue({
                fieldId: "parent",
                value: folderIds[fileInfo.path[counter - 1]],
              });
            }
            let newFolderId = newFolderRecord.save();
            folderIds[fileInfo.path[counter]] = newFolderId;
            if (counter === fileInfo.path.length - 1) finalId = newFolderId;
          }
          folderSearchObj.run().each(function (result) {
            // .run().each has a limit of 4,000 results
  
            folderIds[fileInfo.path[counter]] = result.id;
            if (counter === fileInfo.path.length - 1) finalId = result.id;
            log.debug(
              "folderIds[fileInfo.path[counter]]",
              folderIds[fileInfo.path[counter]]
            );
          });
          counter++;
        } while (counter < fileInfo.path.length);
        return finalId;
      } catch (e) {
        log.error("error in creating folders", e);
      }
    };
  
    /**
     * summarize event handler
     *
     * @gov XXX
     *
     * @param {Object} summary
     * @param {number} summary.concurrency - The maximum concurrency number when executing parallel
     *      tasks for the map/reduce script.
     * @param {Date} summary.dateCreated - The time and day when the map/reduce script began running
     * @param {InputSummary} summary.inputSummary - Holds statistics regarding the input stage.
     * @param {boolean} summary.isRestarted - Indicates whether the function has been invoked
     *      previously for the current key/value pair.
     * @param {MapSummary} summary.mapSummary - Holds statistics regarding the map stage.
     * @param {Iterator} summary.output - Iterator that provides keys and values that are saved as
     *      output during the reduce stage.
     * @param {ReduceSummary} summary.reduceSummary - Holds statistics regarding the reduce stage.
     * @param {number} summary.seconds - Total seconds elapsed when running the map/reduce script.
     * @param {number} summary.usage - Total number of usage units consumed when running the script.
     * @param {number} summary.yields - Total number of yields when running the map/reduce script.
     */
    function summarize(summary) {
      let errors = parseErrors(summary);
  
      // TODO
  
      log.audit({ title: "Complete.", errors });
    }
  
    /**
     * Parses errors from all stages into a single list
     *
     * @gov 0
     *
     * @param {SummaryContext} summary - Holds statistics regarding execution of the script
     *
     * @returns {Object[]} list of errors encountered while running the script
     */
    function parseErrors(summary) {
      let errors = [];
  
      if (summary.inputSummary.error) {
        errors.push(summary.inputSummary.error);
      }
  
      summary.mapSummary.errors.iterator().each((k, e) => errors.push(e));
      summary.reduceSummary.errors.iterator().each((k, e) => errors.push(e));
  
      return errors;
    }
  
    exports.getInputData = getInputData;
    exports.map = map;
    exports.summarize = summarize;
    return exports;
  });
  