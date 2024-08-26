const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        tournamentId : {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tableId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        winnerId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status:{
            type:DataTypes.INTEGER,
            allowNull:false,
            defaultValue:0
        }
    };

    return sequelize.define('tournament_tables', attributes,  { timestamps: true });
}
