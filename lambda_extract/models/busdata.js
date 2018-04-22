'use strict';

module.exports = (sequelize, DataTypes) => {
    var BusData = sequelize.define('BusData', {
        documentId: {
            type: DataTypes.UUID,
            primaryKey: true,
        },
        collectedDate: DataTypes.DATE,
        plateNo: DataTypes.STRING,
        remainSeat: DataTypes.INTEGER,
        routeId: DataTypes.INTEGER,
        stateCd: DataTypes.INTEGER,
        stationId: DataTypes.INTEGER,
        stationSeq: DataTypes.INTEGER
    }, {});
    BusData.associate = function (models) {
        // associations can be defined here
        models['BusData'].belongsTo(models["Bus"], {foreignKey: "plateNo", targetKey: "plateNo"});
        models['BusData'].belongsTo(models["Schedule"]);
    };
    return BusData;
};