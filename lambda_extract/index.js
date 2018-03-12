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

const scanPromise = (params) => {
    return new Promise((resolve, reject) => {
        ddb.scan(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};


exports.handler = function (event, context) {
    scanPromise({
        TableName: 'lambda_polling_bus_raw',
        // Limit: 1500,
        Limit: 3000,
        FilterExpression: "attribute_exists(message.#r)",
        ExpressionAttributeNames: {
            "#r": "result"
        },
    }).then((data) => {
        // console.log(data);
        const chain = [];
        data.Items.map(item => {
            const {updateDate, routeId, busLocationList} = item.message.result;
            const upperUpdateDate = updateDate;
            busLocationList.map(bus => {
                const {plateNo, remainSeat, stateCd, stationId, stationSeq, updateDate} = bus;
                // console.log(exploded);
                chain.push({
                    routeId,
                    plateNo,
                    upperUpdateDate,
                    remainSeat,
                    stateCd,
                    stationId,
                    stationSeq,
                    offset: upperUpdateDate - updateDate
                });
            });
        });
        const noc = chain.length;
        const filterd = chain.filter(ebus => {
            return ebus.plateNo === "경기77바1335" && ebus.upperUpdateDate > 20180310040000 && ebus.upperUpdateDate < 20180311040000;
        });

        const nof = filterd.length;
        filterd.sort((a, b) => a.upperUpdateDate - b.upperUpdateDate).map(ebus => {
            console.log(ebus);
        });
        context.done(nof + "/" + noc);
    }).catch(reason => {
        console.log(reason);
        context.fail('unable to fetch bus api at this time');
    });
};