"use strict";
module.exports = (sequelize, DataTypes) => {
  const shop_goods = sequelize.define(
    "shop_goods",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      goods_title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {        
       tableName: 'ludo_shop_goods',  // Explicitly set the table name
      freezeTableName: true,
    }
  );
  return shop_goods;
};
