'use strict';
module.exports = (sequelize, DataTypes) => {
    var Schedule = sequelize.define('Schedule', {
        documentId: {
            type: DataTypes.UUID,
            primaryKey: true,
        },
        departAt: DataTypes.DATE
    }, {});
    Schedule.associate = function (models) {
        // associations can be defined here
    };
    return Schedule;
};