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
                xhr.setRequestHeader('Authorization', 'Bearer KJkxhob98MDAumDo+sNfBIc08Y=');
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

$("#attachButton").on("click", function(event) {
    event.preventDefault();
    var address = `file://conquest_documents/Request/${$("#attachButton").attr("data-ArqID")}/TestAddDocument.txt`;
    console.log(address);
    var addDocumentParams = {
        "Address": address,
        "ContentType": "text/plain",
        "CreateTime": new Date().toISOString(),
        "DocumentDescription": "Test document",
        "Hashes": null,
        "ObjectKey": {
            "int32Value": response.ArqID,
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

    }).catch((error) => {
        setErrorMsg(error);
    });
})

function setErrorMsg(error) {
    $("#failureMsg").attr("style", "display: block");
    $("#failureMsg").text(`Create request failed with status ${error.status} (${error.statusText}). 
    Error msg: ${error.responseJSON.message}`);
}

$("#requestToggle").on("click", function (event) {
    $(".validDetail").text("");
    $(".validName").text("");
    $("#requestDetail").val("");
    $("#requestorName").val("");
    $("#failureMsg").text("");
    $("#failureMsg").attr("style", "display: none");
    $("#successOutcome").attr("style", "display: none");
});

