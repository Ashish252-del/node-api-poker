'use strict';
module.exports = (sequelize, DataTypes) => {
  const shop = sequelize.define('shop', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    shopName: {
        type:DataTypes.STRING,
        allowNull:false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull : false,
      defaultValue:1
    },
    url: {
        type:DataTypes.STRING,
        allowNull:false,
    },
    added_by:DataTypes.STRING,
  }, {
    tableName: 'ludo_shop',  // Explicitly set the table name
    freezeTableName: true 
  });
  return shop;
};