$(".headLine").on("click", function (event) {
    event.preventDefault();
    document.location = "index.html";
});

$(".submitButton").on("click", function (event) {
    event.preventDefault();
    $(".validDetail").text("");
    $(".validName").text("");
    if ($("#requestDetail").val() === "") {
        $(".validDetail").text("Please enter request details");
    }
    if ($("#requestorName").val() === "") {
        $(".validName").text("Please enter requestor name");
    }
    if ($("#requestorName").val() !== "" && $("#requestDetail").val() !== "") {
        var currentTimestamp = new Date().toISOString();
        var params = {
            "ChangeSet": {
                "Changes": ["RequestDetail", "RequestorName", "OrganisationUnitID"],
                "LastEdit": currentTimestamp,
                "Updated": {
                    "EntryDate": currentTimestamp,
                    "OrganisationUnitID": 1,
                    "RequestDetail": $("#requestDetail").val(),
                    "RequestorName": $("#requestorName").val()
                }
            }
        };
        $.ajax({
            type: "POST",
            url: "https://developer-demo.australiaeast.cloudapp.azure.com/api/requests/create_request",
            data: JSON.stringify(params),
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'Bearer EKJkxhob98MDAumDo+sNfBIc08Y=');
                xhr.setRequestHeader('Accept', 'application/json');
            }
        }).then(function (response) {
            console.log(response);
            $('#newRequestForm').collapse('toggle');
            $.ajax({
                type: "GET",
                url: `https://developer-demo.australiaeast.cloudapp.azure.com/api/requests/${response}`,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer EKJkxhob98MDAumDo+sNfBIc08Y=');
                    xhr.setRequestHeader('Accept', 'application/json');
                }
            }).then(function (response) {
                console.log(response);
                $("#successOutcome").attr("style", "display: block");
                $("#attachButton").attr("data-ArqID", response.ArqID);
                $("#staticName").val(response.Record.RequestorName);
                $("#staticDetails").val(response.Record.RequestDetail);
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
        url: `https://developer-demo.australiaeast.cloudapp.azure.com/api/documents/add_document`,
        data: JSON.stringify(addDocumentParams),
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer EKJkxhob98MDAumDo+sNfBIc08Y=');
            xhr.setRequestHeader('Accept', 'application/json');
        }
    }).then(function (response) {
        console.log(response);
        var fd = new FormData();
        var uploadFile = $('#file')[0].files[0];
        fd.append('document', uploadFile);

        $.ajax({
            type: `${response.UploadMethod}`,
            url: `https://developer-demo.australiaeast.cloudapp.azure.com${response.UploadUri}`,
            data: fd,
            contentType: false,
            processData: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'Bearer EKJkxhob98MDAumDo+sNfBIc08Y=');
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

function setErrorMsg(error) {
    $("#failureMsg").attr("style", "display: block");
    $("#failureMsg").text(`Create request failed with status ${error.status} (${error.statusText}). 
    Error msg: ${error.responseJSON.message}`);
}

$("#file").on("click", function() {
    $(".validUpload").text("");
})
$("#requestToggle").on("click", function (event) {
    $(".validDetail").text("");
    $(".validName").text("");
    $("#requestDetail").val("");
    $("#requestorName").val("");
    $("#failureMsg").text("");
    $("#failureMsg").attr("style", "display: none");
    $("#successOutcome").attr("style", "display: none");
    $(".validUpload").text("");
});

