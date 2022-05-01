define(['N/task'],(task) => {

        /**
         * @copyright 2022
         * @author  Matt Kraemer
         * @NApiVersion 2.1
         * @NScriptType RESTlet
         */
        var exports = {};

        const _post = context => {

            let data = context
            log.debug('data', data)
            var mrTask = task.create({taskType: task.TaskType.MAP_REDUCE});
            //Replace Script ID
            mrTask.scriptId = '<SCRIPTID>';
            //Replace Deployment Id
            mrTask.deploymentId = '<DEPLOYMENTID>';
            //Create param in Map/Reduce Script Record
            mrTask.params = {custscript_script_data: data};
            mrTask.submit();
        }
        exports.post = _post;
        return exports;
    });