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
        union_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        union_notice: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        image: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        union_unique_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        union_adminId: {
            type: DataTypes.INTEGER,
            allowNull: true,
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
    return sequelize.define('union', attributes);
}
