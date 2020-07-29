    $(function () {
        //Web API ajax wrapper
        (function (webapi, $) {
            function safeAjax(ajaxOptions) {
                var deferredAjax = $.Deferred();
                shell.getTokenDeferred().done(function (token) {
                    // Add headers for ajax
                    if (!ajaxOptions.headers) {
                        $.extend(ajaxOptions, {
                            headers: {
                                "__RequestVerificationToken": token
                            }
                        });
                    } else {
                        ajaxOptions.headers["__RequestVerificationToken"] = token;
                    }
                    $.ajax(ajaxOptions)
                        .done(function (data, textStatus, jqXHR) {
                            validateLoginSession(data, textStatus, jqXHR, deferredAjax.resolve);
                        }).fail(deferredAjax.reject); //ajax
                }).fail(function () {
                    deferredAjax.rejectWith(this, arguments); // On token failure pass the token ajax and args
                });
                return deferredAjax.promise();
            }
            webapi.safeAjax = safeAjax;
        })(window.webapi = window.webapi || {}, jQuery)
        // Notification component
        var notificationMsg = (function () {
            var $processingMsgEl = $('#processingMsg'),
                _msg = 'Processing...',
                _stack = 0,
                _endTimeout;
            return {
                show: function (msg) {
                    $processingMsgEl.text(msg || _msg);
                    if (_stack === 0) {
                        clearTimeout(_endTimeout);
                        $processingMsgEl.show();
                    }
                    _stack++;
                },
                hide: function () {
                    _stack--;
                    if (_stack <= 0) {
                        _stack = 0;
                        clearTimeout(_endTimeout);
                        _endTimeout = setTimeout(function () {
                            $processingMsgEl.hide();
                        }, 500);
                    }
                }
            }
        })();

        // Inline editable table component
        var webAPIExampleTable = (function () {
            var trTpl = '<% _.forEach(data, function(data){ %>' +
                '<tr data-id="<%=data.id%>" data-name="<%=data.fullname%>">' +
                '<% _.forEach(columns, function(col){ %>' +
                '<td data-attribute="<%=col.name%>" data-label="<%=col.label%>" data-value="<%=data[col.name]%>">' +
                '<%-data[col.name]%>' +
                '</td>' +
                '<% }) %>' +
                '<td>' +
                '<button class="btn btn-default edit" type="submit"><i class="glyphicon glyphicon-pencil" aria-hidden="true"></i></button>&nbsp;' +
                '<button class="btn btn-default delete" type="submit"><i class="glyphicon glyphicon-trash" aria-hidden="true"></i></button>' +
                '</td>' +
                '</tr>' +
                '<% }) %>';
            var tableTpl = '<table class="table table-hover">' +
                '<thead>' +
                '<tr>' +
                '<% _.forEach(columns, function(col){ %>' +
                '<th><%=col.label%></th>' +
                '<% }) %>' +
                '<th>' +
                '<button class="btn btn-default add" type="submit">' +
                '<i class="glyphicon glyphicon-plus" aria-hidden="true"></i> Save Record' +
                '</button>&nbsp;' +
                '<button class="btn btn-default update" type="submit">' +
                '<i class="glyphicon glyphicon-floppy-save" aria-hidden="true"></i> Update Record' +
                '</button>' +               
                '</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>' + trTpl + '</tbody>' +
                '</table>';
            function getDataObject(rowEl) {
                var $rowEl = $(rowEl),
                    attrObj = {
                        id: $rowEl.attr('data-id'),
                        name: $rowEl.attr('data-name')
                    };
                $rowEl.find('td').each(function (i, el) {
                    var $el = $(el),
                        key = $el.attr('data-attribute');
                    if (key) {
                        attrObj[key] = $el.attr('data-value');
                    }
                })
                return attrObj;
            }
            function bindRowEvents(tr, config) {
                var $row = $(tr),
                    $deleteButton = $row.find('button.delete'),
                    $editButton = $row.find('button.edit'),
                    dataObj = getDataObject($row);

                //User can delete record using this button
                $deleteButton.on('click', $.proxy(config.deleteHandler, $row, dataObj));
                $editButton.on('click', $.proxy(config.editHandler, $row, dataObj));
            }
            function bindTableEvents($table, config) {
                $table.find('tbody tr').each(function (i, tr) {
                    bindRowEvents(tr, config);
                });
                $table.find('thead button.add').on('click', $.proxy(config.addHandler, $table));
                $table.find('thead button.update').on('click', $.proxy(config.updateHandler, $table));
            }
            return function (config) {
                var me = this,
                    columns = config.columns,
                    data = config.data,
                    addHandler = config.addHandler,
                    editHandler = config.editHandler,
                    updateHandler = config.updateHandler,
                    deleteHandler = config.deleteHandler,
                    $table;
                me.render = function (el) {
                    $table = $(el).html(_.template(tableTpl)({ columns: columns, data: data })).find('table');
                    bindTableEvents($table, { columns: columns, addHandler: addHandler, editHandler: editHandler, updateHandler: updateHandler, deleteHandler: deleteHandler });
                }
                me.addRecord = function (record) {
                    $table.find('tbody tr:first').before(_.template(trTpl)({ columns: columns, data: [record] }));
                    bindRowEvents($table.find('tbody tr:first'), config);
                }
                /*
                me.updateRecord = function (attributeName, newValue, record) {
                    $table.find('tr[data-id="' + record.id + '"] td[data-attribute="' + attributeName + '"]').text(newValue);
                }
                */
                me.updateAllRecord = function (recordId, record)
                {
                    var $rowEl = $table.find('tr[data-id="' + recordId + '"]');
                    $rowEl.find('td[data-attribute="firstname"]').text($("#InputFirstName").val());
                    $rowEl.find('td[data-attribute="lastname"]').text($("#InputLastName").val());
                    $rowEl.find('td[data-attribute="emailaddress1"]').text($("#InputEmail").val());
                    $rowEl.find('td[data-attribute="telephone1"]').text($("#InputTelephone").val());
                }
                me.removeRecord = function (record) {
                    $table.find('tr[data-id="' + record.id + '"]').fadeTo("slow", 0.7, function () {
                        $(this).remove();
                    });
                }
            };
        })();
        //Applicaton ajax wrapper 
        function appAjax(processingMsg, ajaxOptions) {
            notificationMsg.show(processingMsg);
            return webapi.safeAjax(ajaxOptions)
                .fail(function (response) {
                    if (response.responseJSON) {
                        alert("Error: " + response.responseJSON.error.message)
                    } else {
                        alert("Error: Web API is not available... ")
                    }
                }).always(notificationMsg.hide);
        }

        function clearFields()
        {
            $("#InputContactId").val('');
            $("#InputFirstName").val('');
            $("#InputLastName").val('');
            $("#InputEmail").val('');
            $("#InputTelephone").val('');
        }

        function addRecord() {

            //Sample data to create a record - change as appropriate
            var recordObj = {
                firstname: $("#InputFirstName").val(),
                lastname: $("#InputLastName").val(),
                emailaddress1: $("#InputEmail").val(),
                telephone1: $("#InputTelephone").val()
                // cr9d4_contacttypecode
            };
            appAjax('Creating a new contact', {
                type: "POST",
                url: "/_api/contacts",
                contentType: "application/json",
                data: JSON.stringify(recordObj),
                success: function (res, status, xhr) {
                    recordObj.id = xhr.getResponseHeader("entityid");
                    recordObj.fullname = recordObj.firstname + " " + recordObj.lastname;
                    table.addRecord(recordObj);
                    clearFields();
                }
            });
            return false;
        }
        function deleteRecord(recordObj) {
            var response = confirm("Are you sure, you want to delete \"" + recordObj.name + "\" ?");
            if (response == true) {
                appAjax('Deleting...', {
                    type: "DELETE",
                    url: "/_api/contacts(" + recordObj.id + ")",
                    contentType: "application/json",
                    success: function (res) {
                        table.removeRecord(recordObj);
                    }
                });
            }
            return false;
        }

        function editRecord(recordObj)
        {
            $("#InputContactId").val(recordObj.id);
            $("#InputFirstName").val(recordObj['firstname']);
            $("#InputLastName").val(recordObj['lastname']);
            $("#InputEmail").val(recordObj['emailaddress1']);
            $("#InputTelephone").val(recordObj['telephone1']);
        }

        function updateRecord()
        {
            var recordId = $("#InputContactId").val()

            var recordObj = {
                firstname: $("#InputFirstName").val(),
                lastname: $("#InputLastName").val(),
                emailaddress1: $("#InputEmail").val(),
                telephone1: $("#InputTelephone").val()
            };

            appAjax('Updating contact record', {
                type: "PATCH",
                url: "/_api/contacts(" + recordId + ")",
                contentType: "application/json",
                data: JSON.stringify(recordObj),
                success: function (res) {
                    table.updateAllRecord(recordId, recordObj);
                    clearFields();
                }
            });
        }

        var table = new webAPIExampleTable({
            columns: [{
                name: 'firstname',
                label: 'First Name'
            }, {
                name: 'lastname',
                label: 'Last Name'
            }, {
                name: 'emailaddress1',
                label: 'Email'
            }, {
                name: 'telephone1',
                label: 'Telephone'
            }],
            data: contactList,
            addHandler: addRecord,
            editHandler: editRecord,
            updateHandler: updateRecord,
            deleteHandler: deleteRecord
        });
        table.render($('#dataTable'));
    });