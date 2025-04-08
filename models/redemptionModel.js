const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        redemption_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        account_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        bank_reference_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        transaction_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        payout_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        redeem_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0.00
        },
        tds_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: false,
            defaultValue: 0.00
        },
        redemption_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['Pending','Withdraw','Cancelled','Processing','Failed'],
            defaultValue: 'Pending'
        },
        transfer_type: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        bank_reason: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        game_category: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        utr_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        request_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        req_txnid: {
            type: DataTypes.STRING,
            allowNull: true,
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
    return sequelize.define('redemptions', attributes, { timestamps: true });
}
