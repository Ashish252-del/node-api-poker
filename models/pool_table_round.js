const {DataTypes} = require('sequelize');

module.exports = model;

function model(sequelize) {
   const attributes = {
      table_round_id: {
         type: DataTypes.INTEGER,
         autoIncrement: true,
         primaryKey: true,
      },
      game_table_id: {
         type: DataTypes.INTEGER,
         allowNull: false
      },
      table_attributes: {
         type: DataTypes.STRING,
         allowNull: true
      },
      result_json: {
         type: DataTypes.JSON,
         allowNull: true
      },
      hand_histories: {
         type: DataTypes.STRING,
         allowNull: true
      },
      table_round_status: {
         type: DataTypes.ENUM,
         allowNull: false,
         values: ['Active', 'Completed', 'Full'],
         defaultValue: 'Active'
      },
      createdAt: {
         type: DataTypes.DATE,
         allowNull: false,
         defaultValue: DataTypes.NOW
      },
      updatedAt: {
         type: DataTypes.DATE,
         allowNull: false,
         defaultValue: DataTypes.NOW
      }
   };

   return sequelize.define('table_round', attributes, {timestamps: true});
}
