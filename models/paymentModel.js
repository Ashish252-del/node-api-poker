const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        transaction_id: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        payment_status: {
            type: DataTypes.STRING,
            allowNull: true
        },
        amount: {
            type: DataTypes.STRING,
            allowNull: true
        },
        amount_type: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        payment_id: {
            type: DataTypes.STRING,
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
    return sequelize.define('payments', attributes, { timestamps: true });
}
