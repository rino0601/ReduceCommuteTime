'use strict';
module.exports = (sequelize, DataTypes) => {
    var Bus = sequelize.define('Bus', {
        plateNo: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        documentId: DataTypes.UUID,
        description: DataTypes.STRING
    }, {});
    Bus.associate = function (models) {
        // associations can be defined here
    };
    return Bus;
};