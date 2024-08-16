const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        unicode_text: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        emojis: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        added_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
    };
    return sequelize.define('emojis', attributes, { timestamps: true });
}
