const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        user_account_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        beneficiary_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bank_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        account_holder_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ifsc_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        account_no: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        upi_no: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bank_address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        user_bank_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2'],
            defaultValue: '1',
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
    return sequelize.define('user_bank_accounts', attributes, { timestamps: true });
}
