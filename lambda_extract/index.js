const fetch = require('node-fetch');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const DOC = require('dynamodb-doc');
const ddb = new DOC.DynamoDB();
const moment = require('moment');
const models = require('./models');

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

const queryPromise = (params) => {
    return new Promise((resolve, reject) => {
        ddb.query(params, (err, data) => {
            err ? reject(err) : resolve(data);
        })
    })
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

// const epoch = 1522019222000;
const epoch = 1522920222000;
const typeSizes = {
    "undefined": () => 0,
    "boolean": () => 4,
    "number": () => 8,
    "string": item => 2 * item.length,
    "object": item => Object
        .keys(item || {})
        .reduce((total, key) => sizeOf(key) + sizeOf(item[key]) + total, 0)
};

const sizeOf = value => typeSizes[typeof value](value);
exports.handler = function (event, context) {
    const params = {
        TableName: 'lambda_polling_bus_refined',
        IndexName: "plateNo-epochTime-index",
        KeyConditionExpression: "plateNo = :plateNo and epochTime between :epoch1 and :epoch2",
        ExpressionAttributeValues: {
            ":plateNo": "경기77바1238",
            ":epoch1": epoch,
            ":epoch2": epoch + (1000 * 60 * 60 * 2),
        },
        Limit: 2,
    };
    queryPromise(params).then(data => {
        return data.Items.map(item => {
            const epochTime = new Date(item.epochTime);
            const value = String(item.upperUpdateDate - item.offset);
            console.log(value);
            const collectedDate = moment(value, "YYYYMMDDHHmmss").utc().toDate();
            item.epochTime = epochTime;
            item.collectedDate = collectedDate;
            item.upperUpdateDate = moment(item.upperUpdateDate, "YYYYMMDDHHmmss").utc().toDate();
            return item;
        });
    }).then(items => {
        console.log(items);
        return;
        return models.sequelize.transaction(t => {
            return Promise.all(items.map(item => models.BusData.create(item, {transaction: t})));
        });
    });
};