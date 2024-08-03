const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        prize_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        prize_structure_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        prize_structure_json_data: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
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
        },
    };
    return sequelize.define('prize_structure', attributes, { 
        tableName: 'ludo_prize_structure',  // Explicitly set the table name
        timestamps: true });
}