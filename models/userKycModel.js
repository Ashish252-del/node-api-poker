const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        user_kyc_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        pan_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        adhaar_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_pan_card_verify: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1'],
            defaultValue: '0'
        },
        is_adhaar_verify: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1'],
            defaultValue: '0'
        },
        transaction_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        user_kyc_status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['Pending','Approved','Rejected'],
            defaultValue: 'Pending'
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

    return sequelize.define('user_kycs', attributes, { timestamps: true });
}
