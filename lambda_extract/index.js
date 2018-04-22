const fetch = require('node-fetch');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const DOC = require('dynamodb-doc');
const ddb = new DOC.DynamoDB();
const moment = require('moment-timezone');
const models = require('./models');

moment.tz.setDefault("Asia/Seoul");

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

const dbSync = models.sequelize.sync();


// const epoch = 1523620740000;
const epoch = 1523621000000;
/**
 * NOTE.
 * epoch를 GMT 로 변환해야 원래 기대했던 시간이 나온다.
 * 변환할 때, YYYYDDhhmmss 로 했었는데, 다행히 epoch에는 손실이 없었으나, 도로 복호(?) 할때는 YYYYDDHHmmss로 해야 한다.(GMT)
 */
exports.handler = function (event, context) {
    dbSync.then((() => {
        return {
            TableName: 'lambda_polling_bus_refined',
            IndexName: "routeId-epochTime-index",
            KeyConditionExpression: "routeId = :routeId and epochTime between :epoch1 and :epoch2",
            ExpressionAttributeValues: {
                ":routeId": 10596,
                ":epoch1": epoch,
                ":epoch2": epoch + (1000 * 60 * 3),
            },
        };
    })).then(params => queryPromise(params)).then(data => {
        return data.Items.map(item => {
            return item;
            const epochTime = moment(item.epochTime).toDate();
            const value = String(item.upperUpdateDate - item.offset);
            console.log(value);
            const collectedDate = moment(value, "YYYYMMDDHHmmss").toDate();
            item.epochTime = epochTime;
            item.collectedDate = collectedDate;
            item.upperUpdateDate = moment(item.upperUpdateDate, "YYYYMMDDHHmmss").toDate();
            return item;
        });
    }).then(items => {
        return models.sequelize.transaction(t => {
            return Promise.all(items.map(item => {
                const {plateNo} = item;
                return models.Bus.findOrCreate({
                    where: {
                        plateNo,
                    },
                    defaults: {
                        "plateNo": plateNo,
                        "documentId": uuidv4(),
                        "description": plateNo
                    },
                    transaction: t,
                }).then((model, created) => {
                    return models.BusData.create(item, {transaction: t});
                });
            }));
        });
    }).then(() => {
        context.done(null, "Done any");
    }).catch(e => {
        context.done(e, "oops");
    });
};