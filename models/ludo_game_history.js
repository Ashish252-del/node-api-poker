'use strict';
module.exports = (sequelize, DataTypes) => {
  const game_history = sequelize.define('game_history', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    gameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tableId: {
      type: DataTypes.STRING
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    }, betAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    winAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    isWin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    fee: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 0
    },
    commission: {
      type: DataTypes.DECIMAL(15,2),
      allowNull: false,
      defaultValue: 0
    },
    Score: {
      type:DataTypes.STRING,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'ludo_game_history',  // Explicitly set the table name
    freezeTableName: true,
    timestamp: true
  });
 
  return game_history;
};
