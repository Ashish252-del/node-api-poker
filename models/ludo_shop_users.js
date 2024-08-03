"use strict";
module.exports = (sequelize, DataTypes) => {
  const shop_users = sequelize.define(
    "shop_users",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      goods_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      category: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      is_Selected: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue:0
      },
    },
    {   
      tableName: 'ludo_shop_users',  // Explicitly set the table name
      freezeTableName: true,
    }
  );
  return shop_users;
};