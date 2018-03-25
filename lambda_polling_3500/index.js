const fetch = require('node-fetch');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const DOC = require('dynamodb-doc');
const ddb = new DOC.DynamoDB();
const moment = require('moment');

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
    fetch(apiUrl).then(value => value.json()).then((data) => {
        const message = data.message;
        if (!message.result) {
            context.done("no result. skip it.");
            return;
        }
        const {updateDate, routeId, busLocationList} = message.result;
        const upperUpdateDate = updateDate;
        const epochTime = moment(upperUpdateDate, "YYYYMMDDhhmmss").valueOf();  // 1522019222000 이후 부터 쌓이기 시작
        const dataList = busLocationList.map(bus => {
            const {plateNo, remainSeat, stateCd, stationId, stationSeq, updateDate} = bus;
            return {
                documentId: uuidv4(),
                epochTime,
                routeId,
                plateNo,
                upperUpdateDate,
                remainSeat,
                stateCd,
                stationId,
                stationSeq,
                offset: upperUpdateDate - updateDate
            };
        });
        return Promise.all(dataList.map(data => putItemPromise({
            TableName: "lambda_polling_bus_refined",
            Item: data,
        }))).then(values => {
            context.done("Done. new bus recodes ("+values.length+") are added.");
            return undefined;
        });
    }).catch(reason => {
        console.log(reason);
        context.fail('unable to fetch bus api at this time');
    });
};