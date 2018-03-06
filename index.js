const fetch = require('node-fetch');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const DOC = require('dynamodb-doc');
const ddb = new DOC.DynamoDB();
// AWS.config.update({region: 'ap-northeast-2'});
// Create the DynamoDB service object
// const ddb = new AWS.DynamoDB({apiVersion: '2012-10-08'});
// fetch("https://ssl.map.naver.com/api.pubtrans/2.2/live/getBusLocation.jsonp?caller=mobile_web&routeId=10596").then(function (value) {
//     return value.json();
//
// }).then(function (value) {
//     console.log(value);
//     context.done(null, value);
// }).catch(function (reason) {
//     console.log(reason);
//     context.fail('unable to update users at this time');
// });

exports.handler = function (event, context) {
    const uid = uuidv4();
    const res = {
        "message": {
            "result": {
                "routeId": 10596,
                "metroList": [
                    {
                        "cityCode": 1100,
                        "status": "1",
                        "source": "경기도 버스종합상황실",
                        "sourceCode": 2,
                        "sourceUrl": "http://m.gbis.go.kr/"
                    }
                ],
                "updateDate": "20180306003917",
                "busLocationList": [
                    {
                        "lowPlate": 0,
                        "plateNo": "경기77바1335",
                        "stateCd": 3,
                        "stationId": "122978",
                        "stationSeq": 70,
                        "localStationSeq": 70,
                        "stationIdx": 1,
                        "remainSeat": 43,
                        "waitTurnPlace": "N",
                        "vehicleType": null,
                        "gpsX": null,
                        "gpsY": null,
                        "driveEnd": "R",
                        "updateDate": "20180306003908"
                    }
                ]
            }
        }
    };
    const params = {
        TableName: 'lambda_polling_bus_raw',
        Item: {
            "documentId": uid,
            "message": res.message,
        }
    };

    ddb.putItem(params, (err, data) => {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data.Item);
        }
    })

    // const params = {
    //     TableName: 'raw_english_text',
    //     Key: {
    //         "documentId": {
    //             "S": "9f309e27-9164-11e7-9dc3-5d8cbd5dae1b"
    //         },
    //         "userId": {
    //             "S": "a1b4257e2fa4a5f7543b79bdd7b3fa82ce8cc52c3d12fd2c8f17b58c0f5e1"
    //         },
    //     },
    // };
    //
    // // Call DynamoDB to read the item from the table
    // ddb.getItem(params, function(err, data) {
    //     if (err) {
    //         console.log("Error", err);
    //     } else {
    //         console.log("Success", data.Item);
    //     }
    // });
};