'use strict';
module.exports = (sequelize, DataTypes) => {
  const leaderboard = sequelize.define('leaderboard', {
    rank: {
      type: DataTypes.INTEGER,
    },
    type: {
      type: DataTypes.STRING
    },
    name: {
      type: DataTypes.STRING
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull:false,
      defaultValue:0
    },
    gamePlayed: {
      allowNull: false,
      type: DataTypes.INTEGER,
      defaultValue:0
    },
  },{
    tableName: 'ludo_leaderboard',  // Explicitly set the table name
    timestamps: false ,
    freezeTableName: true 
  });
  return leaderboard;
};