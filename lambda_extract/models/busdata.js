'use strict';
module.exports = (sequelize, DataTypes) => {
    var BusData = sequelize.define('BusData', {
        documentId: DataTypes.STRING,
        epochTime: DataTypes.DATE,
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
    };
    return BusData;
};