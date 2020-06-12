var selectedOrg = "";
var orgHierarchy = [];

$(".headLine").on("click", function (event) {
    event.preventDefault();
    document.location = "index.html";
});

// Dynamically add the Organization Unit dropdown options
$(document).ready(function () {
    var params = { "ObjectKey": { "objectType": "ObjectType_OrganisationUnit" } };
    $.ajax({
        type: "POST",
        url: `${credentials.address}/api/list_hierarchy_nodes`,
        data: JSON.stringify(params),
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', `Bearer ${credentials.access_token}`);
            xhr.setRequestHeader('Accept', 'application/json');
        }
    }).then(function (response) {
        console.log(response);
        var map = createParentChildrenArrayMap(response.Headers);
        orgHierarchy = response.Headers;
        fillOrganisationOptions(response.Headers, 0, map);
        addListenerToCaret();
    }).catch((error) => {
        setErrorMsg(error);
    });
})

$(".submitButton").on("click", function (event) {
    event.preventDefault();
    $(".validDetail").text("");
    $(".validName").text("");
    $(".validOrg").text("");
    if ($("#requestDetail").val() === "") {
        $(".validDetail").text("Please enter request details");
    }
    if ($("#requestorName").val() === "") {
        $(".validName").text("Please enter requestor name");
    }
    if(selectedOrg == "") {
        $(".validOrg").text("Please select organization unit");
    }
    if ($("#requestorName").val() !== "" && $("#requestDetail").val() !== "" && selectedOrg !== "") {
        var currentTimestamp = new Date().toISOString();
        var organisationUnitID = orgHierarchy.filter(org => (org.ObjectName == selectedOrg) ? org.ObjectKey.int32Value : null);
        console.log(organisationUnitID);
        var params = {
            "ChangeSet": {
                "Changes": ["RequestDetail", "RequestorName", "OrganisationUnitID"],
                "LastEdit": currentTimestamp,
                "Updated": {
                    "EntryDate": currentTimestamp,
                    "OrganisationUnitID": organisationUnitID[0].ObjectKey.int32Value,
                    "RequestDetail": $("#requestDetail").val(),
                    "RequestorName": $("#requestorName").val()
                }
            }
        };
        $.ajax({
            type: "POST",
            url: `${credentials.address}/api/requests/create_request`,
            data: JSON.stringify(params),
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${credentials.access_token}`);
                xhr.setRequestHeader('Accept', 'application/json');
            }
        }).then(function (response) {
            console.log(response);
            $('#newRequestForm').collapse('toggle');
            $.ajax({
                type: "GET",
                url: `${credentials.address}/api/requests/${response}`,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', `Bearer ${credentials.access_token}`);
                    xhr.setRequestHeader('Accept', 'application/json');
                }
            }).then(function (response) {
                console.log(response);
                var organisationUnit = orgHierarchy.filter(org => (org.ObjectKey.int32Value == response.Record.OrganisationUnitID));
                $("#successOutcome").attr("style", "display: block");
                $("#attachButton").attr("data-ArqID", response.ArqID);
                $("#staticName").val(response.Record.RequestorName);
                $("#staticDetails").val(response.Record.RequestDetail);
                $("#staticOrganisation").val(organisationUnit[0].ObjectName);
            }).catch((error) => {
                setErrorMsg(error);
            });
        }).catch((error) => {
            setErrorMsg(error);
        });
    }
});

$("#attachButton").on("click", function (event) {
    event.preventDefault();
    var arqID = $("#attachButton").attr("data-ArqID");
    var address = `file://conquest_documents/Request/${arqID}/TestAddDocument.jpg`;
    console.log(address);
    var addDocumentParams = {
        "Address": address,
        "ContentType": "image/jpeg",
        "CreateTime": new Date().toISOString(),
        "DocumentDescription": "Supporting image",
        "Hashes": null,
        "ObjectKey": {
            "int32Value": arqID,
            "objectType": "ObjectType_Request"
        }
    };
    $.ajax({
        type: "POST",
        url: `${credentials.address}/api/documents/add_document`,
        data: JSON.stringify(addDocumentParams),
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', `Bearer ${credentials.access_token}`);
            xhr.setRequestHeader('Accept', 'application/json');
        }
    }).then(function (response) {
        console.log(response);
        var fd = new FormData();
        var uploadFile = $('#file')[0].files[0];
        fd.append('document', uploadFile);

        $.ajax({
            type: `${response.UploadMethod}`,
            url: `${credentials.address}${response.UploadUri}`,
            data: fd,
            contentType: false,
            processData: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${credentials.access_token}`);
                xhr.setRequestHeader('Accept', 'application/json');
            }
        }).then(function (response) {
            console.log(response);
            $(".validUpload").text("Successfully uploaded");
        }).catch((error) => {
            console.log(error);
            setErrorMsg(error);
        });
    }).catch((error) => {
        setErrorMsg(error);
    });
})

function createParentChildrenArrayMap(options) {
    var map = new Map();
    options.map(option => {
        var parentkey = option.ObjectKey.int32Value;
        var children = options.filter(childOption => childOption.ParentKey.int32Value == parentkey);
        map.set(option.ObjectName, children);
    });
    return map;
}

function fillOrganisationOptions(options, level, optionMap) {
    var dropdownMenuTag = $(`ul[data-level="${level}"]`);
    if (dropdownMenuTag.length > 0) {
        options.map(option => {
            if (option.ParentKey.int32Value == level) {
                var suboption = $("<li>");
                dropdownMenuTag.append(suboption);
                var children = optionMap.get(option.ObjectName);
                if (children.length > 0) {
                    suboption.append(`<span class="caret orgOption">${option.ObjectName}</span>`);
                    var newDropdownMenu = $("<ul>");
                    newDropdownMenu.attr("class", "nested");
                    newDropdownMenu.attr("data-level", option.ObjectKey.int32Value);
                    suboption.append(newDropdownMenu);
                    fillOrganisationOptions(options, option.ObjectKey.int32Value, optionMap);
                }
                else {
                    suboption.append(`<span class="orgOption">${option.ObjectName}</span>`);
                }
            }
        })
    }
}

function setErrorMsg(error) {
    $("#failureMsg").attr("style", "display: block");
    $("#failureMsg").text(`Create request failed with status ${error.status} (${error.statusText}). 
    Error msg: ${error.responseJSON.message}`);
}

$("#file").on("click", function () {
    $(".validUpload").text("");
});

$("#requestToggle").on("click", function (event) {
    $("#createRequest").get(0).reset();
    $("#updateRequest").get(0).reset();
    $("#failureMsg").attr("style", "display: none");
    $("#successOutcome").attr("style", "display: none");
    $(".validUpload").text("");
    resetOrgSelection();
});

function addListenerToCaret() {
    var toggler = document.getElementsByClassName("caret");
    for (var i = 0; i < toggler.length; i++) {
        toggler[i].addEventListener("click", function () {
            this.parentElement.querySelector(".nested").classList.toggle("active");
            this.classList.toggle("caret-down");
        });
    }
    var orgOptions = document.getElementsByClassName("orgOption");
    for (var i = 0; i < orgOptions.length; i++) {
        orgOptions[i].addEventListener("click", function () {
            selectedOrg = this.textContent;
            console.log(selectedOrg.toString());
            setSelectedBackground(selectedOrg);
        });
    }
}

function setSelectedBackground(selectedOrg) {
    var orgOptions = document.getElementsByClassName("orgOption");
    for (var i = 0; i < orgOptions.length; i++) {
        if(orgOptions[i].textContent == selectedOrg) {
            orgOptions[i].classList.add("selectedOption");
        }
        else {
            orgOptions[i].classList.remove("selectedOption");
        }
    }
}

function resetOrgSelection() {
    selectedOrg = "";
    setSelectedBackground("");
    var carets = document.getElementsByClassName("caret");
    for (var i = 0; i < carets.length; i++) {
        carets[i].parentElement.querySelector(".nested").classList.remove("active");
        carets[i].classList.remove("caret-down");
    }
}