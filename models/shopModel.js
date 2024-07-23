const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        sub_category: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        from_purchase: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        purchase_value: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        get_purchase: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        get_value: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_offer: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM,
            allowNull: false,
            values: ['0','1','2'],
            defaultValue: '1'
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
        },
    };
    return sequelize.define('shops', attributes, { timestamps: true });
}
