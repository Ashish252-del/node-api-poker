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
        redeem_amount: {
            type: DataTypes.DECIMAL(15,2),
            allowNull: true,
        },
        redemption_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['Pending','Withdraw','Cancelled'],
            defaultValue: 'Pending'
        },
        game_category: {
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
