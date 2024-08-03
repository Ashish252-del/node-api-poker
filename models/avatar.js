'use strict';
module.exports = (sequelize, DataTypes) => {
  const avatar = sequelize.define('avatar', {
    id: { 
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
  
    url: {
        type:DataTypes.STRING,
        allowNull:false,
    },
  }, {
    freezeTableName: true 
  });
  
  return avatar;
};