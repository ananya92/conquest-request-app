// Variable to store the selected organisation unit
var selectedOrg = "";
// Variable to store the organisation hierarchy
var orgHierarchy = [];

$(".headLine").on("click", function (event) {
    event.preventDefault();
    document.location = "index.html";
});

// Dynamically add the Organization Unit selection tree options by initiating POST API call to /api/list_hierarchy_nodes
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
        // Save the oeganisation hierarchy in orgHierarchy variable 
        orgHierarchy = response.Headers;
        // Create a map from parent organisation to array of sub-organisations within each parent org
        var map = createParentChildrenArrayMap(response.Headers);
        // Calling fillOrganisationOptions function with initial parentId param = 0 to generate nested organisation tree
        fillOrganisationOptions(response.Headers, 0, map);
        // Calling addListenerToCarets function so as to toggle the view of nested sub-organisations
        addListenerToCarets();
    }).catch((error) => {
        // Set error message if the POST list_hierarchy_nodes fails
        setErrorMsg(error);
    });
})

// Create a new request when the submitButton is clicked
$(".submitButton").on("click", function (event) {
    event.preventDefault();
    // Clear the previous validation messages
    $(".validDetail").text("");
    $(".validName").text("");
    $(".validOrg").text("");
    // Validate that request details field is not empty
    if ($("#requestDetail").val() === "") {
        $(".validDetail").text("Please enter request details");
    }
    // Validate that requestor name field is not empty
    if ($("#requestorName").val() === "") {
        $(".validName").text("Please enter requestor name");
    }
    // Validate that organisation is selected
    if (selectedOrg == "") {
        $(".validOrg").text("Please select organization unit");
    }
    // Allow request creation only when all three fields have non-empty values
    if ($("#requestorName").val() !== "" && $("#requestDetail").val() !== "" && selectedOrg !== "") {
        var currentTimestamp = new Date().toISOString();
        // Retrieve the organisation Unit Id from the saved organisation hierarchy by filtering by the selected organisation name
        var organisationUnitID = orgHierarchy.filter(org => (org.ObjectName == selectedOrg) ? org.ObjectKey.int32Value : null);
        // Body parameters for create_request POST API
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
        // Initiate POST API to create new request
        $.ajax({
            type: "POST",
            url: `${credentials.address}/api/requests/create_request`,
            data: JSON.stringify(params),
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', `Bearer ${credentials.access_token}`);
                xhr.setRequestHeader('Accept', 'application/json');
            }
        }).then(function (response) {
            // The ArqID of the newly created request is returned
            console.log(response);
            // Collapse the request creation form
            $('#newRequestForm').collapse('toggle');
            // GET API to read the newly created request
            $.ajax({
                type: "GET",
                url: `${credentials.address}/api/requests/${response}`,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', `Bearer ${credentials.access_token}`);
                    xhr.setRequestHeader('Accept', 'application/json');
                }
            }).then(function (response) {
                console.log(response);
                // Retrieve the organisation name from the saved organisation hierarchy by filtering by the organisation id in the Record returned by the GET request
                var organisationUnit = orgHierarchy.filter(org => (org.ObjectKey.int32Value == response.Record.OrganisationUnitID));
                // Display the successOutcome div to display the new request details
                $("#successOutcome").attr("style", "display: block");
                // Add the ArqID to the data-ArqID attribute of the attach image button so an image can be attached to a request with this ArqID
                $("#attachButton").attr("data-ArqID", response.ArqID);
                $("#staticId").val(response.ArqID);
                $("#staticName").val(response.Record.RequestorName);
                $("#staticDetails").val(response.Record.RequestDetail);
                $("#staticOrganisation").val(organisationUnit[0].ObjectName);
            }).catch((error) => {
                // Set error message if the GET request fails
                setErrorMsg(error);
            });
        }).catch((error) => {
            // Set error message if the POST request creation fails
            setErrorMsg(error);
        });
    }
});

