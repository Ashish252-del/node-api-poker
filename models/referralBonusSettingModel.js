const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        refer_bonus_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        welcome_bonus: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        referral_bonus: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        deposit_bonus: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        registration_bonus: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        influencer_commision: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        bet_bonus_amount: {
            type: DataTypes.INTEGER,
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
        }
    };
    return sequelize.define('referral_bonus_settings', attributes, { timestamps: true });
}
