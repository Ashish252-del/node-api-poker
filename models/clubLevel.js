const { DataTypes } = require('sequelize');

module.exports = model;
function model(sequelize) {
    const attributes = {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        diamond: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        manager: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        member: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0.00
        },
        validity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0.00
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE
        },
        updatedAt: {
            allowNull: false,
            type: DataTypes.DATE
        }
    };
    return sequelize.define('club_levels', attributes);
}
