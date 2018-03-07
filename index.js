const fetch = require('node-fetch');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const DOC = require('dynamodb-doc');
const ddb = new DOC.DynamoDB();

const putItemPromise = (params) => {
    return new Promise((resolve, reject) => {
        ddb.putItem(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};


exports.handler = function (event, context) {
    const apiUrl = "https://ssl.map.naver.com/api.pubtrans/2.2/live/getBusLocation.jsonp?caller=mobile_web&routeId=10596";
    fetch(apiUrl).then(value => value.json()).then(res => {
        return putItemPromise({
            TableName: 'lambda_polling_bus_raw',
            Item: {
                "documentId": uuidv4(),
                "message": res.message,
            }
        });
    }).then(data => {
        console.log("Success", data);
        context.done(null, data);
    }).catch(reason => {
        console.log(reason);
        context.fail('unable to fetch bus api at this time');
    });
};