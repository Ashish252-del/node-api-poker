const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        tds_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id : {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        tds_amount: {
            type: DataTypes.DECIMAL,
            allowNull: true,
        },
        tds_file: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        financial_date: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        tds_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2'],
            defaultValue: '0',
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
    return sequelize.define('tds', attributes, { timestamps: true });
}
