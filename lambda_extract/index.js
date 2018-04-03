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

const fullScanReculsive = (params, chain, count, scannedCount) => {
    return scanPromise(params).then((data) => {
        data.Items.map(item => {
            const {updateDate, routeId, busLocationList} = item.message.result;
            const upperUpdateDate = updateDate;
            const epochTime = moment(upperUpdateDate, "YYYYMMDDhhmmss").valueOf();
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
            chain.push(...dataList);
        });

        const countUpTo = count + data.Count;
        const scannedCountUpTo = scannedCount + data.ScannedCount;
        if (typeof data.LastEvaluatedKey !== "undefined") {
            console.log("(" + countUpTo + "/" + scannedCountUpTo + ")Scanning for more...");
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            return fullScanReculsive(params, chain, countUpTo, scannedCountUpTo);
        }
        return [countUpTo, scannedCountUpTo];
    })
};

const putItRecursive = (array, index) => {
    if (index >= array.length) {
        console.log("Done.");
        return undefined;
    }
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 1000);
    }).then(() => {
        return Promise.all(array[index].map(data => putItemPromise({
            TableName: "lambda_polling_bus_refined",
            Item: data,
        })));
    }).then(((values) => {
        console.log("New bus recodes (" + values.length + ") are added.");
        return putItRecursive(array, index + 1);
    }));
};

exports.handler = function (event, context) {
    const params = {
        TableName: 'lambda_polling_bus_raw',
        FilterExpression: "attribute_exists(message.#r)",
        ExpressionAttributeNames: {
            "#r": "result"
        },
    };
    const chain = [];
    fullScanReculsive(params, chain, 0, 0).then(counts => {
        const noc = chain.length;
        const filtered = chain.filter(ebus => {
            return ebus.epochTime < 1522019222000;
        });
        const nof = filtered.length;
        console.log(nof + "/" + noc + " - " + counts[0] + "/" + counts[1]);
        return filtered;
    }).then(filtered => {
        const range = n => [...Array(n).keys()];
        const mod = Math.floor(filtered.length / 100);
        const ticks = range(mod).map(n => []);
        for (let i = 0; i < filtered.length; i++) {
            ticks[i % mod].push(filtered[i]);
        }
        return putItRecursive(ticks, 0);
    }).then(() => {
        context.done(null, "Finally.");
    }).catch(reason => {
        console.log(reason);
        context.fail('unable to fetch bus api at this time');
    });
};