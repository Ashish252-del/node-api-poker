const {DataTypes} = require('sequelize');

module.exports = model;

function model(sequelize) {
   const attributes = {
      id: {
         type: DataTypes.INTEGER,
         primaryKey: true,
         autoIncrement: true,
      },
      table_id: {
         type: DataTypes.INTEGER,
         allowNull: true,
      },
      poker_data_dump: {
         type: DataTypes.TEXT,
         allowNull: true
      }
   };
   return sequelize.define('poker_table_dump', attributes, {timestamps: true});
}
