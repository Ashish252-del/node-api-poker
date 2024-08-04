const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        game_table_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        game_category: {
            type: DataTypes.STRING,
            allowNull: true
        },
        players: {
            type: DataTypes.STRING,
            allowNull: true
        },
        game_type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        table_name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        table_id: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        game_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        bet_amount: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        percentage: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        winner: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        game_table_status:{
            type: DataTypes.ENUM,
            allowNull: false,
            values:['Pending', 'Active', 'Leave','Full','Completed'],
            defaultValue: 'Pending'
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

    return sequelize.define('game_tables', attributes,  { timestamps: true });
}
