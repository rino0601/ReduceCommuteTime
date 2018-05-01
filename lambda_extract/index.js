const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const DOC = require('dynamodb-doc');
const ddb = new DOC.DynamoDB();
const moment = require('moment-timezone');
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

const queryRecursive = (params, chain, count, scannedCount) => {
    return queryPromise(params).then((data) => {
        chain.push(...data.Items);
        const countUpTo = count + data.Count;
        const scannedCountUpTo = scannedCount + data.ScannedCount;
        if (typeof data.LastEvaluatedKey !== "undefined") {
            console.log("(" + countUpTo + "/" + scannedCountUpTo + ") Querying for more...");
            params.ExclusiveStartKey = data.LastEvaluatedKey;
            return queryRecursive(params, chain, countUpTo, scannedCountUpTo);
        }
        return chain;
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

const mainHandler = (event, context) => {
    const partition = "20180425";
    return dbSync.then((() => {
        return {
            TableName: 'lambda_polling_bus_refined',
            IndexName: "routeId-upperUpdateDate-index",
            KeyConditionExpression: "routeId = :routeId and upperUpdateDate between :from and :to",
            ExpressionAttributeValues: {
                ":routeId": 10596,
                ":from": partition + "030000",
                ":to": "20180426030000",
            },
        };
    })).then(params => queryRecursive(params, [], 0, 0)).then(items => {
        return items.map(item => {
            const value = String(item.upperUpdateDate - item.offset);
            item.reportedDate = moment.utc(value, "YYYYMMDDHHmmss").toDate();
            item.collectedDate = moment.utc(item.upperUpdateDate, "YYYYMMDDHHmmss").toDate();
            return item;
        });
    }).then(items => {
        return models.sequelize.transaction(t0 => {
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
                    transaction: t0,
                }).then(() => {
                    return models.BusData.findOrCreate({
                        where: {
                            documentId: item.documentId,
                        },
                        defaults: item,
                        transaction: t0,
                    });
                });
            }));
        });
    }).then(() => {
        return models.sequelize.transaction(t1 => {
            return models.Schedule.destroy({
                where: {
                    partition,
                }
            }).then(() => {
                return models.Bus.findAll({
                    include: [{
                        model: models.BusData,
                    }],
                    transaction: t1,
                }).then(buses => { // sequelize의 정렬 기능을 쓰는 법을 모르겠다 + 믿을 수 없다. 따라서 인메모리 소팅하기로,  따라서 buses 는 정렬 안된 group by 만 한 데이터.
                    return Promise.all(buses.map(bus => {
                        const groups = [];
                        bus.BusData.sort((a, b) => {
                            return a.upperUpdateDate - b.upperUpdateDate;
                        }).reduce((prev, curr) => {
                            if (prev > curr.stationSeq) {
                                groups.push([]);
                            }
                            groups[groups.length - 1].push(curr);
                            return curr.stationSeq;
                        }, Infinity);
                        return groups;
                    }).reduce((prev, curr) => {
                        prev.push(...curr);
                        return prev;
                    }, []).map((data) => {
                        return models.Schedule.create({
                            documentId: uuidv4(),
                            departAt: data[0].reportedDate,
                            partition: partition,
                        }, {
                            transaction: t1,
                        }).then(schedule => {
                            return Promise.all(data.map(busData => {
                                busData.updateAttributes({
                                    ScheduleDocumentId: schedule.documentId,
                                }, {
                                    transaction: t1,
                                })
                            }));
                        });
                    }));
                });
            });
        });
    }).then(() => {
        context.done(null, "Done any");
    }).catch(e => {
        console.log(e);
        context.done(e, "oops");
    });
};

exports.handler = mainHandler;
// exports.handler = (event, context) => {
//     dbSync.then((() => {
//         return {
//             TableName: 'lambda_polling_bus_refined',
//             IndexName: "routeId-upperUpdateDate-index",
//             KeyConditionExpression: "routeId = :routeId and upperUpdateDate between :from and :to",
//             ExpressionAttributeValues: {
//                 ":routeId": 10596,
//                 ":from": "20180425030000",
//                 ":to": "20180426030000",
//             },
//         };
//     })).then(params => queryRecursive(params, [], 0, 0)).then(items => {
//         console.log(items[0], items.length);
//     }).then(() => {
//         context.done(null, "Done any");
//     }).catch(e => {
//         console.log(e);
//         context.done(e, "oops");
//     });
// };