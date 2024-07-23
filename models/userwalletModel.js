const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        user_wallet_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        real_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: true
        },
        practice_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: true
        },
        bonus_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: true
        },
        locked_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: true
        },
        win_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: true
        },
        coins:{
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        eligible_game: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        last_withdraw_date: {
            type: DataTypes.DATE,
            allowNull: true
        },
        last_claim_date: {
            type: DataTypes.DATE,
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

    return sequelize.define('user_wallets', attributes, { timestamps: true });
}
