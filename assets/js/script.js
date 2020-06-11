$(".headLine").on("click", function (event) {
    event.preventDefault();
    document.location = "index.html";
});

$(".submitButton").on("click", function (event) {
    event.preventDefault();
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
        $.ajax({
            type: "GET",
            url: `https://developer-demo.australiaeast.cloudapp.azure.com/api/requests/${response}`,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', 'Bearer EKJkxhob98MDAumDo+sNfBIc08Y=');
                xhr.setRequestHeader('Accept', 'application/json');
            }
        }).then(function (response) {
            console.log(response);
        }).catch((error) => console.log(error));
    }).catch((error) => console.log(error));
})