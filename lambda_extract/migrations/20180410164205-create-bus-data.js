'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('BusData', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      documentId: {
        type: Sequelize.STRING
      },
      epochTime: {
        type: Sequelize.DATE
      },
      collectedDate: {
        type: Sequelize.DATE
      },
      plateNo: {
        type: Sequelize.STRING
      },
      remainSeat: {
        type: Sequelize.INTEGER
      },
      routeId: {
        type: Sequelize.INTEGER
      },
      stateCd: {
        type: Sequelize.INTEGER
      },
      stationId: {
        type: Sequelize.INTEGER
      },
      stationSeq: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('BusData');
  }
};