// Attach image to request when the attachButton is clicked
$("#attachButton").on("click", function (event) {
    event.preventDefault();
    // Attach image to the request with ArqID which is saved in the data-ArdID attribute in the attachButton
    var arqID = $("#attachButton").attr("data-ArqID");
    var address = `file://conquest_documents/Request/${arqID}/TestAddDocument.jpg`;
    var addDocumentParams = {
        "Address": address,
        "ContentType": "image/jpeg",
        "CreateTime": new Date().toISOString(),
        "DocumentDescription": "Supporting document",
        "Hashes": null,
        "ObjectKey": {
            "int32Value": arqID,
            "objectType": "ObjectType_Request"
        }
    };
    // POST API call to add document to a request
    $.ajax({
        type: "POST",
        url: `${credentials.address}/api/documents/add_document`,
        data: JSON.stringify(addDocumentParams),
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', `Bearer ${credentials.access_token}`);
            xhr.setRequestHeader('Accept', 'application/json');
        }
    }).then(function (response) {
        // Successfully created a document record which is returned in the response object
        console.log(response);
        // Upload image to the file input field
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
            // Set error message if the image upload fails
            setErrorMsg(error);
        });
    }).catch((error) => {
        // Set error message if the POST add document fails
        setErrorMsg(error);
    });
})

// Function returning the map from the parent org name to array of child sub-organisations 
function createParentChildrenArrayMap(options) {
    var map = new Map();
    options.map(option => {
        var parentkey = option.ObjectKey.int32Value;
        var children = options.filter(childOption => childOption.ParentKey.int32Value == parentkey);
        map.set(option.ObjectName, children);
    });
    return map;
}

// Function to recursively generate the entire organisation tree HTML structure with toggleable components to view and collapse the sub-organisations within each organisation
function fillOrganisationOptions(options, parentId, optionMap) {
    var dropdownMenuTag = $(`ul[data-parentId="${parentId}"]`);
    if (dropdownMenuTag.length > 0) {
        options.map(option => {
            // Create a sub-option if the option's ParentKey int32Value matches the current parentId passed as parameter
            if (option.ParentKey.int32Value == parentId) {
                var suboption = $("<li>");
                dropdownMenuTag.append(suboption);
                // Check if the current sub-option has children from the map
                var children = optionMap.get(option.ObjectName);
                if (children.length > 0) {
                    // The sub-option has children hence add the caret class to the suboption to create an arrow/pointer in front of the sub-option name
                    suboption.append(`<span class="caret orgOption">${option.ObjectName}</span>`);
                    // Add a new nested ul tag to the sub-option for adding its children
                    var newDropdownMenu = $("<ul>");
                    newDropdownMenu.attr("class", "nested");
                    // Set the data-parentId attribute of the ul tag as the sub-option's int32Value
                    newDropdownMenu.attr("data-parentId", option.ObjectKey.int32Value);
                    suboption.append(newDropdownMenu);
                    // Recursively fill the children as nested sub-options by calling the fillOrganisationOptions with the parentID initialised as the sub-option's int32Value
                    fillOrganisationOptions(options, option.ObjectKey.int32Value, optionMap);
                }
                else {
                    // Only add the sub-option name without arrow when there are no children
                    suboption.append(`<span class="orgOption">${option.ObjectName}</span>`);
                }
            }
        })
    }
}

// Function to set the failure message by parsing the error response object
function setErrorMsg(error) {
    $("#failureMsg").attr("style", "display: block");
    $("#failureMsg").text(`Create request failed with status ${error.status} (${error.statusText}). 
    Error msg: ${error.responseJSON.message}`);
}

// Clear the validation message when new file is selected
$("#file").on("click", function () {
    $(".validUpload").text("");
});

// Reset the form values and validation messages when create request button is toggled
$("#requestToggle").on("click", function (event) {
    $("#createRequest").get(0).reset();
    $("#updateRequest").get(0).reset();
    $("#failureMsg").attr("style", "display: none");
    $("#successOutcome").attr("style", "display: none");
    $(".validUpload").text("");
    resetOrgSelection();
});

// Function to add onClick listener to the carets/pointers and toggle the view of nested sub-organisations
function addListenerToCarets() {
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
            setSelectedBackground(selectedOrg);
        });
    }
}

// Function to highlight the selected organisation
function setSelectedBackground(selectedOrg) {
    var orgOptions = document.getElementsByClassName("orgOption");
    for (var i = 0; i < orgOptions.length; i++) {
        if (orgOptions[i].textContent == selectedOrg) {
            orgOptions[i].classList.add("selectedOption");
        }
        else {
            orgOptions[i].classList.remove("selectedOption");
        }
    }
}

// Reset the style of the organisations to hidden and nested view when new request creation button is clicked
function resetOrgSelection() {
    selectedOrg = "";
    setSelectedBackground("");
    var carets = document.getElementsByClassName("caret");
    for (var i = 0; i < carets.length; i++) {
        carets[i].parentElement.querySelector(".nested").classList.remove("active");
        carets[i].classList.remove("caret-down");
    }
}